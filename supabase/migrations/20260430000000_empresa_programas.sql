-- supabase/migrations/20260430000000_empresa_programas.sql

-- ============================================================
-- 1. Flag usar_ultimo_dia_habil en catálogo
-- ============================================================
ALTER TABLE public.obligaciones_catalogo
  ADD COLUMN IF NOT EXISTS usar_ultimo_dia_habil boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.obligaciones_catalogo.usar_ultimo_dia_habil IS
  'Si true, ignora dia_vencimiento y calcula el último día hábil (lun-vie) del mes de vencimiento';

-- ============================================================
-- 2. Correcciones al catálogo: IMMEX y PROSEC
-- ============================================================
UPDATE public.obligaciones_catalogo
SET
  frecuencia_tipo       = 'ANUAL',
  mes_vencimiento       = 5,
  dia_vencimiento       = NULL,
  usar_ultimo_dia_habil = true,
  presentacion          = 'anual',
  notas_internas        = 'Período: 1 abr – último día hábil mayo (VUCEM/RAOCE). Con IMMEX+PROSEC cumplir antes del 30 abr. Suspensión si no se presenta en mayo; cancelación definitiva antes del último día hábil de agosto.'
WHERE programa = 'immex'
  AND nombre   = 'Renovación Anual Programa IMMEX';

UPDATE public.obligaciones_catalogo
SET
  frecuencia_tipo       = 'ANUAL',
  mes_vencimiento       = 4,
  dia_vencimiento       = NULL,
  usar_ultimo_dia_habil = true,
  presentacion          = 'anual',
  notas_internas        = 'Fecha límite: último día hábil de abril (VUCEM/RAOCE). Suspensión automática el 1 de mayo. Cancelación definitiva el 1 de julio si no se subsana.'
WHERE programa = 'prosec'
  AND nombre   = 'Renovación Anual Programa PROSEC';

-- ============================================================
-- 3. Eliminación OEA
-- ============================================================
DELETE FROM public.obligaciones
WHERE catalogo_id IN (SELECT id FROM public.obligaciones_catalogo WHERE programa = 'oea')
  AND NOT EXISTS (
    SELECT 1 FROM public.obligacion_cumplimientos oc
    WHERE oc.obligacion_id = public.obligaciones.id
  );

DELETE FROM public.obligaciones_catalogo WHERE programa = 'oea';

-- ============================================================
-- 4. Tabla empresa_programas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.empresa_programas (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   uuid        NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  programa     text        NOT NULL
    CHECK (programa IN ('immex', 'prosec', 'padron', 'cert_iva_ieps', 'general')),
  activo       boolean     NOT NULL DEFAULT true,
  fecha_inicio date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, programa)
);

COMMENT ON TABLE  public.empresa_programas IS 'Fuente de verdad de qué programas tiene activos cada empresa.';
COMMENT ON COLUMN public.empresa_programas.fecha_inicio IS 'Fecha de autorización del programa (informativa).';

CREATE INDEX IF NOT EXISTS idx_empresa_programas_empresa
  ON public.empresa_programas (empresa_id, activo);

-- ============================================================
-- 5. RLS para empresa_programas
-- ============================================================
ALTER TABLE public.empresa_programas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados ven empresa_programas"
  ON public.empresa_programas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins y consultores gestionan empresa_programas"
  ON public.empresa_programas FOR ALL
  TO authenticated
  USING  (public.has_role(auth.uid(), 'administrador'::app_role)
       OR public.has_role(auth.uid(), 'consultor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'::app_role)
           OR public.has_role(auth.uid(), 'consultor'::app_role));

-- ============================================================
-- 6. Función: calcular último día hábil del mes
-- ============================================================
CREATE OR REPLACE FUNCTION public.ultimo_dia_habil(p_year int, p_mes int)
RETURNS date
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_fecha date;
BEGIN
  v_fecha := (make_date(p_year, p_mes, 1) + INTERVAL '1 month - 1 day')::date;
  WHILE EXTRACT(ISODOW FROM v_fecha) IN (6, 7) LOOP
    v_fecha := v_fecha - 1;
  END LOOP;
  RETURN v_fecha;
END;
$$;

-- ============================================================
-- 7. Función: generar obligaciones de un catálogo para una empresa y año
-- ============================================================
CREATE OR REPLACE FUNCTION public.generar_obligaciones_empresa_programa(
  p_empresa_id uuid,
  p_programa   text,
  p_year       int DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year    int := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::int);
  v_cat     public.obligaciones_catalogo%ROWTYPE;
  v_empresa public.empresas%ROWTYPE;
  v_fecha   date;
  v_step    int;
  v_count   int;
  v_dia     int;
  v_mes     int;
  v_last_day int;
  v_new_id  uuid;
  v_total   int := 0;
  v_jan1    date;
  v_dow     int;
  v_offset  int;
BEGIN
  SELECT * INTO v_empresa FROM public.empresas WHERE id = p_empresa_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR v_cat IN
    SELECT * FROM public.obligaciones_catalogo
    WHERE programa = p_programa
      AND activo   = true
      AND frecuencia_tipo IS NOT NULL
      AND frecuencia_tipo <> 'EVENTUAL'
  LOOP
    CASE v_cat.frecuencia_tipo
      WHEN 'MENSUAL'    THEN v_step := 1;  v_count := 12;
      WHEN 'BIMESTRAL'  THEN v_step := 2;  v_count := 6;
      WHEN 'TRIMESTRAL' THEN v_step := 3;  v_count := 4;
      WHEN 'SEMESTRAL'  THEN v_step := 6;  v_count := 2;
      WHEN 'ANUAL'      THEN v_step := 12; v_count := 1;
      ELSE v_step := 0; v_count := 0;
    END CASE;

    IF v_cat.frecuencia_tipo = 'SEMANAL' THEN
      v_dia    := COALESCE(v_cat.dia_vencimiento, 5);
      v_jan1   := make_date(v_year, 1, 1);
      v_dow    := EXTRACT(ISODOW FROM v_jan1)::int;
      v_offset := (v_dia - v_dow + 7) % 7;
      v_fecha  := v_jan1 + v_offset;
      WHILE EXTRACT(YEAR FROM v_fecha)::int = v_year LOOP
        INSERT INTO public.obligaciones (
          empresa_id, catalogo_id, categoria, nombre, descripcion,
          articulos, presentacion, fecha_vencimiento, estado, activa
        ) VALUES (
          p_empresa_id, v_cat.id, v_cat.categoria, v_cat.nombre, v_cat.descripcion,
          v_cat.articulos, v_cat.presentacion, v_fecha, 'vigente', true
        )
        ON CONFLICT (empresa_id, catalogo_id, EXTRACT(YEAR FROM fecha_vencimiento), EXTRACT(MONTH FROM fecha_vencimiento))
        WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL
        DO NOTHING
        RETURNING id INTO v_new_id;
        IF v_new_id IS NOT NULL THEN v_total := v_total + 1; END IF;
        v_fecha := v_fecha + 7;
      END LOOP;

    ELSIF v_cat.frecuencia_tipo = 'ULTIMO_DIA_MES' THEN
      FOR v_mes IN 1..12 LOOP
        v_fecha := (make_date(v_year, v_mes, 1) + INTERVAL '1 month - 1 day')::date;
        INSERT INTO public.obligaciones (
          empresa_id, catalogo_id, categoria, nombre, descripcion,
          articulos, presentacion, fecha_vencimiento, estado, activa
        ) VALUES (
          p_empresa_id, v_cat.id, v_cat.categoria, v_cat.nombre, v_cat.descripcion,
          v_cat.articulos, v_cat.presentacion, v_fecha, 'vigente', true
        )
        ON CONFLICT (empresa_id, catalogo_id, EXTRACT(YEAR FROM fecha_vencimiento), EXTRACT(MONTH FROM fecha_vencimiento))
        WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL
        DO NOTHING
        RETURNING id INTO v_new_id;
        IF v_new_id IS NOT NULL THEN v_total := v_total + 1; END IF;
      END LOOP;

    ELSE
      FOR v_i IN 0..(v_count - 1) LOOP
        IF v_cat.frecuencia_tipo = 'ANUAL' THEN
          v_mes := COALESCE(v_cat.mes_vencimiento, 1);
        ELSE
          v_mes := ((v_i * v_step) % 12) + 1;
        END IF;

        IF v_cat.usar_ultimo_dia_habil THEN
          v_fecha := public.ultimo_dia_habil(v_year, v_mes);
        ELSE
          v_dia      := COALESCE(v_cat.dia_vencimiento, 1);
          v_last_day := EXTRACT(DAY FROM (make_date(v_year, v_mes, 1) + INTERVAL '1 month - 1 day'))::int;
          v_fecha    := make_date(v_year, v_mes, LEAST(v_dia, v_last_day));
        END IF;

        INSERT INTO public.obligaciones (
          empresa_id, catalogo_id, categoria, nombre, descripcion,
          articulos, presentacion, fecha_vencimiento, estado, activa
        ) VALUES (
          p_empresa_id, v_cat.id, v_cat.categoria, v_cat.nombre, v_cat.descripcion,
          v_cat.articulos, v_cat.presentacion, v_fecha, 'vigente', true
        )
        ON CONFLICT (empresa_id, catalogo_id, EXTRACT(YEAR FROM fecha_vencimiento), EXTRACT(MONTH FROM fecha_vencimiento))
        WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL
        DO NOTHING
        RETURNING id INTO v_new_id;
        IF v_new_id IS NOT NULL THEN v_total := v_total + 1; END IF;
      END LOOP;
    END IF;

  END LOOP;

  RETURN v_total;
END;
$$;

-- ============================================================
-- 8. Función: generar obligaciones para TODOS los programas activos (cron)
-- ============================================================
CREATE OR REPLACE FUNCTION public.generar_obligaciones_todos_programas_activos(p_year int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r       RECORD;
  v_total int := 0;
BEGIN
  FOR r IN
    SELECT empresa_id, programa
    FROM public.empresa_programas
    WHERE activo = true
  LOOP
    v_total := v_total + public.generar_obligaciones_empresa_programa(r.empresa_id, r.programa, p_year);
  END LOOP;
  RETURN v_total;
END;
$$;

-- ============================================================
-- 9. Trigger: al activar un programa, generar obligaciones automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_empresa_programa_activado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.activo = true)
  OR (TG_OP = 'UPDATE' AND OLD.activo = false AND NEW.activo = true) THEN
    PERFORM public.generar_obligaciones_empresa_programa(NEW.empresa_id, NEW.programa, v_year);
    IF EXTRACT(MONTH FROM CURRENT_DATE) = 12 THEN
      PERFORM public.generar_obligaciones_empresa_programa(NEW.empresa_id, NEW.programa, v_year + 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresa_programa_activado ON public.empresa_programas;
CREATE TRIGGER trg_empresa_programa_activado
  AFTER INSERT OR UPDATE OF activo ON public.empresa_programas
  FOR EACH ROW EXECUTE FUNCTION public.trg_empresa_programa_activado();

-- ============================================================
-- 10. Cron anual: 1 de enero a las 06:00 UTC
-- ============================================================
DO $$ BEGIN
  PERFORM cron.schedule(
    'generar-obligaciones-anual',
    '0 6 1 1 *',
    $$SELECT public.generar_obligaciones_todos_programas_activos(EXTRACT(YEAR FROM NOW())::int)$$
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- 11. Backfill: migrar programas existentes de empresas a empresa_programas
-- ============================================================
INSERT INTO public.empresa_programas (empresa_id, programa, activo, fecha_inicio)
SELECT id, 'immex', true, immex_fecha_autorizacion
FROM public.empresas
WHERE immex_fecha_autorizacion IS NOT NULL
   OR EXISTS (
     SELECT 1 FROM public.obligaciones o
     JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
     WHERE o.empresa_id = empresas.id AND c.programa = 'immex' AND o.activa = true
   )
ON CONFLICT (empresa_id, programa) DO NOTHING;

INSERT INTO public.empresa_programas (empresa_id, programa, activo, fecha_inicio)
SELECT id, 'prosec', true, prosec_fecha_autorizacion
FROM public.empresas
WHERE prosec_fecha_autorizacion IS NOT NULL
   OR EXISTS (
     SELECT 1 FROM public.obligaciones o
     JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
     WHERE o.empresa_id = empresas.id AND c.programa = 'prosec' AND o.activa = true
   )
ON CONFLICT (empresa_id, programa) DO NOTHING;

INSERT INTO public.empresa_programas (empresa_id, programa, activo, fecha_inicio)
SELECT id, 'cert_iva_ieps', true, cert_iva_ieps_fecha_autorizacion
FROM public.empresas
WHERE cert_iva_ieps_fecha_autorizacion IS NOT NULL
   OR EXISTS (
     SELECT 1 FROM public.obligaciones o
     JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
     WHERE o.empresa_id = empresas.id AND c.programa = 'cert_iva_ieps' AND o.activa = true
   )
ON CONFLICT (empresa_id, programa) DO NOTHING;

INSERT INTO public.empresa_programas (empresa_id, programa, activo, fecha_inicio)
SELECT DISTINCT o.empresa_id, 'padron', true, NULL
FROM public.obligaciones o
JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
WHERE c.programa = 'padron' AND o.activa = true
ON CONFLICT (empresa_id, programa) DO NOTHING;

INSERT INTO public.empresa_programas (empresa_id, programa, activo, fecha_inicio)
SELECT DISTINCT o.empresa_id, 'general', true, NULL
FROM public.obligaciones o
JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
WHERE c.programa = 'general' AND o.activa = true
ON CONFLICT (empresa_id, programa) DO NOTHING;

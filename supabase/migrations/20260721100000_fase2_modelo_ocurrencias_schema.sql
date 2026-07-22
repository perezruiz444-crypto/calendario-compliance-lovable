-- =============================================================================
-- FASE 2 (1/2) — SCHEMA del modelo de 4 niveles
-- =============================================================================
-- Separa el dominio en: catalogo (plantilla versionada) -> obligacion (semilla
-- por empresa) -> obligacion_ocurrencias (período concreto, NUEVA) ->
-- obligacion_cumplimientos (evidencia append-only auditable).
--
-- Este archivo SOLO crea estructura y funciones. El backfill de datos vive en
-- 20260721100001_fase2_backfill.sql y debe correrse DESPUÉS.
--
-- Validado con dry-run contra datos reales (110 semillas, 311 ocurrencias,
-- 12 cumplimientos preservados). Ver plan Fase 2.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. obligaciones_catalogo — versionado normativo + CHECK de frecuencias cerrado
-- -----------------------------------------------------------------------------
ALTER TABLE public.obligaciones_catalogo
  ADD COLUMN IF NOT EXISTS version       integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vigente_desde date    NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS vigente_hasta date;

-- Cerrar el CHECK para incluir SEMANAL y ULTIMO_DIA_MES (el generador vivo ya
-- los usa; el CHECK viejo los rechazaba — inconsistencia latente).
ALTER TABLE public.obligaciones_catalogo
  DROP CONSTRAINT IF EXISTS obligaciones_catalogo_frecuencia_tipo_check;
ALTER TABLE public.obligaciones_catalogo
  ADD CONSTRAINT obligaciones_catalogo_frecuencia_tipo_check
  CHECK (frecuencia_tipo IS NULL OR frecuencia_tipo IN (
    'SEMANAL','MENSUAL','BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL',
    'EVENTUAL','ULTIMO_DIA_MES'
  ));


-- -----------------------------------------------------------------------------
-- 2. Función espejo del frontend: periodo_key por frecuencia_tipo
--    Reproduce EXACTAMENTE getPeriodKeyForDate() de src/lib/obligaciones.ts.
--    Formatos: 2026-W03 | 2026-03 | 2026-B2 | 2026-T2 | 2026-S1 | 2026
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_periodo_key(p_fecha date, p_frecuencia text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $$
  SELECT CASE p_frecuencia
    WHEN 'SEMANAL'        THEN to_char(p_fecha,'IYYY') || '-W' || lpad(to_char(p_fecha,'IW'),2,'0')
    WHEN 'MENSUAL'        THEN to_char(p_fecha,'YYYY-MM')
    WHEN 'ULTIMO_DIA_MES' THEN to_char(p_fecha,'YYYY-MM')
    WHEN 'BIMESTRAL'      THEN to_char(p_fecha,'YYYY') || '-B' || ceil(extract(month from p_fecha)/2.0)::int
    WHEN 'TRIMESTRAL'     THEN to_char(p_fecha,'YYYY') || '-T' || ceil(extract(month from p_fecha)/3.0)::int
    WHEN 'SEMESTRAL'      THEN to_char(p_fecha,'YYYY') || '-S' || CASE WHEN extract(month from p_fecha) < 7 THEN 1 ELSE 2 END
    WHEN 'ANUAL'          THEN to_char(p_fecha,'YYYY')
    WHEN 'EVENTUAL'       THEN to_char(p_fecha,'YYYY')
    ELSE to_char(p_fecha,'YYYY-MM')  -- default = mensual (igual que el frontend)
  END;
$$;


-- -----------------------------------------------------------------------------
-- 3. obligacion_ocurrencias — el período concreto (NUEVA)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.obligacion_ocurrencias (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligacion_id      uuid NOT NULL REFERENCES public.obligaciones(id) ON DELETE CASCADE,
  empresa_id         uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  periodo_key        text NOT NULL,
  fecha_vencimiento  date NOT NULL,
  articulos_snapshot text,
  catalogo_version   integer,
  estado             text NOT NULL DEFAULT 'pendiente'
                       CHECK (estado IN ('pendiente','cumplida','vencida','no_aplica')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (obligacion_id, periodo_key)
);

CREATE INDEX IF NOT EXISTS idx_ocurrencias_empresa_fecha
  ON public.obligacion_ocurrencias (empresa_id, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_ocurrencias_obligacion_estado
  ON public.obligacion_ocurrencias (obligacion_id, estado);

DROP TRIGGER IF EXISTS trg_ocurrencias_updated_at ON public.obligacion_ocurrencias;
CREATE TRIGGER trg_ocurrencias_updated_at
  BEFORE UPDATE ON public.obligacion_ocurrencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- -----------------------------------------------------------------------------
-- 4. obligacion_cumplimientos — append-only + auditable
--    ocurrencia_id NULLABLE: NULL = ligado directo a obligación (manuales/
--    eventuales sin período); NOT NULL = ligado a ocurrencia (recurrentes).
--    Se CONSERVA obligacion_id (no se reemplaza).
-- -----------------------------------------------------------------------------
ALTER TABLE public.obligacion_cumplimientos
  ADD COLUMN IF NOT EXISTS ocurrencia_id  uuid REFERENCES public.obligacion_ocurrencias(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reemplazado_por uuid REFERENCES public.obligacion_cumplimientos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vigente        boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_cumplimientos_ocurrencia
  ON public.obligacion_cumplimientos (ocurrencia_id) WHERE ocurrencia_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_cumplimientos_updated_at ON public.obligacion_cumplimientos;
CREATE TRIGGER trg_cumplimientos_updated_at
  BEFORE UPDATE ON public.obligacion_cumplimientos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- -----------------------------------------------------------------------------
-- 5. tareas — ligar a ocurrencia (nullable; NULL = tarea suelta, comportamiento
--    actual preservado). Cierra la cadena obligación->tarea->evidencia.
-- -----------------------------------------------------------------------------
ALTER TABLE public.tareas
  ADD COLUMN IF NOT EXISTS ocurrencia_id uuid REFERENCES public.obligacion_ocurrencias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tareas_ocurrencia
  ON public.tareas (ocurrencia_id) WHERE ocurrencia_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 6. Auditoría del dominio — enganchar log_audit_event() (ya existe)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_obligaciones ON public.obligaciones;
CREATE TRIGGER audit_obligaciones
  AFTER INSERT OR UPDATE OR DELETE ON public.obligaciones
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_obligacion_ocurrencias ON public.obligacion_ocurrencias;
CREATE TRIGGER audit_obligacion_ocurrencias
  AFTER INSERT OR UPDATE OR DELETE ON public.obligacion_ocurrencias
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_obligacion_cumplimientos ON public.obligacion_cumplimientos;
CREATE TRIGGER audit_obligacion_cumplimientos
  AFTER INSERT OR UPDATE OR DELETE ON public.obligacion_cumplimientos
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_obligaciones_catalogo ON public.obligaciones_catalogo;
CREATE TRIGGER audit_obligaciones_catalogo
  AFTER INSERT OR UPDATE OR DELETE ON public.obligaciones_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();


-- -----------------------------------------------------------------------------
-- 7. RLS append-only en obligacion_cumplimientos
--    Bloquear DELETE y UPDATE directo. Correcciones via función controlada.
-- -----------------------------------------------------------------------------
-- Eliminar TODAS las policies viejas (una de ellas permitía DELETE a clientes:
-- "Clientes can delete cumplimientos for their empresa" — rompía append-only).
DROP POLICY IF EXISTS "Admins and consultores can manage cumplimientos" ON public.obligacion_cumplimientos;
DROP POLICY IF EXISTS "Clientes can delete cumplimientos for their empresa" ON public.obligacion_cumplimientos;
DROP POLICY IF EXISTS "Clientes can insert cumplimientos for their empresa" ON public.obligacion_cumplimientos;
DROP POLICY IF EXISTS "obligacion_cumplimientos_select_scoped" ON public.obligacion_cumplimientos;

-- SELECT: pertenencia por empresa (patrón del proyecto)
DROP POLICY IF EXISTS "cumplimientos_select" ON public.obligacion_cumplimientos;
CREATE POLICY "cumplimientos_select" ON public.obligacion_cumplimientos
  FOR SELECT USING (
    public.has_role(auth.uid(),'administrador'::app_role)
    OR empresa_id IN (SELECT empresa_id FROM public.consultor_empresa_asignacion WHERE consultor_id = auth.uid())
    OR empresa_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
  );

-- INSERT: admin/consultor/cliente (append, cada uno para su empresa).
-- No hay policy de UPDATE ni DELETE => append-only enforced por RLS.
DROP POLICY IF EXISTS "cumplimientos_insert" ON public.obligacion_cumplimientos;
CREATE POLICY "cumplimientos_insert" ON public.obligacion_cumplimientos
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(),'administrador'::app_role)
    OR (public.has_role(auth.uid(),'consultor'::app_role)
        AND empresa_id IN (SELECT empresa_id FROM public.consultor_empresa_asignacion WHERE consultor_id = auth.uid()))
    OR (public.has_role(auth.uid(),'cliente'::app_role)
        AND empresa_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()))
  );

-- Corrección append-only controlada: inserta uno nuevo y marca el viejo no-vigente.
-- SECURITY DEFINER para poder tocar `vigente`/`reemplazado_por` sin abrir UPDATE en RLS.
CREATE OR REPLACE FUNCTION public.corregir_cumplimiento(
  p_cumplimiento_id uuid,
  p_completada boolean,
  p_notas text DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_old public.obligacion_cumplimientos%ROWTYPE;
  v_new_id uuid;
BEGIN
  SELECT * INTO v_old FROM public.obligacion_cumplimientos WHERE id = p_cumplimiento_id AND vigente = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cumplimiento % no existe o ya fue reemplazado', p_cumplimiento_id;
  END IF;

  INSERT INTO public.obligacion_cumplimientos
    (obligacion_id, ocurrencia_id, empresa_id, periodo_key, completada, completada_por, notas, vigente)
  VALUES
    (v_old.obligacion_id, v_old.ocurrencia_id, v_old.empresa_id, v_old.periodo_key,
     p_completada, auth.uid(), coalesce(p_notas, v_old.notas), true)
  RETURNING id INTO v_new_id;

  UPDATE public.obligacion_cumplimientos
    SET vigente = false, reemplazado_por = v_new_id
    WHERE id = p_cumplimiento_id;

  RETURN v_new_id;
END;
$$;


-- -----------------------------------------------------------------------------
-- 8. Generador reapuntado: puebla obligacion_ocurrencias (NO filas de obligaciones)
--    Conserva la lógica de fechas del generador vivo (SEMANAL, ULTIMO_DIA_MES,
--    MENSUAL..ANUAL) y añade snapshot de articulos + catalogo_version.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generar_ocurrencias_obligacion(p_obligacion_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
    v_obl      public.obligaciones%ROWTYPE;
    v_cat      public.obligaciones_catalogo%ROWTYPE;
    v_year     integer := EXTRACT(YEAR FROM CURRENT_DATE)::int;
    v_step     integer;
    v_count    integer;
    v_i        integer;
    v_mes      integer;
    v_dia      integer;
    v_last_day integer;
    v_fecha    date;
    v_jan1     date;
    v_dow      integer;
    v_offset   integer;
  BEGIN
    SELECT * INTO v_obl FROM public.obligaciones WHERE id = p_obligacion_id;
    IF NOT FOUND OR v_obl.catalogo_id IS NULL THEN RETURN; END IF;

    SELECT * INTO v_cat FROM public.obligaciones_catalogo WHERE id = v_obl.catalogo_id;
    IF NOT FOUND OR v_cat.frecuencia_tipo IS NULL OR v_cat.frecuencia_tipo = 'EVENTUAL' THEN
      RETURN;
    END IF;

    IF v_cat.frecuencia_tipo = 'SEMANAL' THEN
      v_dia := COALESCE(v_cat.dia_vencimiento, 5);
      v_jan1 := make_date(v_year, 1, 1);
      v_dow := EXTRACT(ISODOW FROM v_jan1)::int;
      v_offset := (v_dia - v_dow + 7) % 7;
      v_fecha := v_jan1 + v_offset;
      WHILE EXTRACT(YEAR FROM v_fecha)::int = v_year LOOP
        INSERT INTO public.obligacion_ocurrencias
          (obligacion_id, empresa_id, periodo_key, fecha_vencimiento, articulos_snapshot, catalogo_version)
        VALUES
          (p_obligacion_id, v_obl.empresa_id,
           public.calcular_periodo_key(v_fecha, v_cat.frecuencia_tipo),
           v_fecha, v_cat.articulos, v_cat.version)
        ON CONFLICT (obligacion_id, periodo_key) DO NOTHING;
        v_fecha := v_fecha + 7;
      END LOOP;
      RETURN;
    END IF;

    IF v_cat.frecuencia_tipo = 'ULTIMO_DIA_MES' THEN
      FOR v_mes IN 1..12 LOOP
        v_fecha := (make_date(v_year, v_mes, 1) + INTERVAL '1 month - 1 day')::date;
        INSERT INTO public.obligacion_ocurrencias
          (obligacion_id, empresa_id, periodo_key, fecha_vencimiento, articulos_snapshot, catalogo_version)
        VALUES
          (p_obligacion_id, v_obl.empresa_id,
           public.calcular_periodo_key(v_fecha, v_cat.frecuencia_tipo),
           v_fecha, v_cat.articulos, v_cat.version)
        ON CONFLICT (obligacion_id, periodo_key) DO NOTHING;
      END LOOP;
      RETURN;
    END IF;

    CASE v_cat.frecuencia_tipo
      WHEN 'MENSUAL'    THEN v_step := 1;  v_count := 12;
      WHEN 'BIMESTRAL'  THEN v_step := 2;  v_count := 6;
      WHEN 'TRIMESTRAL' THEN v_step := 3;  v_count := 4;
      WHEN 'SEMESTRAL'  THEN v_step := 6;  v_count := 2;
      WHEN 'ANUAL'      THEN v_step := 12; v_count := 1;
      ELSE RETURN;
    END CASE;

    v_dia := COALESCE(v_cat.dia_vencimiento, 1);

    FOR v_i IN 0..(v_count - 1) LOOP
      IF v_cat.frecuencia_tipo = 'ANUAL' THEN
        v_mes := COALESCE(v_cat.mes_vencimiento, 1);
      ELSE
        v_mes := ((v_i * v_step) % 12) + 1;
      END IF;

      v_last_day := EXTRACT(DAY FROM (make_date(v_year, v_mes, 1) + INTERVAL '1 month - 1 day'))::int;
      v_fecha := make_date(v_year, v_mes, LEAST(v_dia, v_last_day));

      INSERT INTO public.obligacion_ocurrencias
        (obligacion_id, empresa_id, periodo_key, fecha_vencimiento, articulos_snapshot, catalogo_version)
      VALUES
        (p_obligacion_id, v_obl.empresa_id,
         public.calcular_periodo_key(v_fecha, v_cat.frecuencia_tipo),
         v_fecha, v_cat.articulos, v_cat.version)
      ON CONFLICT (obligacion_id, periodo_key) DO NOTHING;
    END LOOP;
  END;
  $function$;


-- -----------------------------------------------------------------------------
-- 9. Limpieza del Linaje B muerto (declarado en 20260430000000, nunca aplicado)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.generar_obligaciones_empresa_programa(uuid, text, integer);
DROP FUNCTION IF EXISTS public.generar_obligaciones_todos_programas_activos(integer);
DROP FUNCTION IF EXISTS public.ultimo_dia_habil(integer, integer);

COMMENT ON TABLE public.obligacion_ocurrencias IS
  'Fase 2: período concreto de una obligación recurrente. Reemplaza las filas-ocurrencia que antes vivían aplastadas en `obligaciones`.';
COMMENT ON COLUMN public.obligacion_cumplimientos.ocurrencia_id IS
  'NULL = cumplimiento ligado directo a la obligación (manuales/eventuales sin período). NOT NULL = ligado a una ocurrencia recurrente.';

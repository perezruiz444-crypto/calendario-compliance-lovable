
-- 0. Ampliar el CHECK constraint para aceptar SEMANAL y ULTIMO_DIA_MES
ALTER TABLE public.obligaciones_catalogo
  DROP CONSTRAINT IF EXISTS obligaciones_catalogo_frecuencia_tipo_check;

ALTER TABLE public.obligaciones_catalogo
  ADD CONSTRAINT obligaciones_catalogo_frecuencia_tipo_check
  CHECK (frecuencia_tipo IS NULL OR frecuencia_tipo = ANY (ARRAY[
    'MENSUAL','BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL','EVENTUAL','SEMANAL','ULTIMO_DIA_MES'
  ]));

-- 1. Re-curar catálogos sin frecuencia
UPDATE public.obligaciones_catalogo
SET frecuencia_tipo = CASE
  WHEN presentacion ILIKE '%semanal%' OR presentacion ILIKE '%cada viernes%' OR presentacion ILIKE '%cada lunes%' OR presentacion ILIKE '%cada martes%' OR presentacion ILIKE '%cada miércoles%' OR presentacion ILIKE '%cada jueves%' THEN 'SEMANAL'
  WHEN presentacion ILIKE '%último día%' OR presentacion ILIKE '%ultimo dia%' OR presentacion ILIKE '%último día hábil%' THEN 'ULTIMO_DIA_MES'
  WHEN presentacion ILIKE '%mensualmente%' OR presentacion ILIKE '%mes inmediato siguiente%' OR presentacion ILIKE '%cada mes%' OR presentacion ILIKE '%mensual%' THEN 'MENSUAL'
  WHEN presentacion ILIKE '%anual%' OR presentacion ILIKE '%cada año%' THEN 'ANUAL'
  ELSE 'EVENTUAL'
END,
dia_vencimiento = CASE
  WHEN presentacion ILIKE '%cada viernes%' THEN 5
  WHEN presentacion ILIKE '%cada lunes%' THEN 1
  WHEN presentacion ILIKE '%cada martes%' THEN 2
  WHEN presentacion ILIKE '%cada miércoles%' THEN 3
  WHEN presentacion ILIKE '%cada jueves%' THEN 4
  WHEN presentacion ILIKE '%semanal%' THEN 5
  WHEN presentacion ILIKE '%mensualmente%' OR presentacion ILIKE '%mes inmediato siguiente%' OR presentacion ILIKE '%cada mes%' OR presentacion ILIKE '%mensual%' THEN 17
  ELSE dia_vencimiento
END,
mes_vencimiento = CASE
  WHEN presentacion ILIKE '%último día hábil de mayo%' THEN 5
  WHEN presentacion ILIKE '%15 de abril%' OR presentacion ILIKE '%último día hábil abril%' THEN 4
  WHEN presentacion ILIKE '%anual%' AND mes_vencimiento IS NULL THEN 4
  ELSE mes_vencimiento
END
WHERE frecuencia_tipo IS NULL;

-- 2. Re-escribir generar_ocurrencias_obligacion con SEMANAL y ULTIMO_DIA_MES
CREATE OR REPLACE FUNCTION public.generar_ocurrencias_obligacion(p_obligacion_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_obl       public.obligaciones%ROWTYPE;
  v_cat       public.obligaciones_catalogo%ROWTYPE;
  v_year      integer := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_step      integer;
  v_count     integer;
  v_i         integer;
  v_mes       integer;
  v_dia       integer;
  v_last_day  integer;
  v_fecha     date;
  v_new_id    uuid;
  v_jan1      date;
  v_dow       integer;
  v_offset    integer;
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
      INSERT INTO public.obligaciones (
        empresa_id, catalogo_id, categoria, nombre, descripcion,
        articulos, presentacion, fecha_vencimiento, estado, activa, created_by
      ) VALUES (
        v_obl.empresa_id, v_obl.catalogo_id, v_obl.categoria, v_obl.nombre, v_obl.descripcion,
        v_obl.articulos, v_obl.presentacion, v_fecha, 'vigente', true, v_obl.created_by
      )
      ON CONFLICT (empresa_id, catalogo_id, fecha_vencimiento)
      WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL
      DO NOTHING
      RETURNING id INTO v_new_id;

      IF v_new_id IS NOT NULL THEN
        INSERT INTO public.obligacion_responsables (obligacion_id, user_id, tipo)
        SELECT v_new_id, user_id, tipo
        FROM public.obligacion_responsables
        WHERE obligacion_id = p_obligacion_id;
      END IF;
      v_new_id := NULL;
      v_fecha := v_fecha + 7;
    END LOOP;
    RETURN;
  END IF;

  IF v_cat.frecuencia_tipo = 'ULTIMO_DIA_MES' THEN
    FOR v_mes IN 1..12 LOOP
      v_fecha := (make_date(v_year, v_mes, 1) + INTERVAL '1 month - 1 day')::date;
      INSERT INTO public.obligaciones (
        empresa_id, catalogo_id, categoria, nombre, descripcion,
        articulos, presentacion, fecha_vencimiento, estado, activa, created_by
      ) VALUES (
        v_obl.empresa_id, v_obl.catalogo_id, v_obl.categoria, v_obl.nombre, v_obl.descripcion,
        v_obl.articulos, v_obl.presentacion, v_fecha, 'vigente', true, v_obl.created_by
      )
      ON CONFLICT (empresa_id, catalogo_id, fecha_vencimiento)
      WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL
      DO NOTHING
      RETURNING id INTO v_new_id;

      IF v_new_id IS NOT NULL THEN
        INSERT INTO public.obligacion_responsables (obligacion_id, user_id, tipo)
        SELECT v_new_id, user_id, tipo
        FROM public.obligacion_responsables
        WHERE obligacion_id = p_obligacion_id;
      END IF;
      v_new_id := NULL;
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

    INSERT INTO public.obligaciones (
      empresa_id, catalogo_id, categoria, nombre, descripcion,
      articulos, presentacion, fecha_vencimiento, estado, activa, created_by
    ) VALUES (
      v_obl.empresa_id, v_obl.catalogo_id, v_obl.categoria, v_obl.nombre, v_obl.descripcion,
      v_obl.articulos, v_obl.presentacion, v_fecha, 'vigente', true, v_obl.created_by
    )
    ON CONFLICT (empresa_id, catalogo_id, fecha_vencimiento)
    WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_new_id;

    IF v_new_id IS NOT NULL THEN
      INSERT INTO public.obligacion_responsables (obligacion_id, user_id, tipo)
      SELECT v_new_id, user_id, tipo
      FROM public.obligacion_responsables
      WHERE obligacion_id = p_obligacion_id;
    END IF;
    v_new_id := NULL;
  END LOOP;
END;
$function$;

-- 3. Trigger de cumplimiento → estado completada
CREATE OR REPLACE FUNCTION public.marcar_obligacion_cumplida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.obligaciones
  SET estado = 'completada', updated_at = now()
  WHERE id = NEW.obligacion_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marcar_obligacion_cumplida ON public.obligacion_cumplimientos;
CREATE TRIGGER trg_marcar_obligacion_cumplida
AFTER INSERT ON public.obligacion_cumplimientos
FOR EACH ROW EXECUTE FUNCTION public.marcar_obligacion_cumplida();

-- 4. Limpiar huérfanas
DELETE FROM public.obligaciones
WHERE fecha_vencimiento IS NULL
  AND activa = false
  AND created_at < now() - interval '30 days';

-- 5. Re-expandir
SELECT public.expand_existing_obligaciones();

-- Ocurrencias solo desde la fecha de alta de la obligación + generación del año siguiente.
--
-- Problema: generar_ocurrencias_obligacion creaba los 12 periodos del año aunque la obligación se diera
-- de alta en octubre. ~690 periodos previos al alta quedaban "atrasados" sin que nadie fuera a marcarlos.
-- Además ningún proceso generaba el año siguiente: el 1-ene todas las obligaciones se quedaban sin periodo.
--
-- 1. generar_ocurrencias_obligacion_anio(id, año): genera un año, omitiendo fechas anteriores al alta.
-- 2. generar_ocurrencias_obligacion(id) (firma existente, la usan triggers y migraciones): año actual y,
--    si no queda ningún periodo futuro, también el siguiente.
-- 3. generar_ocurrencias_anio(año) + cron el 1-dic para crear el año siguiente de todas las activas.
-- 4. Backfill del año siguiente para las que hoy no tienen periodo futuro.
-- 5. Limpieza (DELETE) de ocurrencias anteriores al alta sin ningún cumplimiento — se corrió en el SQL Editor.

CREATE OR REPLACE FUNCTION public.generar_ocurrencias_obligacion_anio(p_obligacion_id uuid, p_year integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_obl      public.obligaciones%ROWTYPE;
  v_cat      public.obligaciones_catalogo%ROWTYPE;
  v_desde    date;
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

  -- Periodos que vencieron antes del alta no aplican
  v_desde := COALESCE(v_obl.created_at::date, CURRENT_DATE);

  IF v_cat.frecuencia_tipo = 'SEMANAL' THEN
    v_dia := COALESCE(v_cat.dia_vencimiento, 5);
    v_jan1 := make_date(p_year, 1, 1);
    v_dow := EXTRACT(ISODOW FROM v_jan1)::int;
    v_offset := (v_dia - v_dow + 7) % 7;
    v_fecha := v_jan1 + v_offset;
    WHILE EXTRACT(YEAR FROM v_fecha)::int = p_year LOOP
      IF v_fecha >= v_desde THEN
        INSERT INTO public.obligacion_ocurrencias
          (obligacion_id, empresa_id, periodo_key, fecha_vencimiento, articulos_snapshot, catalogo_version)
        VALUES
          (p_obligacion_id, v_obl.empresa_id,
           public.calcular_periodo_key(v_fecha, v_cat.frecuencia_tipo),
           v_fecha, v_cat.articulos, v_cat.version)
        ON CONFLICT (obligacion_id, periodo_key) DO NOTHING;
      END IF;
      v_fecha := v_fecha + 7;
    END LOOP;
    RETURN;
  END IF;

  IF v_cat.frecuencia_tipo = 'ULTIMO_DIA_MES' THEN
    FOR v_mes IN 1..12 LOOP
      v_fecha := (make_date(p_year, v_mes, 1) + INTERVAL '1 month - 1 day')::date;
      IF v_fecha >= v_desde THEN
        INSERT INTO public.obligacion_ocurrencias
          (obligacion_id, empresa_id, periodo_key, fecha_vencimiento, articulos_snapshot, catalogo_version)
        VALUES
          (p_obligacion_id, v_obl.empresa_id,
           public.calcular_periodo_key(v_fecha, v_cat.frecuencia_tipo),
           v_fecha, v_cat.articulos, v_cat.version)
        ON CONFLICT (obligacion_id, periodo_key) DO NOTHING;
      END IF;
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

    v_last_day := EXTRACT(DAY FROM (make_date(p_year, v_mes, 1) + INTERVAL '1 month - 1 day'))::int;
    v_fecha := make_date(p_year, v_mes, LEAST(v_dia, v_last_day));

    IF v_fecha >= v_desde THEN
      INSERT INTO public.obligacion_ocurrencias
        (obligacion_id, empresa_id, periodo_key, fecha_vencimiento, articulos_snapshot, catalogo_version)
      VALUES
        (p_obligacion_id, v_obl.empresa_id,
         public.calcular_periodo_key(v_fecha, v_cat.frecuencia_tipo),
         v_fecha, v_cat.articulos, v_cat.version)
      ON CONFLICT (obligacion_id, periodo_key) DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generar_ocurrencias_obligacion(p_obligacion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_year integer := EXTRACT(YEAR FROM CURRENT_DATE)::int;
BEGIN
  PERFORM public.generar_ocurrencias_obligacion_anio(p_obligacion_id, v_year);

  -- Siempre debe existir un próximo periodo (p. ej. anual dada de alta después de su vencimiento)
  IF NOT EXISTS (
    SELECT 1 FROM public.obligacion_ocurrencias
    WHERE obligacion_id = p_obligacion_id AND fecha_vencimiento >= CURRENT_DATE
  ) THEN
    PERFORM public.generar_ocurrencias_obligacion_anio(p_obligacion_id, v_year + 1);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generar_ocurrencias_anio(p_year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_n  integer := 0;
BEGIN
  FOR v_id IN SELECT id FROM public.obligaciones WHERE activa AND catalogo_id IS NOT NULL LOOP
    PERFORM public.generar_ocurrencias_obligacion_anio(v_id, p_year);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generar_ocurrencias_obligacion_anio(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generar_ocurrencias_anio(integer) FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'generar-ocurrencias-anio-siguiente',
  '0 6 1 12 *',
  $$select public.generar_ocurrencias_anio(extract(year from now())::int + 1)$$
);

-- Backfill: año siguiente para las que hoy no tienen periodo futuro
SELECT public.generar_ocurrencias_obligacion(o.id)
FROM public.obligaciones o
WHERE o.activa AND o.catalogo_id IS NOT NULL;

-- Limpieza (ejecutada en el SQL Editor): periodos anteriores al alta sin ningún cumplimiento
DELETE FROM public.obligacion_ocurrencias oc
USING public.obligaciones o
WHERE o.id = oc.obligacion_id
  AND oc.fecha_vencimiento < o.created_at::date
  AND NOT EXISTS (
    SELECT 1 FROM public.obligacion_cumplimientos c
    WHERE c.ocurrencia_id = oc.id
       OR (c.obligacion_id = oc.obligacion_id AND c.periodo_key = oc.periodo_key)
  )
  AND NOT EXISTS (SELECT 1 FROM public.tareas t WHERE t.ocurrencia_id = oc.id);

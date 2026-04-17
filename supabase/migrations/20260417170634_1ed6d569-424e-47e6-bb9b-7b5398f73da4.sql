-- 1. Add frequency columns to catalog
ALTER TABLE public.obligaciones_catalogo
  ADD COLUMN IF NOT EXISTS frecuencia_tipo text,
  ADD COLUMN IF NOT EXISTS dia_vencimiento integer,
  ADD COLUMN IF NOT EXISTS mes_vencimiento integer;

ALTER TABLE public.obligaciones_catalogo
  DROP CONSTRAINT IF EXISTS obligaciones_catalogo_frecuencia_tipo_check;
ALTER TABLE public.obligaciones_catalogo
  ADD CONSTRAINT obligaciones_catalogo_frecuencia_tipo_check
  CHECK (frecuencia_tipo IS NULL OR frecuencia_tipo IN ('MENSUAL','BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL','EVENTUAL'));

ALTER TABLE public.obligaciones_catalogo
  DROP CONSTRAINT IF EXISTS obligaciones_catalogo_dia_vencimiento_check;
ALTER TABLE public.obligaciones_catalogo
  ADD CONSTRAINT obligaciones_catalogo_dia_vencimiento_check
  CHECK (dia_vencimiento IS NULL OR (dia_vencimiento BETWEEN 1 AND 31));

ALTER TABLE public.obligaciones_catalogo
  DROP CONSTRAINT IF EXISTS obligaciones_catalogo_mes_vencimiento_check;
ALTER TABLE public.obligaciones_catalogo
  ADD CONSTRAINT obligaciones_catalogo_mes_vencimiento_check
  CHECK (mes_vencimiento IS NULL OR (mes_vencimiento BETWEEN 1 AND 12));

-- 2. Anti-duplicate unique index on obligaciones
CREATE UNIQUE INDEX IF NOT EXISTS obligaciones_unique_empresa_catalogo_fecha
  ON public.obligaciones (empresa_id, catalogo_id, fecha_vencimiento)
  WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL;

-- 3. Generator function
CREATE OR REPLACE FUNCTION public.generar_ocurrencias_obligacion(p_obligacion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  SELECT * INTO v_obl FROM public.obligaciones WHERE id = p_obligacion_id;
  IF NOT FOUND OR v_obl.catalogo_id IS NULL THEN RETURN; END IF;

  SELECT * INTO v_cat FROM public.obligaciones_catalogo WHERE id = v_obl.catalogo_id;
  IF NOT FOUND OR v_cat.frecuencia_tipo IS NULL OR v_cat.frecuencia_tipo = 'EVENTUAL' THEN
    RETURN;
  END IF;

  -- Determine step (months between occurrences) and total count
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

    -- Clamp day to last day of month
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

    -- Copy responsables to new occurrence
    IF v_new_id IS NOT NULL THEN
      INSERT INTO public.obligacion_responsables (obligacion_id, user_id, tipo)
      SELECT v_new_id, user_id, tipo
      FROM public.obligacion_responsables
      WHERE obligacion_id = p_obligacion_id;
    END IF;
    v_new_id := NULL;
  END LOOP;
END;
$$;

-- 4. Trigger
CREATE OR REPLACE FUNCTION public.trg_generar_ocurrencias_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.catalogo_id IS NOT NULL AND pg_trigger_depth() = 1 THEN
    PERFORM public.generar_ocurrencias_obligacion(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generar_ocurrencias ON public.obligaciones;
CREATE TRIGGER trg_generar_ocurrencias
AFTER INSERT ON public.obligaciones
FOR EACH ROW
EXECUTE FUNCTION public.trg_generar_ocurrencias_fn();
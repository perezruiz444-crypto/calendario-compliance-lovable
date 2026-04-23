-- 1. Backfill conservador del catálogo basado en texto de "presentacion"
UPDATE public.obligaciones_catalogo
SET
  frecuencia_tipo = CASE
    WHEN frecuencia_tipo IS NOT NULL THEN frecuencia_tipo
    WHEN presentacion ILIKE '%mensual%'    THEN 'MENSUAL'
    WHEN presentacion ILIKE '%bimestral%'  THEN 'BIMESTRAL'
    WHEN presentacion ILIKE '%trimestral%' THEN 'TRIMESTRAL'
    WHEN presentacion ILIKE '%semestral%'  THEN 'SEMESTRAL'
    WHEN presentacion ILIKE '%anual%' OR presentacion ILIKE '%renovaci%'
                                           THEN 'ANUAL'
    WHEN presentacion ILIKE '%único%' OR presentacion ILIKE '%unico%'
      OR presentacion ILIKE '%en todo momento%'
      OR presentacion ILIKE '%al rectificar%'
      OR presentacion ILIKE '%en caso%'
      OR presentacion ILIKE '%event%'      THEN 'EVENTUAL'
    ELSE NULL
  END,
  dia_vencimiento = CASE
    WHEN dia_vencimiento IS NOT NULL THEN dia_vencimiento
    -- intenta extraer un número de día del texto ("día 17", "(21 de cada mes)")
    WHEN presentacion ~ '\d{1,2}' THEN
      LEAST(31, GREATEST(1, (regexp_match(presentacion, '(\d{1,2})'))[1]::int))
    WHEN presentacion ILIKE '%mensual%'    THEN 17
    WHEN presentacion ILIKE '%bimestral%'  THEN 17
    WHEN presentacion ILIKE '%trimestral%' THEN 17
    WHEN presentacion ILIKE '%semestral%'  THEN 17
    WHEN presentacion ILIKE '%anual%' OR presentacion ILIKE '%renovaci%'
                                           THEN 30
    ELSE NULL
  END,
  mes_vencimiento = CASE
    WHEN mes_vencimiento IS NOT NULL THEN mes_vencimiento
    WHEN presentacion ILIKE '%anual%' OR presentacion ILIKE '%renovaci%'
                                           THEN 4   -- abril por defecto
    ELSE NULL
  END
WHERE activo = true;

-- 2. Función one-shot: expande obligaciones ya activas con catálogo recurrente
CREATE OR REPLACE FUNCTION public.expand_existing_obligaciones()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_processed integer := 0;
BEGIN
  -- Para cada empresa+catalogo recurrente que solo tiene 1 (o pocas) ocurrencias,
  -- toma la fila "semilla" más antigua y dispara el generador.
  FOR r IN
    SELECT DISTINCT ON (o.empresa_id, o.catalogo_id) o.id
    FROM public.obligaciones o
    JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
    WHERE o.catalogo_id IS NOT NULL
      AND o.activa = true
      AND c.frecuencia_tipo IS NOT NULL
      AND c.frecuencia_tipo <> 'EVENTUAL'
    ORDER BY o.empresa_id, o.catalogo_id, o.created_at ASC
  LOOP
    PERFORM public.generar_ocurrencias_obligacion(r.id);
    v_processed := v_processed + 1;
  END LOOP;

  RETURN v_processed;
END;
$$;

-- 3. Ejecutar una vez
SELECT public.expand_existing_obligaciones();
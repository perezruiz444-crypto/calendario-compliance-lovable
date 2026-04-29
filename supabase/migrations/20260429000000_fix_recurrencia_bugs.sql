-- ============================================================
-- BUG 1: Dedup duplicados mismo mes + constraint preventivo
-- ============================================================

-- 1a. Borrar duplicados: por cada grupo empresa+catalogo+mes,
--     conservar la fila con cumplimiento, o si no hay, la más reciente.
DELETE FROM public.obligaciones
WHERE id IN (
  SELECT id FROM (
    SELECT
      o.id,
      ROW_NUMBER() OVER (
        PARTITION BY o.empresa_id, o.catalogo_id, date_trunc('month', o.fecha_vencimiento)
        ORDER BY
          (SELECT COUNT(*) FROM public.obligacion_cumplimientos oc WHERE oc.obligacion_id = o.id) DESC,
          o.created_at DESC
      ) AS rn
    FROM public.obligaciones o
    WHERE o.catalogo_id IS NOT NULL
      AND o.fecha_vencimiento IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- 1b. Unique index: mismo empresa+catalogo no puede tener dos fechas en el mismo año-mes
CREATE UNIQUE INDEX IF NOT EXISTS idx_obligaciones_unique_mes
  ON public.obligaciones (empresa_id, catalogo_id, to_char(fecha_vencimiento, 'YYYY-MM'))
  WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL;

-- ============================================================
-- BUG 2A: Corregir catálogos ULTIMO_DIA_MES que son realmente ANUAL
-- ============================================================

-- 2a. Catálogos cuyo texto dice "de <mes>" pero frecuencia_tipo = 'ULTIMO_DIA_MES'
--     → cambiar a ANUAL con el mes correcto
UPDATE public.obligaciones_catalogo
SET
  frecuencia_tipo = 'ANUAL',
  mes_vencimiento = CASE
    WHEN presentacion ILIKE '%de enero%'      THEN 1
    WHEN presentacion ILIKE '%de febrero%'    THEN 2
    WHEN presentacion ILIKE '%de marzo%'      THEN 3
    WHEN presentacion ILIKE '%de abril%'      THEN 4
    WHEN presentacion ILIKE '%de mayo%'       THEN 5
    WHEN presentacion ILIKE '%de junio%'      THEN 6
    WHEN presentacion ILIKE '%de julio%'      THEN 7
    WHEN presentacion ILIKE '%de agosto%'     THEN 8
    WHEN presentacion ILIKE '%de septiembre%' THEN 9
    WHEN presentacion ILIKE '%de octubre%'    THEN 10
    WHEN presentacion ILIKE '%de noviembre%'  THEN 11
    WHEN presentacion ILIKE '%de diciembre%'  THEN 12
    ELSE mes_vencimiento
  END
WHERE frecuencia_tipo = 'ULTIMO_DIA_MES'
  AND (
    presentacion ILIKE '%de enero%'      OR presentacion ILIKE '%de febrero%'    OR
    presentacion ILIKE '%de marzo%'      OR presentacion ILIKE '%de abril%'      OR
    presentacion ILIKE '%de mayo%'       OR presentacion ILIKE '%de junio%'      OR
    presentacion ILIKE '%de julio%'      OR presentacion ILIKE '%de agosto%'     OR
    presentacion ILIKE '%de septiembre%' OR presentacion ILIKE '%de octubre%'    OR
    presentacion ILIKE '%de noviembre%'  OR presentacion ILIKE '%de diciembre%'
  );

-- 2b. Borrar ocurrencias extra de esos catálogos (meses que no son el mes_vencimiento)
--     Solo borra si NO tienen cumplimiento registrado.
DELETE FROM public.obligaciones o
USING public.obligaciones_catalogo c
WHERE o.catalogo_id = c.id
  AND c.frecuencia_tipo = 'ANUAL'
  AND c.mes_vencimiento IS NOT NULL
  AND EXTRACT(MONTH FROM o.fecha_vencimiento) <> c.mes_vencimiento
  AND o.activa = true
  AND NOT EXISTS (
    SELECT 1 FROM public.obligacion_cumplimientos oc WHERE oc.obligacion_id = o.id
  );

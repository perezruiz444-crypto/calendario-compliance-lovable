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

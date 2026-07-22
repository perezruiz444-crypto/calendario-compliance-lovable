-- =============================================================================
-- FASE 2 (2/2) — BACKFILL big-bang (transaccional con guardas de conteo)
-- =============================================================================
-- Promueve 1 semilla por grupo (empresa,catálogo), mueve las filas-ocurrencia
-- a obligacion_ocurrencias, re-vincula los cumplimientos por carril, deduplica
-- cumplimientos redundantes por (semilla,periodo_key), y elimina las filas-
-- ocurrencia viejas de `obligaciones`. Las obligaciones manuales NO se tocan;
-- sus cumplimientos quedan con ocurrencia_id NULL.
--
-- APLICADO A PROD 2026-07-22: 114 semillas, 359 ocurrencias, 3 cumpl recurrentes
-- revinculados, 6 cumpl duplicados deduplicados (7 "Art.69 CFF" 2026-07 -> 1),
-- 20 cumplimientos finales. 0 huérfanos. Respaldo previo en supabase/backups/.
--
-- Todo en un DO transaccional que RAISE EXCEPTION si los conteos no cuadran.
-- =============================================================================

DO $backfill$
DECLARE
  v_semillas    int;
  v_ocurrencias int;
  v_esperadas   int;
  v_cumpl_antes int;
  v_cumpl_desp  int;
  v_recurrentes int;
  v_dedup       int;
BEGIN
  -- Desactivar el trigger de generación para que la inserción de semillas NO
  -- dispare generación automática (haremos el backfill manual con fechas reales).
  ALTER TABLE public.obligaciones DISABLE TRIGGER trg_generar_ocurrencias;

  -- 0. Snapshot de conteo previo de cumplimientos
  SELECT count(*) INTO v_cumpl_antes FROM public.obligacion_cumplimientos;

  -- 1. Mapa grupo(empresa,catalogo) -> nueva semilla_id (fila representativa)
  CREATE TEMP TABLE _mapa_semillas ON COMMIT DROP AS
  SELECT DISTINCT ON (o.empresa_id, o.catalogo_id)
    gen_random_uuid() AS nueva_semilla_id,
    o.empresa_id, o.catalogo_id,
    o.categoria, o.nombre, o.descripcion, o.articulos, o.presentacion, o.created_by
  FROM public.obligaciones o
  WHERE o.catalogo_id IS NOT NULL
  ORDER BY o.empresa_id, o.catalogo_id, o.created_at NULLS LAST;

  -- 2. Insertar las semillas nuevas (activa=true, sin fecha_vencimiento: la semilla
  --    ya no es una ocurrencia; las fechas viven en obligacion_ocurrencias).
  INSERT INTO public.obligaciones
    (id, empresa_id, catalogo_id, categoria, nombre, descripcion, articulos,
     presentacion, estado, activa, created_by)
  SELECT
    nueva_semilla_id, empresa_id, catalogo_id, categoria, nombre, descripcion,
    articulos, presentacion, 'vigente', true, created_by
  FROM _mapa_semillas;
  GET DIAGNOSTICS v_semillas = ROW_COUNT;

  -- 3. Copiar responsables de las filas viejas a la nueva semilla (dedup por user)
  INSERT INTO public.obligacion_responsables (obligacion_id, user_id, tipo)
  SELECT DISTINCT ms.nueva_semilla_id, r.user_id, r.tipo
  FROM public.obligacion_responsables r
  JOIN public.obligaciones o_old ON o_old.id = r.obligacion_id AND o_old.catalogo_id IS NOT NULL
  JOIN _mapa_semillas ms ON ms.empresa_id = o_old.empresa_id AND ms.catalogo_id = o_old.catalogo_id
  ON CONFLICT (obligacion_id, user_id) DO NOTHING;

  -- 4. Backfill de ocurrencias: cada fila-ocurrencia vieja -> obligacion_ocurrencias
  INSERT INTO public.obligacion_ocurrencias
    (obligacion_id, empresa_id, periodo_key, fecha_vencimiento, articulos_snapshot, catalogo_version, estado)
  SELECT
    ms.nueva_semilla_id,
    o.empresa_id,
    public.calcular_periodo_key(o.fecha_vencimiento, c.frecuencia_tipo),
    o.fecha_vencimiento,
    c.articulos,
    c.version,
    CASE WHEN o.fecha_vencimiento < CURRENT_DATE THEN 'vencida' ELSE 'pendiente' END
  FROM public.obligaciones o
  JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
  JOIN _mapa_semillas ms ON ms.empresa_id = o.empresa_id AND ms.catalogo_id = o.catalogo_id
  WHERE o.catalogo_id IS NOT NULL AND o.fecha_vencimiento IS NOT NULL
  ON CONFLICT (obligacion_id, periodo_key) DO NOTHING;
  GET DIAGNOSTICS v_ocurrencias = ROW_COUNT;

  SELECT count(*) INTO v_esperadas
  FROM public.obligaciones
  WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL;

  -- GUARDA 1: todas las ocurrencias con fecha deben haber migrado
  IF v_ocurrencias <> v_esperadas THEN
    RAISE EXCEPTION 'Backfill ocurrencias: migradas % != esperadas %', v_ocurrencias, v_esperadas;
  END IF;

  -- 5. Re-vincular cumplimientos RECURRENTES (obligación con catálogo) a su ocurrencia.
  --    Se precalcula el mapeo en una subconsulta: no se puede referenciar la tabla
  --    objetivo del UPDATE dentro de un JOIN del FROM (Postgres lo prohíbe).
  UPDATE public.obligacion_cumplimientos cu
  SET ocurrencia_id = m.ocurrencia_id
  FROM (
    SELECT cu2.id AS cumplimiento_id, oc.id AS ocurrencia_id
    FROM public.obligacion_cumplimientos cu2
    JOIN public.obligaciones o_old
      ON o_old.id = cu2.obligacion_id AND o_old.catalogo_id IS NOT NULL
    JOIN _mapa_semillas ms
      ON ms.empresa_id = o_old.empresa_id AND ms.catalogo_id = o_old.catalogo_id
    JOIN public.obligacion_ocurrencias oc
      ON oc.obligacion_id = ms.nueva_semilla_id
     AND oc.periodo_key = cu2.periodo_key
  ) m
  WHERE cu.id = m.cumplimiento_id;
  GET DIAGNOSTICS v_recurrentes = ROW_COUNT;

  -- 5a-bis. DEDUP: al colapsar el grupo a UNA semilla, varios cumplimientos viejos
  --   del mismo (empresa,catálogo,periodo_key) chocarían contra el UNIQUE
  --   (obligacion_id, periodo_key). Son toggles/pruebas redundantes (misma
  --   obligación marcada N veces sobre filas-ocurrencia distintas del mismo
  --   período). Conservamos el más reciente por grupo y borramos los demás.
  --   Nota: la corrección legítima post-migración se hace append-only vía RPC;
  --   esta dedup es solo saneo de data histórica pre-modelo.
  WITH ranked AS (
    SELECT cu.id,
      row_number() OVER (
        PARTITION BY ms.nueva_semilla_id, cu.periodo_key
        ORDER BY cu.created_at DESC, cu.id DESC
      ) AS rn
    FROM public.obligacion_cumplimientos cu
    JOIN public.obligaciones o_old
      ON o_old.id = cu.obligacion_id AND o_old.catalogo_id IS NOT NULL
    JOIN _mapa_semillas ms
      ON ms.empresa_id = o_old.empresa_id AND ms.catalogo_id = o_old.catalogo_id
  )
  DELETE FROM public.obligacion_cumplimientos
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
  GET DIAGNOSTICS v_dedup = ROW_COUNT;

  -- 5b. Re-apuntar obligacion_id de los cumplimientos supervivientes a la nueva semilla
  --     (para que sigan colgando de una fila viva tras borrar las viejas).
  UPDATE public.obligacion_cumplimientos cu
  SET obligacion_id = ms.nueva_semilla_id
  FROM public.obligaciones o_old
  JOIN _mapa_semillas ms ON ms.empresa_id = o_old.empresa_id AND ms.catalogo_id = o_old.catalogo_id
  WHERE cu.obligacion_id = o_old.id
    AND o_old.catalogo_id IS NOT NULL;

  -- Los cumplimientos de obligaciones MANUALES (catalogo_id NULL) quedan intactos:
  -- ocurrencia_id NULL, obligacion_id apuntando a la obligación manual (que no se borra).

  -- 6. Eliminar las filas-ocurrencia viejas de `obligaciones` (ya migradas).
  --    Solo las que tienen catálogo. Las 33 manuales se preservan.
  DELETE FROM public.obligaciones o
  WHERE o.catalogo_id IS NOT NULL
    AND o.id NOT IN (SELECT nueva_semilla_id FROM _mapa_semillas);

  -- GUARDA 2: solo se perdieron los duplicados deduplicados (ni uno más).
  SELECT count(*) INTO v_cumpl_desp FROM public.obligacion_cumplimientos;
  IF v_cumpl_desp <> (v_cumpl_antes - v_dedup) THEN
    RAISE EXCEPTION 'Cumplimientos perdidos inesperados: antes %, dedup %, después % (esperado %)',
      v_cumpl_antes, v_dedup, v_cumpl_desp, v_cumpl_antes - v_dedup;
  END IF;

  -- Reactivar el trigger
  ALTER TABLE public.obligaciones ENABLE TRIGGER trg_generar_ocurrencias;

  RAISE NOTICE 'Backfill OK: % semillas, % ocurrencias, % cumpl recurrentes revinculados, % cumpl totales preservados',
    v_semillas, v_ocurrencias, v_recurrentes, v_cumpl_desp;
END $backfill$;

-- Dropear el índice único año-mes (ya no aplica; uniqueness vive en ocurrencias)
DROP INDEX IF EXISTS public.idx_obligaciones_unique_mes;

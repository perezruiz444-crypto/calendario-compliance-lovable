-- =============================================================================
-- BASELINE DE RECONCILIACIÓN — motor de obligaciones (Fase 0)
-- =============================================================================
-- Propósito: reconciliar el repo con lo que la base viva realmente corre.
-- La base (proyecto svozqrjhwaohfmbkhpig) tenía objetos del dominio de
-- obligaciones que NO estaban declarados fielmente en migraciones del repo, y
-- migraciones del repo que NUNCA se aplicaron a la base. Este archivo vuelca el
-- ESTADO VIVO REAL para que `supabase db diff` (acotado al dominio de
-- obligaciones) dé vacío.
--
-- Todo aquí es CREATE OR REPLACE / IF NOT EXISTS => idempotente y fiel byte a
-- byte al estado vivo capturado vía pg_get_functiondef / pg_get_triggerdef.
-- NO cambia comportamiento.
--
-- Ver diagnóstico: docs del plan Fase 0.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Columna viva no declarada en el repo: empresa_programas.sectores
--    (text[] DEFAULT '{}', nullable) — fue agregada a la base fuera de migración.
-- -----------------------------------------------------------------------------
ALTER TABLE public.empresa_programas
  ADD COLUMN IF NOT EXISTS sectores text[] DEFAULT '{}'::text[];


-- -----------------------------------------------------------------------------
-- 2. Generador vivo: generar_ocurrencias_obligacion(uuid)
--    Versión REAL en producción (dedup por año-mes, v_i declarada).
--    Difiere del archivo del linaje A en el repo. Esta es la fuente de verdad.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generar_ocurrencias_obligacion(p_obligacion_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
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
        ON CONFLICT (empresa_id, catalogo_id, (EXTRACT(year FROM fecha_vencimiento)), (EXTRACT(month FROM fecha_vencimiento)))
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
        ON CONFLICT (empresa_id, catalogo_id, (EXTRACT(year FROM fecha_vencimiento)), (EXTRACT(month FROM fecha_vencimiento)))
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
      ON CONFLICT (empresa_id, catalogo_id, (EXTRACT(year FROM fecha_vencimiento)), (EXTRACT(month FROM fecha_vencimiento)))
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


-- -----------------------------------------------------------------------------
-- 3. Trigger vivo sin fuente en el repo: trg_generar_ocurrencias_fn()
--    AFTER INSERT en obligaciones. Usa pg_trigger_depth()=1 anti-recursión.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_generar_ocurrencias_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.catalogo_id IS NOT NULL AND pg_trigger_depth() = 1 THEN
    PERFORM public.generar_ocurrencias_obligacion(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_generar_ocurrencias ON public.obligaciones;
CREATE TRIGGER trg_generar_ocurrencias
  AFTER INSERT ON public.obligaciones
  FOR EACH ROW EXECUTE FUNCTION public.trg_generar_ocurrencias_fn();


-- -----------------------------------------------------------------------------
-- 4. Trigger vivo sin fuente en el repo: trg_generar_ocurrencias_empresa_programa()
--    AFTER INSERT OR UPDATE OF activo en empresa_programas.
--    OJO: usa un dedup DISTINTO al del generador (fecha_vencimiento completa vs
--    año-mes). Se reconcilia tal cual está vivo; su UNIFICACIÓN es trabajo de la
--    Fase 1 (no de este baseline, que no cambia comportamiento).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_generar_ocurrencias_empresa_programa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    obligacion_id uuid;
  BEGIN
    IF NEW.activo = false THEN
      RETURN NEW;
    END IF;

    FOR obligacion_id IN (
      SELECT o.id
      FROM obligaciones o
      JOIN obligaciones_catalogo c ON o.catalogo_id = c.id
      WHERE o.empresa_id = NEW.empresa_id
        AND c.programa = NEW.programa
        AND o.activa = true
    ) LOOP
      PERFORM generar_ocurrencias_obligacion(obligacion_id);
    END LOOP;

    INSERT INTO obligaciones (
      empresa_id, catalogo_id, categoria, nombre, descripcion,
      articulos, presentacion, fecha_vencimiento, estado, activa, created_by
    )
    SELECT
      NEW.empresa_id,
      c.id,
      c.categoria,
      c.nombre,
      c.descripcion,
      c.articulos,
      c.presentacion,
      make_date(
        EXTRACT(YEAR FROM CURRENT_DATE)::int,
        COALESCE(c.mes_vencimiento, 1),
        LEAST(COALESCE(c.dia_vencimiento, 1), 28)
      ),
      'vigente',
      true,
      auth.uid()
    FROM obligaciones_catalogo c
    WHERE c.activo = true
      AND c.programa = NEW.programa
      AND NOT EXISTS (
        SELECT 1 FROM obligaciones o
        WHERE o.empresa_id = NEW.empresa_id
          AND o.catalogo_id = c.id
      )
    ON CONFLICT (empresa_id, catalogo_id, fecha_vencimiento)
      WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL
      DO NOTHING;

    FOR obligacion_id IN (
      SELECT o.id
      FROM obligaciones o
      JOIN obligaciones_catalogo c ON o.catalogo_id = c.id
      WHERE o.empresa_id = NEW.empresa_id
        AND c.programa = NEW.programa
        AND o.activa = true
    ) LOOP
      PERFORM generar_ocurrencias_obligacion(obligacion_id);
    END LOOP;

    RETURN NEW;
  END;
  $function$;

DROP TRIGGER IF EXISTS trg_empresa_programas_generar ON public.empresa_programas;
CREATE TRIGGER trg_empresa_programas_generar
  AFTER INSERT OR UPDATE OF activo ON public.empresa_programas
  FOR EACH ROW EXECUTE FUNCTION public.trg_generar_ocurrencias_empresa_programa();


-- =============================================================================
-- LINAJE B — MUERTO. NO EXISTE EN LA BASE. NO DISEÑAR SOBRE ESTO.
-- =============================================================================
-- La migración 20260430000000_empresa_programas.sql del repo declara estas
-- funciones que NUNCA se aplicaron a la base y NO están vivas:
--
--   * public.generar_obligaciones_empresa_programa(uuid, text, integer)
--   * public.generar_obligaciones_todos_programas_activos(integer)
--   * public.ultimo_dia_habil(integer, integer)
--   * cron.schedule('generar-obligaciones-anual', ...)  -- no existe cron alguno
--
-- El motor REAL es el de arriba (generar_ocurrencias_obligacion +
-- trg_generar_ocurrencias_empresa_programa). Si el futuro necesita
-- "último día hábil" o generación por-programa canónica, se rediseña desde el
-- estado vivo — NO se resucita el linaje B.
-- =============================================================================

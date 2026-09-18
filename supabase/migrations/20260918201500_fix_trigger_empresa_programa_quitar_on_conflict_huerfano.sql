-- El ON CONFLICT de esta funcion apuntaba al indice idx_obligaciones_unique_mes,
-- que no existe en esta base (su migracion, 20260429000000, nunca se aplico).
-- Postgres valida el conflict target al planear, asi que cualquier INSERT en
-- empresa_programas con activo = true fallaba con 42P10 (there is no unique or
-- exclusion constraint matching the ON CONFLICT specification), para todos los
-- programas, no solo padron_sectorial. Ultima alta exitosa: 2026-07-22.
--
-- Se elimina la clausula. El INSERT ya trae un guard NOT EXISTS por
-- (empresa_id, catalogo_id) que es mas estricto que el conflict target, asi que
-- la proteccion contra duplicados se conserva.
--
-- No se recrea el indice a proposito: 20260721100001_fase2_backfill.sql lo
-- elimina deliberadamente porque la unicidad ahora vive en las ocurrencias.
CREATE OR REPLACE FUNCTION public.trg_generar_ocurrencias_empresa_programa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      );

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

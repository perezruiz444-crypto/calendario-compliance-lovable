-- =============================================================================
-- FASE 1 — Bugs del motor independientes del modelo objetivo
-- =============================================================================
-- (a) Sacar del calendario las ocurrencias de catálogos EVENTUAL sembradas por
--     un seed viejo (created_by NULL, fechas de relleno como 2026-01-01). Hoy
--     aparecen en el calendario de los usuarios porque están activa=true.
-- (c) Dejar UNA sola clave de deduplicación canónica: año-mes.
--
-- Nada de esto regenera ni mueve ocurrencias existentes.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- (a) EVENTUAL fuera del calendario — desactivar, NO borrar (preserva
--     trazabilidad). Se excluye explícitamente cualquier ocurrencia que ya
--     tenga un cumplimiento registrado: esas NO se tocan.
-- -----------------------------------------------------------------------------
UPDATE public.obligaciones o
SET activa = false
FROM public.obligaciones_catalogo c
WHERE o.catalogo_id = c.id
  AND c.frecuencia_tipo = 'EVENTUAL'
  AND o.activa = true
  AND NOT EXISTS (
    SELECT 1 FROM public.obligacion_cumplimientos cu
    WHERE cu.obligacion_id = o.id
  );


-- -----------------------------------------------------------------------------
-- (c) Deduplicación canónica: AÑO-MES.
--
--     DECISIÓN DE DOMINIO: ninguna obligación de comercio exterior vence más de
--     una vez en un mismo mes (confirmado con el usuario). Por tanto la clave
--     única correcta es (empresa_id, catalogo_id, año, mes), no la fecha
--     completa. Se elimina el índice redundante por fecha-completa y se alinea
--     el ON CONFLICT del trigger a la clave año-mes, para que función, trigger e
--     índice usen una sola regla consistente.
--
--     NOTA DE CONSECUENCIA (conocida): con año-mes como clave única, cualquier
--     recurrencia SUB-MENSUAL (p. ej. semanal) es inviable — dos ocurrencias del
--     mismo catálogo en un mes colapsan a una. Es aceptable porque hoy ninguna
--     obligación real lo requiere. Si en Fase 2 alguna naturaleza de ítem
--     necesitara recurrencia sub-mensual, habría que revisitar esta decisión.
-- -----------------------------------------------------------------------------

-- Índice redundante por fecha completa: el de año-mes (idx_obligaciones_unique_mes)
-- es el canónico y más estricto.
DROP INDEX IF EXISTS public.obligaciones_unique_empresa_catalogo_fecha;

-- Alinear el ON CONFLICT del trigger a la clave año-mes (antes usaba
-- fecha_vencimiento completa, inconsistente con la función y el índice).
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
    -- Clave canónica año-mes (antes: (empresa_id, catalogo_id, fecha_vencimiento)).
    ON CONFLICT (empresa_id, catalogo_id, (EXTRACT(year FROM fecha_vencimiento)), (EXTRACT(month FROM fecha_vencimiento)))
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

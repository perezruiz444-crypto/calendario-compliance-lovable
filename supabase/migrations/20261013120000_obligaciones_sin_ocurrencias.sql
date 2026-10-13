-- Obligaciones que no se podían marcar (2026-10-13).
-- Aplicada en producción vía MCP; re-ejecutable.
--   a) Desmarcar/corregir fallaba siempre: UNIQUE (obligacion_id, periodo_key) chocaba con el modelo
--      append-only de corregir_cumplimiento (inserta una fila nueva del mismo periodo). Ahora es único solo
--      entre filas vigentes.
--   b) Eventuales sin fecha (antes 1-ene → salían vencidas).
--   c) "Opinión positiva", "Artículo 69 del CFF" y "Buzón tributario" para todas las empresas.
--   d) Johnson y Xinquan: registrar IMMEX y PROSEC.
--   e) Obligaciones manuales sin ocurrencias: portar marcas a su gemela del catálogo y desactivarlas,
--      o ligarlas al catálogo si no hay gemela.

-- a) Unicidad solo entre cumplimientos vigentes
ALTER TABLE public.obligacion_cumplimientos
  DROP CONSTRAINT IF EXISTS obligacion_cumplimientos_obligacion_id_periodo_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS obligacion_cumplimientos_vigente_unico
  ON public.obligacion_cumplimientos (obligacion_id, periodo_key) WHERE vigente;

-- b) Eventuales sin fecha de vencimiento
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
      CASE WHEN c.frecuencia_tipo = 'EVENTUAL' THEN NULL ELSE make_date(
        EXTRACT(YEAR FROM CURRENT_DATE)::int,
        COALESCE(c.mes_vencimiento, 1),
        LEAST(COALESCE(c.dia_vencimiento, 1), 28)
      ) END,
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

UPDATE public.obligaciones o
   SET fecha_vencimiento = NULL
  FROM public.obligaciones_catalogo c
 WHERE o.catalogo_id = c.id
   AND c.frecuencia_tipo = 'EVENTUAL'
   AND o.fecha_vencimiento IS NOT NULL;

-- c) Obligaciones base (programa 'general' obligatorias) para todas las empresas
UPDATE public.obligaciones_catalogo
   SET obligatorio = true
 WHERE programa = 'general'
   AND nombre IN ('Opinión positiva', 'Artículo 69 del CFF', 'Buzón tributario');

CREATE OR REPLACE FUNCTION public.asignar_obligaciones_base(p_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- El trigger trg_generar_ocurrencias (AFTER INSERT en obligaciones) genera las ocurrencias
  INSERT INTO obligaciones (
    empresa_id, catalogo_id, categoria, nombre, descripcion,
    articulos, presentacion, fecha_vencimiento, estado, activa, created_by
  )
  SELECT
    p_empresa_id, c.id, c.categoria, c.nombre, c.descripcion,
    c.articulos, c.presentacion,
    CASE WHEN c.frecuencia_tipo = 'EVENTUAL' THEN NULL ELSE make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::int,
      COALESCE(c.mes_vencimiento, 1),
      LEAST(COALESCE(c.dia_vencimiento, 1), 28)
    ) END,
    'vigente', true, auth.uid()
  FROM obligaciones_catalogo c
  WHERE c.programa = 'general' AND c.obligatorio AND c.activo
    AND NOT EXISTS (
      SELECT 1 FROM obligaciones o
      WHERE o.empresa_id = p_empresa_id AND o.catalogo_id = c.id
    );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.asignar_obligaciones_base(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_asignar_obligaciones_base()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.asignar_obligaciones_base(NEW.id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_empresas_obligaciones_base ON public.empresas;
CREATE TRIGGER trg_empresas_obligaciones_base
  AFTER INSERT ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.trg_asignar_obligaciones_base();

SELECT public.asignar_obligaciones_base(id) FROM public.empresas;

-- d) Johnson y Xinquan: registrar IMMEX y PROSEC (el trigger crea sus obligaciones del catálogo)
INSERT INTO public.empresa_programas (empresa_id, programa)
SELECT e.id, p.programa
FROM public.empresas e
CROSS JOIN (VALUES ('immex'), ('prosec')) AS p(programa)
WHERE e.id IN ('beb4759d-7dcd-479b-9bde-8180fb343767',  -- JOHNSON ELECTRIC GROUP MÉXICO
               '8ab96943-8866-40d9-8c13-c75ae2aaefc8')  -- XINQUAN MEXICO AUTOMOTIVE TRIM
  AND NOT EXISTS (
    SELECT 1 FROM public.empresa_programas ep
    WHERE ep.empresa_id = e.id AND ep.programa = p.programa
  );

-- e) Manuales sin ocurrencias
DO $$
DECLARE
  v_leg  record;
  v_twin uuid;
  v_cat  uuid;
BEGIN
  FOR v_leg IN
    SELECT o.* FROM public.obligaciones o
    WHERE o.activa AND o.catalogo_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.obligacion_ocurrencias oc WHERE oc.obligacion_id = o.id)
  LOOP
    SELECT o2.id INTO v_twin
      FROM public.obligaciones o2
     WHERE o2.empresa_id = v_leg.empresa_id AND o2.id <> v_leg.id AND o2.activa
       AND o2.catalogo_id IS NOT NULL
       AND lower(o2.nombre) = lower(v_leg.nombre)
     ORDER BY o2.created_at
     LIMIT 1;

    IF v_twin IS NOT NULL THEN
      -- Portar marcas cuyo periodo coincide con una ocurrencia de la gemela
      INSERT INTO public.obligacion_cumplimientos
        (obligacion_id, ocurrencia_id, empresa_id, periodo_key, completada, completada_por,
         completada_en, notas, evidencia_url, vigente)
      SELECT v_twin, oc.id, c.empresa_id, c.periodo_key, c.completada, c.completada_por,
             c.completada_en, c.notas, c.evidencia_url, true
        FROM public.obligacion_cumplimientos c
        JOIN public.obligacion_ocurrencias oc
          ON oc.obligacion_id = v_twin AND oc.periodo_key = c.periodo_key
       WHERE c.obligacion_id = v_leg.id AND c.vigente
         AND NOT EXISTS (
           SELECT 1 FROM public.obligacion_cumplimientos x
            WHERE x.obligacion_id = v_twin AND x.periodo_key = c.periodo_key AND x.vigente);

      UPDATE public.obligaciones SET activa = false WHERE id = v_leg.id;
    ELSE
      SELECT c.id INTO v_cat
        FROM public.obligaciones_catalogo c
       WHERE lower(c.nombre) = lower(v_leg.nombre) AND c.activo
       ORDER BY (c.programa = v_leg.categoria) DESC, c.created_at
       LIMIT 1;
      IF v_cat IS NOT NULL THEN
        UPDATE public.obligaciones SET catalogo_id = v_cat WHERE id = v_leg.id;
        PERFORM public.generar_ocurrencias_obligacion(v_leg.id);
        -- Sus marcas viejas quedan ligadas a la ocurrencia del mismo periodo
        UPDATE public.obligacion_cumplimientos c
           SET ocurrencia_id = oc.id
          FROM public.obligacion_ocurrencias oc
         WHERE c.obligacion_id = v_leg.id AND c.ocurrencia_id IS NULL
           AND oc.obligacion_id = v_leg.id AND oc.periodo_key = c.periodo_key;
      END IF;
    END IF;
  END LOOP;
END $$;

-- f) Catálogo: el "Reporte anual" de IMMEX estaba como EVENTUAL aunque vence el 15 de abril
UPDATE public.obligaciones_catalogo SET frecuencia_tipo = 'ANUAL'
 WHERE programa = 'immex' AND nombre = 'Reporte anual' AND frecuencia_tipo = 'EVENTUAL'
   AND dia_vencimiento IS NOT NULL AND mes_vencimiento IS NOT NULL;

UPDATE public.obligaciones o
   SET fecha_vencimiento = make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, c.mes_vencimiento, LEAST(c.dia_vencimiento, 28))
  FROM public.obligaciones_catalogo c
 WHERE o.catalogo_id = c.id AND c.programa = 'immex' AND c.nombre = 'Reporte anual' AND o.fecha_vencimiento IS NULL;

SELECT public.generar_ocurrencias_obligacion(o.id)
  FROM public.obligaciones o JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
 WHERE c.programa = 'immex' AND c.nombre = 'Reporte anual' AND o.activa;

-- g) corregir_cumplimiento: dar de baja la fila vigente ANTES de insertar la nueva
--    (con el índice único parcial WHERE vigente, el orden anterior también chocaba)
CREATE OR REPLACE FUNCTION public.corregir_cumplimiento(p_cumplimiento_id uuid, p_completada boolean, p_notas text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old public.obligacion_cumplimientos%ROWTYPE;
  v_new_id uuid;
BEGIN
  SELECT * INTO v_old FROM public.obligacion_cumplimientos WHERE id = p_cumplimiento_id AND vigente = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cumplimiento % no existe o ya fue reemplazado', p_cumplimiento_id;
  END IF;

  IF NOT (
    public.puede_gestionar_empresa(v_old.empresa_id)
    OR (public.has_role(auth.uid(), 'cliente') AND v_old.empresa_id = public.get_my_empresa_id())
  ) THEN
    RAISE EXCEPTION 'Sin permiso para corregir este cumplimiento' USING ERRCODE = '42501';
  END IF;

  UPDATE public.obligacion_cumplimientos SET vigente = false WHERE id = p_cumplimiento_id;

  INSERT INTO public.obligacion_cumplimientos
    (obligacion_id, ocurrencia_id, empresa_id, periodo_key, completada, completada_por, notas, evidencia_url, vigente)
  VALUES
    (v_old.obligacion_id, v_old.ocurrencia_id, v_old.empresa_id, v_old.periodo_key,
     p_completada, auth.uid(), coalesce(p_notas, v_old.notas), v_old.evidencia_url, true)
  RETURNING id INTO v_new_id;

  UPDATE public.obligacion_cumplimientos SET reemplazado_por = v_new_id WHERE id = p_cumplimiento_id;

  RETURN v_new_id;
END;
$function$;

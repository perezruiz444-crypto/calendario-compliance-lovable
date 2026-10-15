-- Obligaciones por tipo, reglas versionadas y seguimiento compatible.
-- NO aplicada en producción todavía. Primero validar en un entorno de prueba;
-- después aplicar esta migración aditiva y publicar los lectores compatibles.
-- No reclasifica el catálogo, no cambia fechas ni genera/desactiva registros.
BEGIN;

CREATE OR REPLACE FUNCTION public.obligacion_v2_es_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador'
  );
$$;

CREATE OR REPLACE FUNCTION public.obligacion_v2_puede_leer(p_obligacion_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.obligaciones o WHERE o.id = p_obligacion_id AND (
      public.obligacion_v2_es_admin()
      OR EXISTS (SELECT 1 FROM public.user_roles r JOIN public.profiles p ON p.id = r.user_id
        WHERE r.user_id = auth.uid() AND r.role = 'cliente' AND p.empresa_id = o.empresa_id)
      OR EXISTS (SELECT 1 FROM public.user_roles r JOIN public.consultor_empresa_asignacion a ON a.consultor_id = r.user_id
        WHERE r.user_id = auth.uid() AND r.role = 'consultor' AND a.empresa_id = o.empresa_id)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.obligacion_v2_puede_registrar(p_obligacion_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.obligacion_v2_puede_leer(p_obligacion_id) AND EXISTS (
    SELECT 1 FROM public.obligaciones o WHERE o.id = p_obligacion_id AND o.activa AND (
      public.obligacion_v2_es_admin()
      OR EXISTS (SELECT 1 FROM public.user_roles r JOIN public.consultor_empresa_asignacion a ON a.consultor_id = r.user_id
        WHERE r.user_id = auth.uid() AND r.role = 'consultor' AND a.empresa_id = o.empresa_id)
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.role='cliente' AND (
        to_jsonb(o)->>'responsable_id'=auth.uid()::text OR EXISTS(SELECT 1 FROM public.obligacion_responsables a WHERE a.user_id=auth.uid() AND a.obligacion_id=o.id)))
    )
  );
$$;
REVOKE ALL ON FUNCTION public.obligacion_v2_es_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.obligacion_v2_puede_leer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.obligacion_v2_puede_registrar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obligacion_v2_es_admin(), public.obligacion_v2_puede_leer(uuid), public.obligacion_v2_puede_registrar(uuid) TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS obligaciones_id_empresa_v2 ON public.obligaciones(id, empresa_id);
CREATE UNIQUE INDEX IF NOT EXISTS ocurrencias_identidad_v2 ON public.obligacion_ocurrencias(id, obligacion_id, empresa_id);

CREATE TABLE IF NOT EXISTS public.obligacion_reglas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogo_id uuid REFERENCES public.obligaciones_catalogo(id),
  obligacion_id uuid REFERENCES public.obligaciones(id),
  version integer NOT NULL CHECK (version > 0),
  tipo_control text NOT NULL CHECK (tipo_control IN ('periodica','vigencia','evento','condicion','riesgo')),
  origen_control text NOT NULL CHECK (origen_control IN ('normativo','interno','mixto')),
  clasificacion_estado text NOT NULL DEFAULT 'propuesta' CHECK (clasificacion_estado IN ('propuesta','aprobada')),
  normativa_estado text NOT NULL DEFAULT 'pendiente' CHECK (normativa_estado IN ('pendiente','validada')),
  aplicabilidad jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(aplicabilidad) = 'object'),
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(parametros) = 'object'),
  fuente_url text,
  fuente_referencia text,
  validada_por uuid REFERENCES auth.users(id),
  validada_en timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obligacion_reglas_propietario CHECK ((catalogo_id IS NULL) <> (obligacion_id IS NULL)),
  CONSTRAINT obligacion_reglas_validacion CHECK (normativa_estado <> 'validada' OR (
    clasificacion_estado = 'aprobada' AND validada_por IS NOT NULL AND validada_en IS NOT NULL
    AND nullif(btrim(fuente_referencia),'') IS NOT NULL AND nullif(btrim(fuente_url),'') IS NOT NULL
  )),
  UNIQUE(catalogo_id, version), UNIQUE(obligacion_id, version)
);

CREATE TABLE IF NOT EXISTS public.obligacion_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  obligacion_id uuid NOT NULL,
  tipo_evento text NOT NULL CHECK (nullif(btrim(tipo_evento),'') IS NOT NULL),
  fecha_evento date NOT NULL,
  evidencia_path text,
  creado_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(obligacion_id,empresa_id) REFERENCES public.obligaciones(id,empresa_id),
  UNIQUE(empresa_id,idempotency_key), UNIQUE(id,obligacion_id,empresa_id),
  CHECK(evidencia_path IS NULL OR split_part(evidencia_path,'/',1) = empresa_id::text)
);

CREATE TABLE IF NOT EXISTS public.obligacion_revisiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  obligacion_id uuid NOT NULL,
  resultado text NOT NULL CHECK (resultado IN ('verificada','requiere_atencion','no_aplica')),
  revisada_en timestamptz NOT NULL DEFAULT now(),
  revisada_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  evidencia_path text,
  notas text,
  proxima_revision date,
  FOREIGN KEY(obligacion_id,empresa_id) REFERENCES public.obligaciones(id,empresa_id),
  CHECK(resultado <> 'no_aplica' OR nullif(btrim(notas),'') IS NOT NULL),
  CHECK(evidencia_path IS NULL OR split_part(evidencia_path,'/',1) = empresa_id::text),
  CHECK(proxima_revision IS NULL OR proxima_revision >= (revisada_en AT TIME ZONE 'America/Mexico_City')::date)
);
CREATE INDEX IF NOT EXISTS obligacion_revisiones_ultima_v2 ON public.obligacion_revisiones(obligacion_id, revisada_en DESC, id);

CREATE TABLE IF NOT EXISTS public.obligacion_relaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  obligacion_origen_id uuid NOT NULL,
  obligacion_destino_id uuid NOT NULL,
  tipo text NOT NULL CHECK(tipo IN ('control','riesgo','evidencia_compartida')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(obligacion_origen_id,empresa_id) REFERENCES public.obligaciones(id,empresa_id),
  FOREIGN KEY(obligacion_destino_id,empresa_id) REFERENCES public.obligaciones(id,empresa_id),
  CHECK(obligacion_origen_id <> obligacion_destino_id),
  UNIQUE(obligacion_origen_id,obligacion_destino_id,tipo)
);

ALTER TABLE public.obligacion_ocurrencias
  ADD COLUMN IF NOT EXISTS regla_id uuid REFERENCES public.obligacion_reglas(id),
  ADD COLUMN IF NOT EXISTS regla_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS evento_id uuid REFERENCES public.obligacion_eventos(id),
  ADD COLUMN IF NOT EXISTS origen_fecha text NOT NULL DEFAULT 'heredada',
  ADD COLUMN IF NOT EXISTS fecha_objetivo_interna date;
ALTER TABLE public.obligacion_cumplimientos
  ADD COLUMN IF NOT EXISTS evento_id uuid REFERENCES public.obligacion_eventos(id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ocurrencias_origen_fecha_v2' AND conrelid = 'public.obligacion_ocurrencias'::regclass) THEN
    ALTER TABLE public.obligacion_ocurrencias ADD CONSTRAINT ocurrencias_origen_fecha_v2 CHECK(origen_fecha IN ('normativa','interna','heredada'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ocurrencias_evento_empresa_v2' AND conrelid = 'public.obligacion_ocurrencias'::regclass) THEN
    ALTER TABLE public.obligacion_ocurrencias ADD CONSTRAINT ocurrencias_evento_empresa_v2 FOREIGN KEY(evento_id,obligacion_id,empresa_id) REFERENCES public.obligacion_eventos(id,obligacion_id,empresa_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cumplimientos_evento_empresa_v2' AND conrelid = 'public.obligacion_cumplimientos'::regclass) THEN
    ALTER TABLE public.obligacion_cumplimientos ADD CONSTRAINT cumplimientos_evento_empresa_v2 FOREIGN KEY(evento_id,obligacion_id,empresa_id) REFERENCES public.obligacion_eventos(id,obligacion_id,empresa_id) NOT VALID;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS cumplimientos_evento_vigente_v2 ON public.obligacion_cumplimientos(evento_id) WHERE vigente AND evento_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.obligacion_v2_regla_inmutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.clasificacion_estado = 'aprobada' OR OLD.normativa_estado = 'validada' THEN
    RAISE EXCEPTION 'Crear otra versión; una regla aprobada conserva su historial' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS obligacion_reglas_inmutable_v2 ON public.obligacion_reglas;
CREATE TRIGGER obligacion_reglas_inmutable_v2 BEFORE UPDATE OR DELETE ON public.obligacion_reglas FOR EACH ROW EXECUTE FUNCTION public.obligacion_v2_regla_inmutable();

CREATE OR REPLACE FUNCTION public.obligacion_v2_solo_append()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'El seguimiento conserva su historial; registrar una nueva entrada' USING ERRCODE = '23514';
END $$;
DROP TRIGGER IF EXISTS obligacion_eventos_append_v2 ON public.obligacion_eventos;
CREATE TRIGGER obligacion_eventos_append_v2 BEFORE UPDATE OR DELETE ON public.obligacion_eventos FOR EACH ROW EXECUTE FUNCTION public.obligacion_v2_solo_append();
DROP TRIGGER IF EXISTS obligacion_revisiones_append_v2 ON public.obligacion_revisiones;
CREATE TRIGGER obligacion_revisiones_append_v2 BEFORE UPDATE OR DELETE ON public.obligacion_revisiones FOR EACH ROW EXECUTE FUNCTION public.obligacion_v2_solo_append();

CREATE OR REPLACE FUNCTION public.obligacion_v2_validar_cumplimiento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_evento public.obligacion_eventos%ROWTYPE; v_oc public.obligacion_ocurrencias%ROWTYPE; v_empresa uuid;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.obligaciones WHERE id = NEW.obligacion_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Obligación inexistente' USING ERRCODE='23503'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.obligacion_v2_puede_registrar(NEW.obligacion_id) THEN
    RAISE EXCEPTION 'Sin permiso sobre la obligación' USING ERRCODE='42501';
  END IF;
  -- Compatibilidad: completar empresa_id legado vacío con su padre, nunca confiar en un ID del navegador.
  IF NEW.empresa_id IS NULL THEN NEW.empresa_id := v_empresa; END IF;
  IF NEW.empresa_id IS DISTINCT FROM v_empresa THEN
    RAISE EXCEPTION 'Cumplimiento y obligación pertenecen a empresas distintas' USING ERRCODE='23514';
  END IF;
  IF NEW.ocurrencia_id IS NOT NULL THEN
    SELECT * INTO v_oc FROM public.obligacion_ocurrencias WHERE id=NEW.ocurrencia_id;
    IF NOT FOUND OR v_oc.empresa_id IS DISTINCT FROM NEW.empresa_id OR v_oc.obligacion_id IS DISTINCT FROM NEW.obligacion_id
      OR v_oc.periodo_key IS DISTINCT FROM NEW.periodo_key THEN
      RAISE EXCEPTION 'Periodo u ocurrencia no corresponden a la obligación' USING ERRCODE='23514';
    END IF;
  END IF;
  IF auth.uid() IS NOT NULL AND TG_OP='INSERT' THEN NEW.completada_por := auth.uid(); END IF;
  IF NEW.evidencia_url IS NOT NULL AND (TG_OP='INSERT' OR NEW.evidencia_url IS DISTINCT FROM OLD.evidencia_url)
    AND split_part(NEW.evidencia_url,'/',1) IS DISTINCT FROM NEW.empresa_id::text
    AND NOT EXISTS (SELECT 1 FROM public.obligacion_cumplimientos c WHERE c.obligacion_id=NEW.obligacion_id AND c.empresa_id=NEW.empresa_id AND c.evidencia_url=NEW.evidencia_url) THEN
    RAISE EXCEPTION 'Evidencia fuera de la empresa' USING ERRCODE='23514';
  END IF;
  IF NEW.evento_id IS NULL THEN
    IF NEW.periodo_key LIKE 'evento:%' THEN RAISE EXCEPTION 'El periodo de evento requiere su referencia' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO v_evento FROM public.obligacion_eventos WHERE id = NEW.evento_id;
  IF NOT FOUND OR NEW.empresa_id IS DISTINCT FROM v_evento.empresa_id OR NEW.obligacion_id IS DISTINCT FROM v_evento.obligacion_id THEN
    RAISE EXCEPTION 'Evento y cumplimiento no corresponden a la misma obligación/empresa' USING ERRCODE='23514';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.obligacion_v2_puede_registrar(NEW.obligacion_id) THEN
    RAISE EXCEPTION 'Sin permiso sobre la obligación' USING ERRCODE='42501';
  END IF;
  IF NEW.ocurrencia_id IS NULL THEN
    IF NEW.periodo_key IS DISTINCT FROM 'evento:' || NEW.evento_id::text THEN
      RAISE EXCEPTION 'Periodo del evento incorrecto' USING ERRCODE='23514';
    END IF;
  ELSE
    SELECT * INTO v_oc FROM public.obligacion_ocurrencias WHERE id=NEW.ocurrencia_id;
    IF NOT FOUND OR v_oc.evento_id IS DISTINCT FROM NEW.evento_id OR v_oc.empresa_id IS DISTINCT FROM NEW.empresa_id
      OR v_oc.obligacion_id IS DISTINCT FROM NEW.obligacion_id OR v_oc.periodo_key IS DISTINCT FROM NEW.periodo_key THEN
      RAISE EXCEPTION 'Ocurrencia y evento no corresponden' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cumplimientos_validar_evento_v2 ON public.obligacion_cumplimientos;
CREATE TRIGGER cumplimientos_validar_evento_v2 BEFORE INSERT OR UPDATE ON public.obligacion_cumplimientos FOR EACH ROW EXECUTE FUNCTION public.obligacion_v2_validar_cumplimiento();
REVOKE ALL ON FUNCTION public.obligacion_v2_regla_inmutable(), public.obligacion_v2_solo_append(), public.obligacion_v2_validar_cumplimiento() FROM PUBLIC,anon,authenticated;

ALTER TABLE public.obligacion_reglas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligacion_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligacion_revisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligacion_relaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.obligacion_reglas,public.obligacion_eventos,public.obligacion_revisiones,public.obligacion_relaciones FROM anon,authenticated;
GRANT SELECT ON public.obligacion_reglas,public.obligacion_eventos,public.obligacion_revisiones,public.obligacion_relaciones TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.obligacion_reglas TO authenticated;
GRANT INSERT,DELETE ON public.obligacion_relaciones TO authenticated;
-- Eventos y revisiones solo admiten escrituras a través de las RPC del bloque B.
-- No dar acceso INSERT directo al navegador para saltarse validaciones.

DROP POLICY IF EXISTS reglas_read_v2 ON public.obligacion_reglas;
CREATE POLICY reglas_read_v2 ON public.obligacion_reglas FOR SELECT TO authenticated USING (
  public.obligacion_v2_es_admin() OR (clasificacion_estado='aprobada' AND (
    (obligacion_id IS NOT NULL AND public.obligacion_v2_puede_leer(obligacion_id))
    OR EXISTS (SELECT 1 FROM public.obligaciones o WHERE o.catalogo_id=obligacion_reglas.catalogo_id AND public.obligacion_v2_puede_leer(o.id))
  ))
);
DROP POLICY IF EXISTS reglas_insert_v2 ON public.obligacion_reglas;
CREATE POLICY reglas_insert_v2 ON public.obligacion_reglas FOR INSERT TO authenticated WITH CHECK(public.obligacion_v2_es_admin() AND created_by=auth.uid() AND (validada_por IS NULL OR validada_por=auth.uid()));
DROP POLICY IF EXISTS reglas_update_v2 ON public.obligacion_reglas;
CREATE POLICY reglas_update_v2 ON public.obligacion_reglas FOR UPDATE TO authenticated USING(public.obligacion_v2_es_admin()) WITH CHECK(public.obligacion_v2_es_admin() AND (validada_por IS NULL OR validada_por=auth.uid()));
DROP POLICY IF EXISTS reglas_delete_v2 ON public.obligacion_reglas;
CREATE POLICY reglas_delete_v2 ON public.obligacion_reglas FOR DELETE TO authenticated USING(public.obligacion_v2_es_admin());
DROP POLICY IF EXISTS eventos_read_v2 ON public.obligacion_eventos;
CREATE POLICY eventos_read_v2 ON public.obligacion_eventos FOR SELECT TO authenticated USING(public.obligacion_v2_puede_leer(obligacion_id));
DROP POLICY IF EXISTS revisiones_read_v2 ON public.obligacion_revisiones;
CREATE POLICY revisiones_read_v2 ON public.obligacion_revisiones FOR SELECT TO authenticated USING(public.obligacion_v2_puede_leer(obligacion_id));
DROP POLICY IF EXISTS relaciones_read_v2 ON public.obligacion_relaciones;
CREATE POLICY relaciones_read_v2 ON public.obligacion_relaciones FOR SELECT TO authenticated USING(public.obligacion_v2_puede_leer(obligacion_origen_id) AND public.obligacion_v2_puede_leer(obligacion_destino_id));
DROP POLICY IF EXISTS relaciones_insert_v2 ON public.obligacion_relaciones;
CREATE POLICY relaciones_insert_v2 ON public.obligacion_relaciones FOR INSERT TO authenticated WITH CHECK(public.obligacion_v2_es_admin() AND created_by=auth.uid());
DROP POLICY IF EXISTS relaciones_delete_v2 ON public.obligacion_relaciones;
CREATE POLICY relaciones_delete_v2 ON public.obligacion_relaciones FOR DELETE TO authenticated USING(public.obligacion_v2_es_admin());

-- Corregir conserva también el evento. La versión anterior no copiaba este nuevo campo.
CREATE OR REPLACE FUNCTION public.corregir_cumplimiento(
  p_cumplimiento_id uuid, p_completada boolean, p_notas text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_old public.obligacion_cumplimientos%ROWTYPE; v_new_id uuid;
BEGIN
  SELECT * INTO v_old FROM public.obligacion_cumplimientos
    WHERE id=p_cumplimiento_id AND vigente=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El registro ya fue reemplazado o no existe' USING ERRCODE='23514'; END IF;
  IF NOT public.obligacion_v2_puede_registrar(v_old.obligacion_id) THEN
    RAISE EXCEPTION 'Sin permiso para corregir este cumplimiento' USING ERRCODE='42501';
  END IF;
  UPDATE public.obligacion_cumplimientos SET vigente=false WHERE id=v_old.id;
  INSERT INTO public.obligacion_cumplimientos
    (obligacion_id,ocurrencia_id,evento_id,empresa_id,periodo_key,completada,completada_por,notas,evidencia_url,vigente)
  VALUES(v_old.obligacion_id,v_old.ocurrencia_id,v_old.evento_id,v_old.empresa_id,v_old.periodo_key,
    p_completada,auth.uid(),coalesce(p_notas,v_old.notas),v_old.evidencia_url,true) RETURNING id INTO v_new_id;
  UPDATE public.obligacion_cumplimientos SET reemplazado_por=v_new_id WHERE id=v_old.id;
  RETURN v_new_id;
END $$;
REVOKE ALL ON FUNCTION public.corregir_cumplimiento(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.corregir_cumplimiento(uuid,boolean,text) TO authenticated;
COMMIT;

-- Revisiones y eventos reales. Despliegue con migración base de tipos primero.
BEGIN;
-- Cumplir un periodo no completa para siempre la obligación padre.
DROP TRIGGER IF EXISTS trg_marcar_obligacion_cumplida ON public.obligacion_cumplimientos;
CREATE OR REPLACE FUNCTION public.obligacion_v2_tipo(p_obligacion_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT r.tipo_control FROM public.obligacion_reglas r
 JOIN public.obligaciones o ON o.id=p_obligacion_id
 WHERE r.clasificacion_estado='aprobada' AND (r.obligacion_id=o.id OR r.catalogo_id=o.catalogo_id)
 ORDER BY (r.obligacion_id=o.id) DESC NULLS LAST,r.version DESC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.obligacion_v2_tipo(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.obligacion_v2_validar_soporte(p_empresa uuid,p_obligacion uuid,p_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF p_path IS NULL THEN RETURN; END IF;
 IF split_part(p_path,'/',1)<>p_empresa::text OR split_part(p_path,'/',2)<>p_obligacion::text
  OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='evidencias-cumplimiento' AND name=p_path) THEN
  RAISE EXCEPTION 'La evidencia no existe o no corresponde a la obligación' USING ERRCODE='23514';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.obligacion_v2_validar_soporte(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.registrar_revision_obligacion(
 p_obligacion_id uuid,p_resultado text,p_notas text DEFAULT NULL,p_evidencia_path text DEFAULT NULL,p_proxima_revision date DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_empresa uuid; v_id uuid;
BEGIN
 IF NOT public.obligacion_v2_puede_registrar(p_obligacion_id) THEN RAISE EXCEPTION 'Sin permiso sobre la obligación' USING ERRCODE='42501'; END IF;
 IF public.obligacion_v2_tipo(p_obligacion_id) IS DISTINCT FROM 'condicion' THEN RAISE EXCEPTION 'La obligación no es una condición' USING ERRCODE='23514'; END IF;
 IF p_resultado NOT IN ('verificada','requiere_atencion','no_aplica') OR p_resultado IS NULL
   OR (p_resultado='no_aplica' AND nullif(btrim(p_notas),'') IS NULL) THEN
  RAISE EXCEPTION 'Resultado o motivo de revisión inválidos' USING ERRCODE='23514';
 END IF;
 IF p_proxima_revision < (now() AT TIME ZONE 'America/Mexico_City')::date THEN RAISE EXCEPTION 'La próxima revisión no puede estar en el pasado' USING ERRCODE='23514'; END IF;
 SELECT empresa_id INTO v_empresa FROM public.obligaciones WHERE id=p_obligacion_id;
 PERFORM public.obligacion_v2_validar_soporte(v_empresa,p_obligacion_id,p_evidencia_path);
 INSERT INTO public.obligacion_revisiones(empresa_id,obligacion_id,resultado,revisada_por,evidencia_path,notas,proxima_revision)
 VALUES(v_empresa,p_obligacion_id,p_resultado,auth.uid(),p_evidencia_path,nullif(btrim(p_notas),''),p_proxima_revision) RETURNING id INTO v_id;
 RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.registrar_evento_obligacion(
 p_obligacion_id uuid,p_tipo_evento text,p_fecha_evento date,p_idempotency_key text,p_evidencia_path text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_empresa uuid; v_old public.obligacion_eventos%ROWTYPE; v_id uuid;
BEGIN
 IF NOT public.obligacion_v2_puede_registrar(p_obligacion_id) THEN RAISE EXCEPTION 'Sin permiso sobre la obligación' USING ERRCODE='42501'; END IF;
 IF p_fecha_evento IS NULL OR p_fecha_evento > (now() AT TIME ZONE 'America/Mexico_City')::date
  OR nullif(btrim(p_tipo_evento),'') IS NULL OR p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 1 AND 200 THEN
  RAISE EXCEPTION 'Fecha de origen, tipo o clave del evento inválidos' USING ERRCODE='23514';
 END IF;
 SELECT empresa_id INTO v_empresa FROM public.obligaciones WHERE id=p_obligacion_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_empresa::text||':'||p_idempotency_key,0));
 SELECT * INTO v_old FROM public.obligacion_eventos WHERE empresa_id=v_empresa AND idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_old.obligacion_id IS DISTINCT FROM p_obligacion_id OR v_old.fecha_evento IS DISTINCT FROM p_fecha_evento
    OR v_old.tipo_evento IS DISTINCT FROM btrim(p_tipo_evento) OR v_old.evidencia_path IS DISTINCT FROM p_evidencia_path THEN
   RAISE EXCEPTION 'La clave ya corresponde a otro evento' USING ERRCODE='23514';
  END IF;
  RETURN v_old.id;
 END IF;
 IF public.obligacion_v2_tipo(p_obligacion_id) IS DISTINCT FROM 'evento' THEN RAISE EXCEPTION 'La obligación no admite eventos' USING ERRCODE='23514'; END IF;
 PERFORM public.obligacion_v2_validar_soporte(v_empresa,p_obligacion_id,p_evidencia_path);
 INSERT INTO public.obligacion_eventos(empresa_id,obligacion_id,tipo_evento,fecha_evento,evidencia_path,creado_por,idempotency_key)
 VALUES(v_empresa,p_obligacion_id,btrim(p_tipo_evento),p_fecha_evento,p_evidencia_path,auth.uid(),p_idempotency_key) RETURNING id INTO v_id;
 -- Sin regla de plazo validada, el evento es una acción visible SIN fecha inventada.
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.registrar_revision_obligacion(uuid,text,text,text,date),public.registrar_evento_obligacion(uuid,text,date,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.registrar_revision_obligacion(uuid,text,text,text,date),public.registrar_evento_obligacion(uuid,text,date,text,text) TO authenticated;
COMMIT;

-- Completar un periodo es una operación atómica y reintentable.
-- Si existe un vigente no cumplido, crea otra versión y conserva su historial.
-- No borra registros ni marca obligaciones al aplicar la migración.
BEGIN;
CREATE OR REPLACE FUNCTION public.registrar_cumplimiento_obligacion(
 p_obligacion_id uuid,p_periodo_key text,p_ocurrencia_id uuid DEFAULT NULL,
 p_evento_id uuid DEFAULT NULL,p_evidencia_path text DEFAULT NULL,p_notas text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_empresa uuid;v_evento uuid:=p_evento_id;v_oc public.obligacion_ocurrencias%ROWTYPE;
 v_old public.obligacion_cumplimientos%ROWTYPE;v_id uuid;v_constraint text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.obligacion_v2_puede_registrar(p_obligacion_id) THEN
  RAISE EXCEPTION 'Sin permiso sobre la obligación' USING ERRCODE='42501';
 END IF;
 IF nullif(btrim(p_periodo_key),'') IS NULL THEN RAISE EXCEPTION 'Falta el periodo' USING ERRCODE='23514'; END IF;
 -- Serializa las entregas de esta obligación; el índice único se conserva.
 SELECT empresa_id INTO v_empresa FROM public.obligaciones WHERE id=p_obligacion_id FOR NO KEY UPDATE;
 IF p_ocurrencia_id IS NOT NULL THEN
  SELECT * INTO v_oc FROM public.obligacion_ocurrencias WHERE id=p_ocurrencia_id;
  IF NOT FOUND OR v_oc.obligacion_id IS DISTINCT FROM p_obligacion_id OR v_oc.empresa_id IS DISTINCT FROM v_empresa
   OR v_oc.periodo_key IS DISTINCT FROM p_periodo_key OR (p_evento_id IS NOT NULL AND v_oc.evento_id IS DISTINCT FROM p_evento_id) THEN
   RAISE EXCEPTION 'El periodo no corresponde a la obligación' USING ERRCODE='23514';
  END IF;
  v_evento:=v_oc.evento_id;
 ELSIF v_evento IS NULL THEN
  RAISE EXCEPTION 'Selecciona un periodo o evento registrado' USING ERRCODE='23514';
 END IF;
 IF v_evento IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.obligacion_eventos WHERE id=v_evento AND obligacion_id=p_obligacion_id AND empresa_id=v_empresa)
   OR (p_ocurrencia_id IS NULL AND p_periodo_key IS DISTINCT FROM 'evento:'||v_evento::text) THEN
   RAISE EXCEPTION 'El evento no corresponde a la obligación' USING ERRCODE='23514';
  END IF;
 END IF;
 PERFORM public.obligacion_v2_validar_soporte(v_empresa,p_obligacion_id,p_evidencia_path);
 FOR attempt IN 1..3 LOOP
  BEGIN
   SELECT * INTO v_old FROM public.obligacion_cumplimientos WHERE obligacion_id=p_obligacion_id AND periodo_key=p_periodo_key AND vigente FOR UPDATE;
   IF FOUND AND v_old.completada AND v_old.ocurrencia_id IS NOT DISTINCT FROM p_ocurrencia_id
    AND v_old.evento_id IS NOT DISTINCT FROM v_evento AND v_old.empresa_id IS NOT DISTINCT FROM v_empresa
    AND (p_evidencia_path IS NULL OR p_evidencia_path=v_old.evidencia_url)
    AND (p_notas IS NULL OR p_notas=v_old.notas) THEN RETURN v_old.id; END IF;
   IF v_old.id IS NOT NULL THEN UPDATE public.obligacion_cumplimientos SET vigente=false WHERE id=v_old.id; END IF;
   INSERT INTO public.obligacion_cumplimientos(obligacion_id,empresa_id,ocurrencia_id,evento_id,periodo_key,completada,completada_por,evidencia_url,notas,vigente)
   VALUES(p_obligacion_id,v_empresa,p_ocurrencia_id,v_evento,p_periodo_key,true,auth.uid(),coalesce(p_evidencia_path,v_old.evidencia_url),coalesce(p_notas,v_old.notas),true) RETURNING id INTO v_id;
   IF v_old.id IS NOT NULL THEN UPDATE public.obligacion_cumplimientos SET reemplazado_por=v_id WHERE id=v_old.id; END IF;
   RETURN v_id;
  EXCEPTION WHEN unique_violation THEN
   GET STACKED DIAGNOSTICS v_constraint=CONSTRAINT_NAME;
   IF v_constraint NOT IN ('obligacion_cumplimientos_vigente_unico','cumplimientos_evento_vigente_v2') THEN RAISE; END IF;
   -- Un cliente legado pudo escribir mientras esperábamos su fila: releer.
  END;
 END LOOP;
 RAISE EXCEPTION 'El cumplimiento cambió durante el guardado. Recarga e intenta de nuevo.' USING ERRCODE='40001';
END $$;
REVOKE ALL ON FUNCTION public.registrar_cumplimiento_obligacion(uuid,text,uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.registrar_cumplimiento_obligacion(uuid,text,uuid,uuid,text,text) TO authenticated;
COMMIT;

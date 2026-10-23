-- Retiro del semestral PROSEC autorizado por el administrador; reversible, sin borrar antecedentes.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_action constant text:='retiro_semestral_prosec_20261023';
 v_actor constant uuid:='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
 v_cat constant uuid:='2f8f6f06-0175-4728-88d0-fab147d34008';
 v_before jsonb; v_marks text; v_occs text; v_reviews text; v_events text; v_others text; v_count integer;
 v_note constant text:='Retiro autorizado por el administrador el 23/10/2026 del informe semestral PROSEC sin sustento acreditado en la cita capturada. Se conserva separado el reporte anual del artículo 8 del Decreto PROSEC. Mantener todos los antecedentes; no trasladar marcas ni declarar cumplimientos nuevos.';
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(v_action));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN RAISE EXCEPTION 'Administrador no encontrado'; END IF;
 PERFORM id FROM public.obligaciones_catalogo WHERE id=v_cat FOR UPDATE;
 PERFORM id FROM public.obligaciones WHERE catalogo_id=v_cat FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.obligaciones_catalogo WHERE id=v_cat AND activo AND nombre='Informe de Utilización PROSEC') THEN RAISE EXCEPTION 'Cambió el catálogo semestral PROSEC'; END IF;
 SELECT count(*) INTO v_count FROM public.obligaciones WHERE catalogo_id=v_cat AND activa;
 IF v_count<>4 THEN RAISE EXCEPTION 'Cambió el alcance semestral PROSEC'; END IF;
 SELECT jsonb_build_object('catalogo',(SELECT to_jsonb(c) FROM public.obligaciones_catalogo c WHERE id=v_cat),'obligaciones',(SELECT jsonb_agg(to_jsonb(o) ORDER BY id) FROM public.obligaciones o WHERE catalogo_id=v_cat)) INTO v_before;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_occs FROM public.obligacion_ocurrencias c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_reviews FROM public.obligacion_revisiones c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_events FROM public.obligacion_eventos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id)::text,'[]')) INTO v_others FROM public.obligaciones o WHERE catalogo_id IS DISTINCT FROM v_cat;
 UPDATE public.obligaciones SET activa=false,notas=concat_ws(E'\n',nullif(notas,''),v_note) WHERE catalogo_id=v_cat AND activa;
 UPDATE public.obligaciones_catalogo SET activo=false,obligatorio=false,notas_internas=concat_ws(E'\n',nullif(notas_internas,''),v_note) WHERE id=v_cat;
 IF EXISTS(SELECT 1 FROM public.obligaciones WHERE catalogo_id=v_cat AND activa)
 OR v_marks IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_occs IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias c)
 OR v_reviews IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_revisiones c)
 OR v_events IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_eventos c)
 OR v_others IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id)::text,'[]')) FROM public.obligaciones o WHERE catalogo_id IS DISTINCT FROM v_cat)
 THEN RAISE EXCEPTION 'Cambió historial, otros registros o falló retiro'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,old_values,new_values)
 VALUES(v_actor,v_action,'obligaciones_catalogo',v_before,jsonb_build_object('estado','retiro_temporal_aplicado','asignaciones_retiradas',v_count,'motivo',v_note,'cumplimientos_hash',v_marks,'ocurrencias_hash',v_occs,'revisiones_hash',v_reviews,'eventos_hash',v_events,'otras_obligaciones_hash',v_others));
END $$;
COMMIT;


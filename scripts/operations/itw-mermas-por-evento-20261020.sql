BEGIN;
DO $$
DECLARE v_ob public.obligaciones%ROWTYPE; v_rule uuid; v_marks text; v_occs text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('itw_mermas_por_evento_20261020'));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action='itw_mermas_por_evento_20261020') THEN RETURN; END IF;
 SELECT * INTO v_ob FROM public.obligaciones WHERE id='fdf0769b-e26b-448a-b981-a814136ead58'
 AND empresa_id='2fe61136-2f8a-48b5-9aef-140ac19b676f' AND catalogo_id='e90d50d6-87b7-4912-a5b5-ff59683c2a03' AND activa FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró el control autorizado de ITW'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_reglas WHERE obligacion_id=v_ob.id AND normativa_estado='validada') THEN RAISE EXCEPTION 'Revisar regla normativa antes de crear excepción'; END IF;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_occs FROM public.obligacion_ocurrencias x;
 INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,fuente_referencia,importacion_referencia,created_by)
 SELECT v_ob.id,coalesce(max(version),0)+1,'evento','mixto','aprobada','pendiente',
 'Clasificación operativa por evento de destrucción autorizada por el administrador. No valida autoridad receptora, fundamento o plazo; no demuestra que haya ocurrido una destrucción.',
 'itw_mermas_por_evento_20261020','f623e0d3-37b5-4ff4-be4f-cc73c99c85c4' FROM public.obligacion_reglas WHERE obligacion_id=v_ob.id RETURNING id INTO v_rule;
 UPDATE public.obligaciones SET presentacion='Por evento de destrucción; fundamento y plazo por validar' WHERE id=v_ob.id;
 IF v_marks IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_occs IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x) THEN RAISE EXCEPTION 'Cambió historial durante clasificación'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,record_id,old_values,new_values)
 VALUES('f623e0d3-37b5-4ff4-be4f-cc73c99c85c4','itw_mermas_por_evento_20261020','obligaciones',v_ob.id,to_jsonb(v_ob),
 jsonb_build_object('tipo','evento','regla_id',v_rule,'normativa','pendiente','cumplimientos_hash',v_marks,'ocurrencias_hash',v_occs,'alcance','Solo ITW'));
END $$;
COMMIT;

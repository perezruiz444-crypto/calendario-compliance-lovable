BEGIN;
DO $$
DECLARE v_ob public.obligaciones%ROWTYPE; v_rule uuid; v_marks text; v_occs text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('itw_registros_automotriz_permanente_20261020'));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action='itw_registros_automotriz_permanente_20261020') THEN RETURN; END IF;
 SELECT * INTO v_ob FROM public.obligaciones WHERE id='bb674725-c1b7-4661-bcea-dd5ccba1a221'
 AND empresa_id='2fe61136-2f8a-48b5-9aef-140ac19b676f' AND catalogo_id='626e558a-cfd2-4676-b18d-eb98da1c4364' AND activa FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró el registro autorizado de ITW'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_reglas WHERE obligacion_id=v_ob.id AND normativa_estado='validada') THEN RAISE EXCEPTION 'Revisar versión normativa antes de cambiar clasificación'; END IF;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_occs FROM public.obligacion_ocurrencias x;
 INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,
 aplicabilidad,parametros,fuente_url,fuente_referencia,importacion_referencia,created_by)
 SELECT v_ob.id,coalesce(max(version),0)+1,'condicion','mixto','aprobada','pendiente','{}'::jsonb,'{}'::jsonb,
 'https://www.dof.gob.mx/nota_detalle.php?codigo=5777199&fecha=27/12/2025',
 'Aplicabilidad operativa en ITW y condición permanente confirmadas por administrador. Mantener registros actualizados y disponibles; proporcionar a autoridad cuando requiera. Lectura de regla 4.3.19 en publicación original RGCE 2026: no fija entrega mensual. Validación normativa integral y cotejo de reformas posteriores separados de la decisión operativa.',
 'itw_registros_automotriz_permanente_20261020','f623e0d3-37b5-4ff4-be4f-cc73c99c85c4'
 FROM public.obligacion_reglas WHERE obligacion_id=v_ob.id RETURNING id INTO v_rule;
 UPDATE public.obligaciones SET presentacion='En todo momento; proporcionar registros a la autoridad cuando los requiera',
 descripcion='Mantener actualizados y conservar los registros por empresa de autopartes, identificando constancias y partes o componentes exportados o destinados al mercado nacional. Proporcionarlos a la autoridad aduanera cuando los requiera.'
 WHERE id=v_ob.id;
 IF v_marks IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_occs IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x) THEN RAISE EXCEPTION 'Cambió historial durante clasificación'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,record_id,old_values,new_values)
 VALUES('f623e0d3-37b5-4ff4-be4f-cc73c99c85c4','itw_registros_automotriz_permanente_20261020','obligaciones',v_ob.id,to_jsonb(v_ob),
 jsonb_build_object('tipo','condicion','regla_id',v_rule,'aplicabilidad_operativa','confirmada','normativa','pendiente',
 'cumplimientos_hash',v_marks,'ocurrencias_hash',v_occs,'alcance','Solo ITW','entrega_mensual',false));
END $$;
COMMIT;

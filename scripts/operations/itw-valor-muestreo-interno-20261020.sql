BEGIN;
DO $$
DECLARE v_ob public.obligaciones%ROWTYPE; v_rule uuid; v_marks text; v_occs text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('itw_valor_muestreo_interno_20261020'));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action='itw_valor_muestreo_interno_20261020') THEN RETURN; END IF;
 SELECT * INTO v_ob FROM public.obligaciones WHERE id='460421b9-fd46-45c2-9c73-4e806cc52975'
 AND empresa_id='2fe61136-2f8a-48b5-9aef-140ac19b676f' AND catalogo_id='131b038e-ed0e-4dfa-b767-b2a11d1b164e' AND activa FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró el control interno autorizado'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_reglas WHERE obligacion_id=v_ob.id) THEN RAISE EXCEPTION 'Existe una excepción particular que revisar'; END IF;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x)-ARRAY['regla_id','regla_snapshot','origen_fecha','fecha_objetivo_interna','updated_at'] ORDER BY id)::text,'[]')) INTO v_occs FROM public.obligacion_ocurrencias x;
 INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,
 aplicabilidad,parametros,fuente_url,fuente_referencia,importacion_referencia,created_by)
 VALUES(v_ob.id,1,'condicion','interno','aprobada','pendiente','{}'::jsonb,
 '{"revision_interna":{"frecuencia":"mensual","dia_inicio":17,"dia_fin":17,"desde":"2026-10-20"}}'::jsonb,
 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LAdua.pdf',
 'Administrador confirma revisión interna mensual por muestreo de expedientes. Artículo 64 consultado regula valor en aduana, no una declaración legal mensual. Conservar día 17 capturado exclusivamente como objetivo interno futuro; no recalcular históricos ni acreditar revisiones.',
 'itw_valor_muestreo_interno_20261020','f623e0d3-37b5-4ff4-be4f-cc73c99c85c4') RETURNING id INTO v_rule;
 UPDATE public.obligaciones SET nombre='Valoración aduanera — revisión interna por muestreo',
 descripcion='Revisar internamente una muestra de expedientes de importación para comprobar la documentación y determinación del valor en aduana.',
 presentacion='Revisión interna mensual' WHERE id=v_ob.id;
 INSERT INTO public.audit_logs(user_id,action,table_name,record_id,old_values,new_values)
 VALUES('f623e0d3-37b5-4ff4-be4f-cc73c99c85c4','itw_valor_muestreo_interno_20261020','obligaciones',v_ob.id,
 jsonb_build_object('obligacion',to_jsonb(v_ob),'ocurrencias_futuras',(SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM public.obligacion_ocurrencias x WHERE x.obligacion_id=v_ob.id AND x.fecha_vencimiento>='2026-10-20')),
 jsonb_build_object('tipo','control interno con revisiones mensuales','regla_id',v_rule,'cumplimientos_hash',v_marks,'fechas_y_periodos_hash',v_occs,'alcance','Solo ITW'));
 UPDATE public.obligacion_ocurrencias x SET origen_fecha='interna',regla_id=v_rule,
 regla_snapshot=(SELECT to_jsonb(r) FROM public.obligacion_reglas r WHERE r.id=v_rule),
 fecha_objetivo_interna=x.fecha_vencimiento
 WHERE x.obligacion_id=v_ob.id AND x.fecha_vencimiento>='2026-10-20' AND x.origen_fecha='heredada'
 AND x.evento_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.obligacion_cumplimientos c WHERE c.ocurrencia_id=x.id);
 IF v_marks IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_occs IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(x)-ARRAY['regla_id','regla_snapshot','origen_fecha','fecha_objetivo_interna','updated_at'] ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x) THEN RAISE EXCEPTION 'Cambió historial, fecha o periodo durante clasificación'; END IF;
END $$;
COMMIT;

-- Datos ficticios; horizonte relativo al día civil actual, sin fechas de clientes reales.
BEGIN;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
CREATE TEMP TABLE horizon_today AS SELECT (now() AT TIME ZONE 'America/Mexico_City')::date today;
INSERT INTO public.obligaciones(id,empresa_id,nombre,activa) VALUES
 ('40000000-0000-4000-8000-000000000071','20000000-0000-4000-8000-000000000001','Mensual ficticia',true),
 ('40000000-0000-4000-8000-000000000072','20000000-0000-4000-8000-000000000001','Anual ficticia',true),
 ('40000000-0000-4000-8000-000000000073','20000000-0000-4000-8000-000000000001','Pendiente ficticia',true),
 ('40000000-0000-4000-8000-000000000074','20000000-0000-4000-8000-000000000001','Inactiva ficticia',false),
 ('40000000-0000-4000-8000-000000000075','20000000-0000-4000-8000-000000000001','Evento ficticio',true),
 ('40000000-0000-4000-8000-000000000076','20000000-0000-4000-8000-000000000002','Otra empresa ficticia',true),
 ('40000000-0000-4000-8000-000000000077','20000000-0000-4000-8000-000000000001','Revisión interna ficticia',true),
 ('40000000-0000-4000-8000-000000000078','20000000-0000-4000-8000-000000000001','Calendario hábil ficticio',true),
 ('40000000-0000-4000-8000-000000000079','20000000-0000-4000-8000-000000000001','Alcance pendiente ficticio',true);
INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,created_by,validada_por,validada_en,fuente_referencia,fuente_url,parametros,aplicabilidad)
SELECT o.id,1,CASE WHEN right(o.id::text,2)='75' THEN 'evento' WHEN right(o.id::text,2)='77' THEN 'condicion' ELSE 'periodica' END,'normativo','aprobada',
 CASE WHEN right(o.id::text,2) IN ('73','77') THEN 'pendiente' ELSE 'validada' END,
 '10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',now(),'Solo fixture','https://example.invalid/fixture',
 CASE WHEN right(o.id::text,2)='72' THEN jsonb_build_object('frecuencia','anual','mes',extract(month FROM t.today)::integer,'dia',17)
 WHEN right(o.id::text,2)='77' THEN jsonb_build_object('revision_interna',jsonb_build_object('frecuencia','mensual','dia_inicio',21,'dia_fin',23,'desde',t.today))
 WHEN right(o.id::text,2)='78' THEN jsonb_build_object('frecuencia','mensual','dia',17,'dias_habiles',true,'calendario',jsonb_build_object('validado',true,'referencia','Fixture','feriados','[]'::jsonb,'anios',jsonb_build_array(extract(year FROM t.today)::integer)))
 ELSE '{"frecuencia":"mensual","dia":17}'::jsonb END,
 CASE WHEN right(o.id::text,2)='79' THEN '{"rubro":["AA"]}'::jsonb ELSE '{}'::jsonb END
 FROM public.obligaciones o CROSS JOIN horizon_today t WHERE right(o.id::text,2) IN ('71','72','73','74','75','76','77','78','79');
-- Preservar una fecha futura capturada y una entrega histórica.
INSERT INTO public.obligacion_ocurrencias(obligacion_id,empresa_id,periodo_key,fecha_vencimiento,origen_fecha)
SELECT '40000000-0000-4000-8000-000000000071','20000000-0000-4000-8000-000000000001',to_char(today+interval '1 month','YYYY-MM'),(date_trunc('month',today)+interval '1 month 19 days')::date,'heredada' FROM horizon_today;
INSERT INTO public.obligacion_ocurrencias(obligacion_id,empresa_id,periodo_key,fecha_vencimiento,origen_fecha)
VALUES('40000000-0000-4000-8000-000000000071','20000000-0000-4000-8000-000000000001','2001-01','2001-01-17','heredada');
INSERT INTO public.obligacion_cumplimientos(obligacion_id,empresa_id,ocurrencia_id,periodo_key,completada)
SELECT obligacion_id,empresa_id,id,periodo_key,true FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000071' AND periodo_key='2001-01';
CREATE TEMP TABLE horizon_existing AS SELECT to_jsonb(oc) row FROM public.obligacion_ocurrencias oc;
CREATE TEMP TABLE horizon_completions AS SELECT to_jsonb(c) row FROM public.obligacion_cumplimientos c;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT public.asegurar_horizonte_calendario('20000000-0000-4000-8000-000000000001');
SELECT public.asegurar_horizonte_calendario();
RESET ROLE;
DO $$ DECLARE v_today date; BEGIN
 SELECT today INTO v_today FROM horizon_today;
 IF (SELECT count(*) FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000071' AND fecha_vencimiento>=v_today AND fecha_vencimiento<(v_today+interval '12 months')::date)<>12 THEN RAISE EXCEPTION 'Horizonte mensual incompleto o duplicado'; END IF;
 IF (SELECT count(*) FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000072')<>1 THEN RAISE EXCEPTION 'Horizonte anual incorrecto'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id IN ('40000000-0000-4000-8000-000000000073','40000000-0000-4000-8000-000000000074','40000000-0000-4000-8000-000000000075','40000000-0000-4000-8000-000000000076','40000000-0000-4000-8000-000000000079')) THEN RAISE EXCEPTION 'Generó fuera del alcance, normativa validada o empresa'; END IF;
 IF (SELECT count(*) FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000077' AND origen_fecha='interna')<>12 THEN RAISE EXCEPTION 'Falta revisión interna explícita'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000078' AND extract(year FROM fecha_vencimiento)>extract(year FROM v_today)) THEN RAISE EXCEPTION 'Extendió feriados sin cobertura'; END IF;
 IF EXISTS(SELECT row FROM horizon_existing EXCEPT SELECT to_jsonb(oc) FROM public.obligacion_ocurrencias oc)
 OR EXISTS(SELECT row FROM horizon_completions EXCEPT SELECT to_jsonb(c) FROM public.obligacion_cumplimientos c) THEN RAISE EXCEPTION 'Alteró fechas o cumplimientos existentes'; END IF;
 IF public.asegurar_horizonte_calendario('20000000-0000-4000-8000-000000000001')<>0 THEN RAISE EXCEPTION 'Horizonte no idempotente'; END IF;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.asegurar_horizonte_calendario('20000000-0000-4000-8000-000000000002');RAISE EXCEPTION 'Generación cruzada';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.dias_recordatorio_calendario('20000000-0000-4000-8000-000000000002');RAISE EXCEPTION 'Lectura cruzada';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.dias_recordatorio_calendario() WHERE empresa_id<>'20000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Exportó alertas de otra empresa'; END IF;
END $$;
RESET ROLE;
INSERT INTO public.reminder_rules(tipo,dias_antes,empresa_id,activa) VALUES('immex',90,'20000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT dias_antes FROM public.dias_recordatorio_calendario() WHERE tipo='immex')<>ARRAY[90] THEN RAISE EXCEPTION 'Cliente no recibe su configuración efectiva'; END IF;
END $$;
RESET ROLE;
-- Una programación interna mal formada no bloquea el resto del calendario.
INSERT INTO public.obligaciones(id,empresa_id,nombre,activa) VALUES('40000000-0000-4000-8000-000000000080','20000000-0000-4000-8000-000000000001','Programación incompleta ficticia',true);
INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,created_by,parametros)
VALUES('40000000-0000-4000-8000-000000000080',1,'condicion','interno','aprobada','pendiente','10000000-0000-4000-8000-000000000001','{"revision_interna":{"frecuencia":"mensual","dia_inicio":21,"dia_fin":23,"desde":"fecha-pendiente"}}');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.asegurar_horizonte_calendario('20000000-0000-4000-8000-000000000001')<>0 THEN RAISE EXCEPTION 'Reintento con parámetros incompletos no idempotente'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claim.role','service_role',true);
SET LOCAL ROLE service_role;
SELECT public.asegurar_horizonte_calendario('20000000-0000-4000-8000-000000000002');
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000076')<>12 THEN RAISE EXCEPTION 'Cron de servicio no puede renovar la siguiente empresa'; END IF;
 IF has_function_privilege('anon','public.asegurar_horizonte_calendario(uuid)','EXECUTE') OR has_function_privilege('anon','public.dias_recordatorio_calendario(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Acceso anónimo'; END IF;
END $$;
ROLLBACK;

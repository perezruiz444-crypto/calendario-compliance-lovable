-- Validación acotada de cálculo Anexo 30 y calendario publicado al 23/10/2026.
-- No valida otras obligaciones ni acredita hechos de cumplimiento.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_action constant text:='anexo30_validar_calendario_20261023';
 v_actor constant uuid:='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
 v_cat uuid; v_old public.obligacion_reglas%ROWTYPE; v_marks text; v_occs text; v_events text; v_calendar jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(v_action));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN RAISE EXCEPTION 'Administrador no encontrado'; END IF;
 -- Calendario fiscal publicado: CFF 12 y RMF 2.1.6, incluida primera modificación.
 -- La cobertura termina antes de diciembre: no presumir vacaciones o calendario 2027 aún no corroborados.
 v_calendar:='{"validado":true,"desde":"2026-01-01","hasta":"2026-11-30","referencia":"CFF artículo 12; RMF 2026 regla 2.1.6 y primera modificación publicada 09/07/2026. Calendario corroborado al 23/10/2026; cobertura solo hasta 30/11/2026.","fuentes":["https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf","https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/RMF_2026-DOF-28122025.pdf","https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/1aRM_RMF2026.pdf"],"feriados":["2026-01-01","2026-01-02","2026-02-02","2026-03-16","2026-04-02","2026-04-03","2026-05-01","2026-05-05","2026-07-20","2026-07-21","2026-07-22","2026-07-23","2026-07-24","2026-07-27","2026-07-28","2026-07-29","2026-07-30","2026-07-31","2026-09-16","2026-11-16"]}'::jsonb;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_occs FROM public.obligacion_ocurrencias c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_events FROM public.obligacion_eventos c;
 FOREACH v_cat IN ARRAY ARRAY['9e088c03-803f-4625-876a-e4d1d1b1f9b1','0d34c8bc-b57b-43a2-ade9-401563e2f203']::uuid[] LOOP
  PERFORM id FROM public.obligaciones_catalogo WHERE id=v_cat AND activo FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Catálogo Anexo 30 no disponible'; END IF;
  SELECT * INTO v_old FROM public.obligacion_reglas WHERE catalogo_id=v_cat AND clasificacion_estado='aprobada' ORDER BY version DESC LIMIT 1;
  IF NOT FOUND OR v_old.version<>1 OR v_old.normativa_estado<>'pendiente' OR v_old.aplicabilidad<>'{}' THEN RAISE EXCEPTION 'Cambió la regla previa; revisar antes de validar'; END IF;
  IF EXISTS(SELECT 1 FROM public.obligacion_reglas r JOIN public.obligaciones o ON o.id=r.obligacion_id WHERE o.catalogo_id=v_cat AND o.activa AND r.clasificacion_estado='aprobada') THEN RAISE EXCEPTION 'Hay excepciones particulares que revisar'; END IF;
  INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,aplicabilidad,parametros,fuente_url,fuente_referencia,validada_por,validada_en,created_by,importacion_referencia)
  VALUES(v_cat,v_old.version+1,v_old.tipo_control,'normativo','aprobada','validada','{}',
   v_old.parametros||jsonb_build_object('calculo_anexo30',CASE WHEN v_old.tipo_control='evento' THEN 'inventario_inicial' ELSE 'descargos' END,'calendario',v_calendar),
   v_old.fuente_url,'Validación acotada: Anexo 30 RGCE 2026 I a)-b) y III a) leído; 30 días naturales desde inicio e informes mensuales y/o bimestrales dentro del mes calendario siguiente al cierre. CFF 12: si el término es inhábil, prórroga al siguiente hábil. RMF 2.1.6 y primera modificación 09/07/2026 cotejadas; cobertura del calendario solo hasta 30/11/2026. No valida operaciones, aplicabilidad de otras obligaciones ni hechos de cumplimiento.',v_actor,now(),v_actor,v_action);
 END LOOP;
 IF v_marks IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_occs IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias c)
 OR v_events IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_eventos c) THEN RAISE EXCEPTION 'Cambió historial durante validación'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,new_values) VALUES(v_actor,v_action,'obligacion_reglas',jsonb_build_object('estado','aplicado','reglas_nuevas',2,'calendario_hasta','2026-11-30','cumplimientos_hash',v_marks,'ocurrencias_hash',v_occs,'eventos_hash',v_events,'ocurrencias_creadas',0,'eventos_creados',0));
END $$;
COMMIT;

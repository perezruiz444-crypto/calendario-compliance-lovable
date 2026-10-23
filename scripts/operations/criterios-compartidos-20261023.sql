-- Generalizar las cuatro correcciones ya aprobadas; no cambia cumplimientos.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_action constant text:='catalogo_criterios_compartidos_20261023';
 v_actor constant uuid:='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
 v_before jsonb; v_marks text; v_dates text; v_past text; v_item record; v_rule record;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(v_action));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN RAISE EXCEPTION 'Administrador no encontrado'; END IF;
 CREATE TEMP TABLE shared_catalog_sources ON COMMIT DROP AS
 SELECT o.catalogo_id,o.id source_id,o.nombre,o.descripcion,o.presentacion,r.id source_rule_id,r.version,r.tipo_control,r.origen_control,r.normativa_estado,r.aplicabilidad,r.parametros,r.fuente_url,r.fuente_referencia
 FROM public.obligaciones o JOIN LATERAL(
  SELECT x.* FROM public.obligacion_reglas x WHERE x.obligacion_id=o.id AND x.clasificacion_estado='aprobada'
  ORDER BY version DESC LIMIT 1
 ) r ON true
 WHERE o.empresa_id='2fe61136-2f8a-48b5-9aef-140ac19b676f' AND o.activa
 AND o.catalogo_id IN('131b038e-ed0e-4dfa-b767-b2a11d1b164e','626e558a-cfd2-4676-b18d-eb98da1c4364','63261865-5124-49b4-b680-befd7af439f8','e90d50d6-87b7-4912-a5b5-ff59683c2a03');
 IF (SELECT count(*) FROM shared_catalog_sources)<>4 THEN RAISE EXCEPTION 'Faltan criterios originales aprobados'; END IF;
 IF EXISTS(SELECT 1 FROM shared_catalog_sources WHERE normativa_estado='validada') THEN RAISE EXCEPTION 'No sustituir normativa validada en operación provisional'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_reglas r WHERE r.normativa_estado='validada' AND
  (r.catalogo_id IN(SELECT catalogo_id FROM shared_catalog_sources) OR r.obligacion_id IN(SELECT id FROM public.obligaciones WHERE catalogo_id IN(SELECT catalogo_id FROM shared_catalog_sources)))) THEN
  RAISE EXCEPTION 'Hay normativa particular validada que revisar'; END IF;
 IF (SELECT count(*) FROM public.obligaciones WHERE activa AND catalogo_id IN(SELECT catalogo_id FROM shared_catalog_sources))<>17 THEN RAISE EXCEPTION 'Cambió el alcance de diecisiete asignaciones'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_reglas r JOIN public.obligaciones o ON o.id=r.obligacion_id
  WHERE o.activa AND o.catalogo_id IN(SELECT catalogo_id FROM shared_catalog_sources)
  AND o.id NOT IN(SELECT source_id FROM shared_catalog_sources)) THEN RAISE EXCEPTION 'Hay excepciones particulares adicionales que revisar'; END IF;
 PERFORM c.id FROM public.obligaciones_catalogo c WHERE c.id IN(SELECT catalogo_id FROM shared_catalog_sources) FOR UPDATE;
 PERFORM o.id FROM public.obligaciones o WHERE o.activa AND o.catalogo_id IN(SELECT catalogo_id FROM shared_catalog_sources) FOR UPDATE;
 SELECT jsonb_build_object(
  'catalogos',(SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM public.obligaciones_catalogo c WHERE c.id IN(SELECT catalogo_id FROM shared_catalog_sources)),
  'obligaciones',(SELECT jsonb_agg(to_jsonb(o) ORDER BY id) FROM public.obligaciones o WHERE o.activa AND o.catalogo_id IN(SELECT catalogo_id FROM shared_catalog_sources)),
  'reglas_particulares',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM public.obligacion_reglas r WHERE r.obligacion_id IN(SELECT source_id FROM shared_catalog_sources)),
  'ocurrencias_muestreo',(SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) FROM public.obligacion_ocurrencias x JOIN public.obligaciones o ON o.id=x.obligacion_id WHERE o.catalogo_id='131b038e-ed0e-4dfa-b767-b2a11d1b164e')) INTO v_before;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x)-ARRAY['regla_id','regla_snapshot','origen_fecha','fecha_objetivo_interna','updated_at'] ORDER BY id)::text,'[]')) INTO v_dates FROM public.obligacion_ocurrencias x;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_past FROM public.obligacion_ocurrencias x WHERE fecha_vencimiento<'2026-10-23';
 FOR v_item IN SELECT * FROM shared_catalog_sources LOOP
  INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,aplicabilidad,parametros,fuente_url,fuente_referencia,importacion_referencia,created_by)
  SELECT v_item.catalogo_id,coalesce(max(version),0)+1,v_item.tipo_control,v_item.origen_control,'aprobada','pendiente',v_item.aplicabilidad,v_item.parametros,
   v_item.fuente_url,'Criterio general autorizado para todas las empresas con esta definición. Basado en la corrección operativa aprobada: '||coalesce(v_item.fuente_referencia,''),v_action,v_actor
  FROM public.obligacion_reglas WHERE catalogo_id=v_item.catalogo_id;
  -- Las versiones particulares accidentales se conservan, pero ahora heredan catálogo.
  INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,aplicabilidad,parametros,fuente_referencia,importacion_referencia,created_by)
  SELECT v_item.source_id,coalesce(max(version),0)+1,v_item.tipo_control,v_item.origen_control,'aprobada','pendiente','{}','{"heredar_catalogo":true}',
   'Usar el criterio general y sus versiones futuras; se conserva el historial de la antigua corrección particular.',v_action,v_actor
  FROM public.obligacion_reglas WHERE obligacion_id=v_item.source_id;
  UPDATE public.obligaciones_catalogo SET nombre=v_item.nombre,descripcion=v_item.descripcion,presentacion=v_item.presentacion,
   frecuencia_tipo=CASE WHEN v_item.catalogo_id='131b038e-ed0e-4dfa-b767-b2a11d1b164e' THEN 'MENSUAL' ELSE 'EVENTUAL' END,
   dia_vencimiento=CASE WHEN v_item.catalogo_id='131b038e-ed0e-4dfa-b767-b2a11d1b164e' THEN 17 ELSE NULL END,
   mes_vencimiento=NULL,usar_ultimo_dia_habil=false
  WHERE id=v_item.catalogo_id;
  UPDATE public.obligaciones SET nombre=v_item.nombre,descripcion=v_item.descripcion,presentacion=v_item.presentacion
  WHERE activa AND catalogo_id=v_item.catalogo_id;
 END LOOP;
 FOR v_rule IN SELECT id FROM public.obligaciones WHERE activa AND catalogo_id='131b038e-ed0e-4dfa-b767-b2a11d1b164e' LOOP
  PERFORM public.generar_ocurrencias_obligacion_anio(v_rule.id,2026);
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.obligaciones o JOIN shared_catalog_sources s ON s.catalogo_id=o.catalogo_id
  WHERE o.activa AND public.obligacion_v2_tipo(o.id) IS DISTINCT FROM s.tipo_control) THEN RAISE EXCEPTION 'Alguna empresa conserva clasificación distinta'; END IF;
 IF v_marks IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_dates IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x)-ARRAY['regla_id','regla_snapshot','origen_fecha','fecha_objetivo_interna','updated_at'] ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x)
 OR v_past IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x WHERE fecha_vencimiento<'2026-10-23') THEN
  RAISE EXCEPTION 'Cambió un cumplimiento, fecha, periodo o antecedente'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,old_values,new_values)
 VALUES(v_actor,v_action,'obligaciones_catalogo',v_before,jsonb_build_object('estado','aplicado','catalogos',4,'asignaciones',17,
  'cumplimientos_hash',v_marks,'fechas_periodos_hash',v_dates,'historicos_hash',v_past,'normativa_validada',false,
  'criterio','Catálogo general por defecto; excepciones particulares explícitas separadas'));
END $$;
COMMIT;

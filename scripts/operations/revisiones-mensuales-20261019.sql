-- Autorización del administrador: dos controles compartidos, revisión interna 21-23.
-- Conciliar solo periodos YA EXISTENTES hasta septiembre; no crear historial faltante.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_action constant text:='revisiones_mensuales_buzon_listados_20261019';
 v_actor constant uuid:='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
 v_before jsonb; v_original_marks jsonb; v_before_occ jsonb; v_added integer; v_ob record;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(v_action));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN
  RAISE EXCEPTION 'No se encontró el administrador de la autorización';
 END IF;
 CREATE TEMP TABLE monthly_controls ON COMMIT DROP AS
 SELECT o.id,o.empresa_id,o.catalogo_id FROM public.obligaciones o
 WHERE o.activa AND o.catalogo_id IN ('8d5f3ef8-d84d-4e87-831c-a0c65faedd98','d480f47f-f2de-47e4-8184-8fcd14f4c35e');
 IF (SELECT count(*) FROM monthly_controls)<>12 OR (SELECT count(DISTINCT empresa_id) FROM monthly_controls)<>6
   OR EXISTS(SELECT 1 FROM public.obligacion_reglas r JOIN monthly_controls c ON c.id=r.obligacion_id) THEN
  RAISE EXCEPTION 'Cambió el alcance o hay excepciones particulares que revisar';
 END IF;
 PERFORM o.id FROM public.obligaciones o JOIN monthly_controls c ON c.id=o.id FOR UPDATE OF o;
 SELECT jsonb_agg(to_jsonb(c) ORDER BY id) INTO v_original_marks FROM public.obligacion_cumplimientos c;
 SELECT jsonb_agg(to_jsonb(x) ORDER BY id) INTO v_before_occ FROM public.obligacion_ocurrencias x;
 SELECT jsonb_build_object(
  'catalogos',(SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM public.obligaciones_catalogo c WHERE c.id IN (SELECT catalogo_id FROM monthly_controls)),
  'obligaciones',(SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM public.obligaciones o JOIN monthly_controls c ON c.id=o.id),
  'ocurrencias',v_before_occ,'cumplimientos',v_original_marks) INTO v_before;
 -- Nueva versión operativa, nunca normativa validada.
 INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,
  parametros,fuente_referencia,importacion_referencia,created_by)
 SELECT c.id,coalesce((SELECT max(version) FROM public.obligacion_reglas r WHERE r.catalogo_id=c.id),0)+1,
  'condicion','mixto','aprobada','pendiente',
  '{"revision_interna":{"frecuencia":"mensual","dia_inicio":21,"dia_fin":23,"desde":"2026-10-01"}}'::jsonb,
  'Revisión mensual interna del 21 al 23 autorizada por el administrador para todas las empresas. No valida normativa ni acredita por sí misma revisiones.',v_action,v_actor
 FROM public.obligaciones_catalogo c WHERE c.id IN (SELECT catalogo_id FROM monthly_controls)
 AND NOT EXISTS(SELECT 1 FROM public.obligacion_reglas r WHERE r.catalogo_id=c.id AND r.normativa_estado='validada');
 IF (SELECT count(*) FROM public.obligacion_reglas WHERE importacion_referencia=v_action)<>2 THEN
  RAISE EXCEPTION 'No se pudieron aprobar exactamente dos versiones operativas';
 END IF;
 UPDATE public.obligaciones_catalogo SET frecuencia_tipo='MENSUAL',dia_vencimiento=23,
  presentacion='Revisión interna mensual (del 21 al 23 de cada mes)',
  notas_internas=concat_ws(E'\n',nullif(notas_internas,''),'Condición continua con revisión interna mensual autorizada; no representa una entrega legal mensual. Fundamento y alcance normativo por validar.')
 WHERE id IN (SELECT catalogo_id FROM monthly_controls);
 UPDATE public.obligaciones o SET presentacion='Revisión interna mensual (del 21 al 23 de cada mes)'
 FROM monthly_controls c WHERE o.id=c.id;
 -- Solo una marca faltante encontrada: ITW, listados, agosto. Rechazar cambios de alcance.
 IF (SELECT count(*) FROM public.obligacion_ocurrencias x JOIN monthly_controls c ON c.id=x.obligacion_id
  WHERE x.fecha_vencimiento<'2026-10-01' AND NOT EXISTS(SELECT 1 FROM public.obligacion_cumplimientos m
   WHERE m.obligacion_id=x.obligacion_id AND m.ocurrencia_id=x.id AND m.periodo_key=x.periodo_key AND m.vigente AND m.completada))<>1 THEN
  RAISE EXCEPTION 'Cambió el conjunto de antecedentes por conciliar';
 END IF;
 INSERT INTO public.obligacion_cumplimientos(empresa_id,obligacion_id,ocurrencia_id,periodo_key,completada,completada_por,notas)
 SELECT x.empresa_id,x.obligacion_id,x.id,x.periodo_key,true,v_actor,
  'Conciliación histórica por confirmación expresa del administrador el 19/10/2026: ambos controles atendidos hasta septiembre incluido agosto; octubre por revisar. Sin acuse ni archivo adjunto. No acredita periodos posteriores.'
 FROM public.obligacion_ocurrencias x JOIN monthly_controls c ON c.id=x.obligacion_id
 WHERE x.obligacion_id='db57d588-a3b4-4ab1-bfe7-7951cc84227d' AND x.periodo_key='2026-08'
  AND x.fecha_vencimiento<'2026-10-01' AND NOT EXISTS(SELECT 1 FROM public.obligacion_cumplimientos m
   WHERE m.obligacion_id=x.obligacion_id AND m.periodo_key=x.periodo_key AND m.vigente);
 GET DIAGNOSTICS v_added=ROW_COUNT;
 IF v_added<>1 THEN RAISE EXCEPTION 'No se pudo registrar el único antecedente confirmado'; END IF;
 FOR v_ob IN SELECT id FROM monthly_controls LOOP
  PERFORM public.generar_ocurrencias_obligacion_anio(v_ob.id,2026);
 END LOOP;
 -- Originales intactos: solo se permite añadir la marca confirmada, nunca editar las anteriores.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_original_marks) old
  LEFT JOIN public.obligacion_cumplimientos c ON c.id=(old->>'id')::uuid
  WHERE old IS DISTINCT FROM to_jsonb(c)) THEN RAISE EXCEPTION 'Cambió un cumplimiento anterior'; END IF;
 -- Las únicas fechas editables son futuras, heredadas y sin marca de estos doce controles.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_before_occ) old
  LEFT JOIN public.obligacion_ocurrencias x ON x.id=(old->>'id')::uuid
  WHERE old IS DISTINCT FROM to_jsonb(x) AND (
    x.id IS NULL OR (old->>'fecha_vencimiento')::date<'2026-10-19'
    OR NOT EXISTS(SELECT 1 FROM monthly_controls c WHERE c.id=x.obligacion_id)
    OR old->>'origen_fecha'<>'heredada' OR old->>'periodo_key' !~ '^2026-(10|11|12)$'
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(v_original_marks) m WHERE m->>'ocurrencia_id'=old->>'id'))) THEN
  RAISE EXCEPTION 'Cambió una ocurrencia fuera de la programación autorizada';
 END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,old_values,new_values)
 VALUES(v_actor,v_action,'obligaciones',v_before,jsonb_build_object(
  'estado','aplicado','empresas',6,'controles',12,'ventana_inicio',21,'ventana_fin',23,
  'cumplimientos_agregados',v_added,'normativa_validada',false,'confirmacion_hasta','2026-09',
  'octubre','Conservar marcas previas; sin nuevos cumplimientos automáticos'));
END $$;
COMMIT;

BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_action constant text:='retiro_informe_trimestral_inventarios_20261020';
 v_cat constant uuid:='ee8be407-58a4-4336-ae2d-c95554cc636b';
 v_actor constant uuid:='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
 v_catalog public.obligaciones_catalogo%ROWTYPE; v_before jsonb;
 v_marks text; v_occs text; v_others text; v_changed integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(v_action));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN RAISE EXCEPTION 'Administrador no encontrado'; END IF;
 SELECT * INTO v_catalog FROM public.obligaciones_catalogo WHERE id=v_cat AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'La plantilla ya no está activa; revisar estado'; END IF;
 IF (SELECT count(*) FROM public.obligaciones WHERE catalogo_id=v_cat AND activa)<>5 THEN RAISE EXCEPTION 'Cambió el alcance de cinco empresas'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_reglas r WHERE normativa_estado='validada' AND
  (r.catalogo_id=v_cat OR r.obligacion_id IN(SELECT id FROM public.obligaciones WHERE catalogo_id=v_cat))) THEN RAISE EXCEPTION 'Hay normativa validada que revisar'; END IF;
 PERFORM id FROM public.obligaciones WHERE catalogo_id=v_cat FOR UPDATE;
 SELECT jsonb_agg(to_jsonb(o) ORDER BY id) INTO v_before FROM public.obligaciones o WHERE catalogo_id=v_cat;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_occs FROM public.obligacion_ocurrencias x;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id)::text,'[]')) INTO v_others FROM public.obligaciones o WHERE catalogo_id IS DISTINCT FROM v_cat;
 UPDATE public.obligaciones_catalogo SET activo=false,obligatorio=false,
 notas_internas=concat_ws(E'\n',nullif(notas_internas,''),'Retirado por autorización del administrador: plantilla inicial sin correspondencia en los cinco Excel revisados y sin sustento acreditado para entrega trimestral. Conservar antecedentes; no sustituye el control automatizado de inventarios.')
 WHERE id=v_cat;
 UPDATE public.obligaciones SET activa=false,
 notas=concat_ws(E'\n',nullif(notas,''),'Informe trimestral agregado por plantilla inicial, retirado del seguimiento exigible en todas las empresas por autorización del administrador. Historial conservado; no se declara cumplimiento ni no aplicabilidad retroactiva.')
 WHERE catalogo_id=v_cat AND activa;
 GET DIAGNOSTICS v_changed=ROW_COUNT;
 IF v_changed<>5 THEN RAISE EXCEPTION 'No se retiraron exactamente cinco asignaciones'; END IF;
 IF v_marks IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_occs IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x)
 OR v_others IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id)::text,'[]')) FROM public.obligaciones o WHERE catalogo_id IS DISTINCT FROM v_cat) THEN RAISE EXCEPTION 'Cambió historial u otra obligación'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,record_id,old_values,new_values)
 VALUES(v_actor,v_action,'obligaciones_catalogo',v_cat,jsonb_build_object('catalogo',to_jsonb(v_catalog),'obligaciones',v_before),
 jsonb_build_object('estado','retirado','asignaciones_desactivadas',v_changed,'cumplimientos_hash',v_marks,'ocurrencias_hash',v_occs,'otras_obligaciones_hash',v_others,
 'normativa_validada',false,'alcance','Todas las empresas que tienen esta plantilla','origen','Plantilla inicial de catálogo del 25/03/2026; no se encontró en los cinco Excel disponibles'));
END $$;
COMMIT;

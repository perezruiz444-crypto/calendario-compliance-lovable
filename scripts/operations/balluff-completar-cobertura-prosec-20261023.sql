-- Completar cobertura de un programa ya registrado, sin fabricar atrasos históricos.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_action constant text:='balluff_cobertura_prosec_20261023';
 v_actor constant uuid:='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
 v_company uuid; v_ids uuid[]:=ARRAY['d615a028-a3c9-4998-be01-26f412c4acc4','925689fc-7511-4759-b412-d2dd26bb51ac','75190e24-2d37-405f-bcd0-c714675bfeff','025191f8-c3d7-4384-92d7-5713b07f4732','d68056d1-365e-48a2-b54b-7a9a2ce05ee3']::uuid[];
 v_before jsonb; v_marks text; v_occs text; v_changed integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(v_action));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN RAISE EXCEPTION 'Administrador no encontrado'; END IF;
 SELECT id INTO v_company FROM public.empresas WHERE razon_social='Balluff Manufacturing Aguascalientes' AND prosec_numero ~ '^[0-9][0-9 /-]+$' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró el programa PROSEC registrado de Balluff'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligaciones WHERE empresa_id=v_company AND catalogo_id='cfe7b3f7-da3b-485a-bee9-6fbd993e6b64' AND activa) THEN RAISE EXCEPTION 'La empresa no conserva el seguimiento vigente de PROSEC'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligaciones WHERE empresa_id=v_company AND catalogo_id=ANY(v_ids)) THEN RAISE EXCEPTION 'Ya existe cobertura o antecedente que requiere conciliación'; END IF;
 PERFORM id FROM public.obligaciones_catalogo WHERE id=ANY(v_ids) FOR UPDATE;
 IF (SELECT count(*) FROM public.obligaciones_catalogo WHERE id=ANY(v_ids) AND activo)<>5 THEN RAISE EXCEPTION 'Cambió el catálogo PROSEC'; END IF;
 IF (SELECT count(*) FROM public.obligaciones_catalogo c JOIN LATERAL(SELECT r.* FROM public.obligacion_reglas r WHERE r.catalogo_id=c.id AND r.clasificacion_estado='aprobada' ORDER BY version DESC LIMIT 1) r ON true WHERE c.id=ANY(v_ids) AND r.normativa_estado='pendiente' AND r.aplicabilidad='{}')<>5 THEN RAISE EXCEPTION 'Cambió el alcance operativo provisional'; END IF;
 SELECT jsonb_build_object('empresa',(SELECT to_jsonb(e) FROM public.empresas e WHERE id=v_company),'seguimientos_prosec',(SELECT jsonb_agg(to_jsonb(o)) FROM public.obligaciones o WHERE empresa_id=v_company AND categoria='prosec')) INTO v_before;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_occs FROM public.obligacion_ocurrencias x;
 INSERT INTO public.obligaciones(empresa_id,catalogo_id,categoria,nombre,descripcion,articulos,presentacion,activa,estado,created_by,notas)
 SELECT v_company,id,categoria,nombre,descripcion,articulos,presentacion,true,'vigente',v_actor,
 'Cobertura del programa PROSEC ya registrado en la empresa. Se reutiliza el catálogo general, sin crear periodos pasados ni acreditar cumplimientos. No se presume una operación de enajenación o un incumplimiento por esta activación.'
 FROM public.obligaciones_catalogo WHERE id=ANY(v_ids);
 GET DIAGNOSTICS v_changed=ROW_COUNT;
 IF v_changed<>5 THEN RAISE EXCEPTION 'No se crearon cinco seguimientos'; END IF;
 INSERT INTO public.obligacion_relaciones(empresa_id,obligacion_origen_id,obligacion_destino_id,tipo,created_by)
 SELECT v_company,control.id,riesgo.id,'riesgo',v_actor FROM public.obligaciones control JOIN public.obligaciones riesgo ON riesgo.empresa_id=control.empresa_id
 WHERE control.empresa_id=v_company AND control.catalogo_id=ANY(v_ids) AND control.catalogo_id<>'d68056d1-365e-48a2-b54b-7a9a2ce05ee3' AND control.activa
 AND riesgo.catalogo_id='d68056d1-365e-48a2-b54b-7a9a2ce05ee3' AND riesgo.activa
 ON CONFLICT(obligacion_origen_id,obligacion_destino_id,tipo) DO NOTHING;
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias x JOIN public.obligaciones o ON o.id=x.obligacion_id WHERE o.empresa_id=v_company AND o.catalogo_id=ANY(v_ids)) THEN RAISE EXCEPTION 'Se creó una ocurrencia sin periodo confirmado'; END IF;
 IF v_marks IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_occs IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x) THEN RAISE EXCEPTION 'Cambió un antecedente'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,record_id,old_values,new_values)
 VALUES(v_actor,v_action,'empresas',v_company,v_before,jsonb_build_object('estado','aplicado','asignaciones',v_changed,'programa_previamente_registrado',true,'cumplimientos_hash',v_marks,'ocurrencias_hash',v_occs,'normativa_validada',false,'periodos_historicos_generados',0));
END $$;
COMMIT;

-- Ejecutar una vez con la autorización ya dada: mensual 20 y objetivo hábil anterior;
-- anual separado, únicamente ante notificación. Nunca acredita periodos históricos.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_action constant text:='inegi_mensual_anual_20261020';
 v_cat constant uuid:='6a4f4015-ef50-46ae-b1fa-0bb6b9b011c3';
 v_actor constant uuid:='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
 v_catalog public.obligaciones_catalogo%ROWTYPE;
 v_before jsonb; v_marks text; v_past text; v_annual uuid; v_rule uuid; v_ob record;
 v_params jsonb:='{"programacion_interna":{"frecuencia":"mensual","dia":20,"desde":"2026-10-20","calendario":{"anios":[2026,2027],"referencia":"Planificación interna: lunes a viernes y descansos federales del artículo 74 LFT; fuente Cámara de Diputados. No es calendario legal de INEGI ni incluye cierres locales extraordinarios.","fuente_url":"https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf","feriados":["2026-01-01","2026-02-02","2026-03-16","2026-05-01","2026-09-16","2026-11-16","2026-12-25","2027-01-01","2027-02-01","2027-03-15","2027-05-01","2027-09-16","2027-11-15","2027-12-25"]}}}';
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(v_action));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN RAISE EXCEPTION 'Administrador no encontrado'; END IF;
 SELECT * INTO v_catalog FROM public.obligaciones_catalogo WHERE id=v_cat AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Definición mensual no encontrada'; END IF;
 CREATE TEMP TABLE inegi_monthly_scope ON COMMIT DROP AS SELECT id,empresa_id FROM public.obligaciones WHERE catalogo_id=v_cat AND activa;
 IF (SELECT count(*) FROM inegi_monthly_scope)<>6 OR EXISTS(SELECT 1 FROM public.obligacion_reglas WHERE catalogo_id=v_cat
  OR obligacion_id IN(SELECT id FROM inegi_monthly_scope)) THEN RAISE EXCEPTION 'Cambió el alcance o existen reglas particulares'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligaciones_catalogo WHERE programa='immex' AND nombre='INEGI — información anual por notificación') THEN RAISE EXCEPTION 'Ya existe definición anual; revisar duplicidad'; END IF;
 PERFORM o.id FROM public.obligaciones o JOIN inegi_monthly_scope s ON s.id=o.id FOR UPDATE OF o;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_past FROM public.obligacion_ocurrencias x WHERE fecha_vencimiento<'2026-10-20';
 SELECT jsonb_build_object('catalogo',to_jsonb(v_catalog),
  'obligaciones',(SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM public.obligaciones o JOIN inegi_monthly_scope s ON s.id=o.id),
  'ocurrencias_futuras',(SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) FROM public.obligacion_ocurrencias x JOIN inegi_monthly_scope s ON s.id=x.obligacion_id WHERE x.fecha_vencimiento>='2026-10-20')) INTO v_before;
 INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,aplicabilidad,parametros,fuente_url,fuente_referencia,importacion_referencia,created_by)
 VALUES(v_cat,1,'periodica','mixto','aprobada','pendiente','{}',v_params,
 'https://dof.gob.mx/2022/SEECO/SEDECO_090522.pdf',
 'Regla 3.2.17 fracción I leída en publicación original DOF 09/05/2022. Mensual y aplicabilidad operativa IMMEX confirmadas por administrador. Planificación día 20 y objetivo hábil estrictamente anterior. No valida reformas posteriores ni prórrogas legales; conservar históricos.',v_action,v_actor) RETURNING id INTO v_rule;
 UPDATE public.obligaciones_catalogo SET
  descripcion='Presentar información estadística mensual al INEGI respecto del mes anterior. Día 20 como límite indicado y objetivo interno en el último día hábil anterior. El supuesto anual tras notificación se gestiona por separado.',
  presentacion='Mensual; día 20 y objetivo interno en el último día hábil anterior',frecuencia_tipo='MENSUAL',dia_vencimiento=20,usar_ultimo_dia_habil=false
 WHERE id=v_cat;
 UPDATE public.obligaciones o SET descripcion='Presentar información estadística mensual al INEGI respecto del mes anterior. El anual tras notificación se gestiona por separado.',
  presentacion='Mensual; día 20 y objetivo interno en el último día hábil anterior'
 FROM inegi_monthly_scope s WHERE o.id=s.id;
 INSERT INTO public.obligaciones_catalogo(programa,categoria,nombre,articulos,descripcion,presentacion,frecuencia_tipo,obligatorio,activo,created_by)
 VALUES('immex','immex','INEGI — información anual por notificación','Regla 3.2.17, fracción II, Acuerdo SE; art. 25 Decreto IMMEX',
 'Información anual que corresponda según la notificación de INEGI. Registrar la recepción y conservar el requerimiento; no generar una segunda entrega anual automática además de la mensual.',
 'Por notificación de INEGI','EVENTUAL',false,true,v_actor) RETURNING id INTO v_annual;
 INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,aplicabilidad,parametros,fuente_url,fuente_referencia,importacion_referencia,created_by)
 VALUES(v_annual,1,'evento','mixto','aprobada','pendiente','{}','{"plazo_dias":30,"sentido":"despues","dias_habiles":false}',
 'https://dof.gob.mx/2022/SEECO/SEDECO_090522.pdf',
 'Supuesto alternativo anual condicionado a notificación según fracción II en publicación original consultada. No supone evento ocurrido ni valida modificaciones posteriores. Sin notificación, no generar fecha ni exigir entrega.',v_action,v_actor);
 INSERT INTO public.obligaciones(empresa_id,catalogo_id,categoria,nombre,descripcion,articulos,presentacion,activa,estado,created_by)
 SELECT s.empresa_id,v_annual,'immex','INEGI — información anual por notificación',
 'Atender información anual cuando corresponda por notificación de INEGI. Registrar la notificación y su evidencia; sin notificación no se genera entrega.',
 'Regla 3.2.17, fracción II, Acuerdo SE; art. 25 Decreto IMMEX','Por notificación de INEGI',true,'vigente',v_actor FROM inegi_monthly_scope s;
 FOR v_ob IN SELECT id FROM inegi_monthly_scope LOOP
  PERFORM public.generar_ocurrencias_obligacion_anio(v_ob.id,2026);
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id IN(SELECT id FROM public.obligaciones WHERE catalogo_id=v_annual)) THEN RAISE EXCEPTION 'Se generó una entrega anual sin notificación'; END IF;
 IF v_marks IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_past IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x WHERE fecha_vencimiento<'2026-10-20') THEN
  RAISE EXCEPTION 'Cambió una marca o una ocurrencia histórica'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,record_id,old_values,new_values)
 VALUES(v_actor,v_action,'obligaciones_catalogo',v_cat,v_before,jsonb_build_object('estado','aplicado','empresas',6,
  'regla_mensual',v_rule,'catalogo_anual',v_annual,'limite_indicado',20,'objetivo_interno','Último día hábil estrictamente anterior',
  'calendario','Planificación federal 2026 y 2027; no calendario normativo INEGI','cumplimientos_hash',v_marks,'historicos_hash',v_past,'normativa_validada',false));
END $$;
COMMIT;

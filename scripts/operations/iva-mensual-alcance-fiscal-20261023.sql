-- Corrección de alcance confirmada por el administrador. No acredita entregas.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_action constant text:='iva_mensual_alcance_fiscal_20261023';
 v_cat constant uuid:='92cbb8be-aabf-4145-9b7d-f1703bc31c71';
 v_actor constant uuid:='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
 v_catalog public.obligaciones_catalogo%ROWTYPE;
 v_rule public.obligacion_reglas%ROWTYPE;
 v_before jsonb; v_marks text; v_occs text; v_others text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(v_action));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN RAISE EXCEPTION 'Administrador no encontrado'; END IF;
 SELECT * INTO v_catalog FROM public.obligaciones_catalogo WHERE id=v_cat AND activo FOR UPDATE;
 IF NOT FOUND OR v_catalog.nombre<>'Declaración Mensual IVA/IEPS (Certificación)' THEN RAISE EXCEPTION 'Cambió el catálogo revisado'; END IF;
 IF (SELECT count(*) FROM public.obligaciones WHERE catalogo_id=v_cat AND activa)<>1
 OR NOT EXISTS(SELECT 1 FROM public.obligaciones WHERE id='2fc76c0c-0298-492e-a12e-77382ba90761' AND catalogo_id=v_cat AND activa) THEN RAISE EXCEPTION 'Cambió el alcance de Tokaikogyo'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_reglas r WHERE r.obligacion_id IN(SELECT id FROM public.obligaciones WHERE catalogo_id=v_cat)) THEN RAISE EXCEPTION 'Hay reglas particulares que revisar'; END IF;
 SELECT * INTO v_rule FROM public.obligacion_reglas WHERE catalogo_id=v_cat AND clasificacion_estado='aprobada' ORDER BY version DESC LIMIT 1;
 IF NOT FOUND OR v_rule.tipo_control<>'periodica' OR v_rule.normativa_estado='validada' THEN RAISE EXCEPTION 'Cambió la regla operativa revisada'; END IF;
 PERFORM id FROM public.obligaciones WHERE catalogo_id=v_cat AND activa FOR UPDATE;
 SELECT jsonb_agg(to_jsonb(o) ORDER BY id) INTO v_before FROM public.obligaciones o WHERE catalogo_id=v_cat;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_occs FROM public.obligacion_ocurrencias x;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id)::text,'[]')) INTO v_others FROM public.obligaciones o WHERE catalogo_id IS DISTINCT FROM v_cat;
 UPDATE public.obligaciones_catalogo SET
  nombre='Declaración fiscal mensual de IVA',
  descripcion='Presentar la declaración fiscal mensual de IVA correspondiente al periodo, a cargo del área de contabilidad.',
  articulos='Artículo 5o.-D de la Ley del Impuesto al Valor Agregado',
  presentacion='Mensual; declaración fiscal a cargo de contabilidad',
  notas_internas=concat_ws(E'\n',nullif(notas_internas,''),'Alcance confirmado por el administrador el 23/10/2026: declaración fiscal mensual de IVA. IEPS requiere supuesto y fundamento propios; no se presume aplicable por tener certificación. Se mantiene el día 17 capturado sin validar integralmente excepciones o ajustes de calendario. No crear periodos ni marcas por esta corrección. La clasificación por programa existente se conserva; no acredita un trámite exclusivo de certificación.')
 WHERE id=v_cat;
 -- Corrección del catálogo general y de todas sus instancias activas, sin cambiar identidad.
 UPDATE public.obligaciones o SET nombre=c.nombre,descripcion=c.descripcion,articulos=c.articulos,presentacion=c.presentacion
 FROM public.obligaciones_catalogo c WHERE c.id=v_cat AND o.catalogo_id=c.id AND o.activa;
 INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,aplicabilidad,parametros,fuente_url,fuente_referencia,importacion_referencia,created_by)
 SELECT v_cat,coalesce(max(version),0)+1,'periodica',v_rule.origen_control,'aprobada','pendiente',v_rule.aplicabilidad,v_rule.parametros,
  'https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf',
  'Administrador confirma declaración fiscal mensual de IVA a cargo de contabilidad. LIVA 5o.-D leído; separar crédito fiscal de certificación del artículo 28-A y revisar IEPS por su propio supuesto. No se valida integralmente el plazo ni se recalcula el histórico.',v_action,v_actor
 FROM public.obligacion_reglas WHERE catalogo_id=v_cat;
 IF v_marks IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_occs IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x)
 OR v_others IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id)::text,'[]')) FROM public.obligaciones o WHERE catalogo_id IS DISTINCT FROM v_cat) THEN RAISE EXCEPTION 'Cambió historial u otra obligación'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,record_id,old_values,new_values)
 VALUES(v_actor,v_action,'obligaciones_catalogo',v_cat,jsonb_build_object('catalogo',to_jsonb(v_catalog),'regla',to_jsonb(v_rule),'obligaciones',v_before),
 jsonb_build_object('estado','aplicado','asignaciones_activas',1,'cumplimientos_hash',v_marks,'ocurrencias_hash',v_occs,'otras_obligaciones_hash',v_others,
 'normativa_validada',false,'alcance','Criterio general de declaración fiscal mensual de IVA; IEPS se revisa por separado; sin marcar entregas'));
END $$;
COMMIT;

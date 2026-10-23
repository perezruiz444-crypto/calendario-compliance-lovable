-- Separar una entrega de arranque de los informes de descargo periódicos.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_action constant text:='anexo30_separar_inventario_inicial_20261023';
 v_actor constant uuid:='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
 v_cat constant uuid:='9e088c03-803f-4625-876a-e4d1d1b1f9b1';
 v_new uuid; v_company uuid; v_before jsonb; v_marks text; v_occs text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(v_action));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN RAISE EXCEPTION 'Administrador no encontrado'; END IF;
 PERFORM id FROM public.obligaciones_catalogo WHERE id=v_cat AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Catálogo no encontrado'; END IF;
 IF (SELECT count(*) FROM public.obligaciones WHERE catalogo_id=v_cat AND activa)<>1 THEN RAISE EXCEPTION 'Cambió el alcance'; END IF;
 SELECT empresa_id INTO v_company FROM public.obligaciones WHERE id='6e20baeb-c361-4c6a-9be9-761c63c6adc1' AND catalogo_id=v_cat AND activa FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la asignación de Tokaikogyo'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_reglas WHERE catalogo_id=v_cat OR obligacion_id IN(SELECT id FROM public.obligaciones WHERE catalogo_id=v_cat)) THEN RAISE EXCEPTION 'Hay reglas adicionales que revisar'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id IN(SELECT id FROM public.obligaciones WHERE catalogo_id=v_cat)) THEN RAISE EXCEPTION 'Hay periodos previos que conciliar'; END IF;
 SELECT jsonb_build_object('catalogo',(SELECT to_jsonb(c) FROM public.obligaciones_catalogo c WHERE id=v_cat),'obligaciones',(SELECT jsonb_agg(to_jsonb(o)) FROM public.obligaciones o WHERE catalogo_id=v_cat)) INTO v_before;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_occs FROM public.obligacion_ocurrencias x;
 UPDATE public.obligaciones_catalogo SET nombre='Informes de descargo — Anexo 30',
 descripcion='Transmitir al SCCCyG los informes de descargo de las operaciones y destinos aduaneros correspondientes, verificar su estatus válido y conservar los acuses. Los informes pueden transmitirse mensual o bimestralmente dentro del mes calendario siguiente al cierre de las operaciones. El inventario inicial se gestiona por separado.',
 articulos='RGCE 7.2.1, segundo párrafo, fracción IV; Anexo 30, fracciones III y IV',
 presentacion='Mensual o bimestral; dentro del mes calendario siguiente al cierre de operaciones',
 frecuencia_tipo='EVENTUAL',dia_vencimiento=NULL,mes_vencimiento=NULL,usar_ultimo_dia_habil=false,
 notas_internas=concat_ws(E'\n',nullif(notas_internas,''),'El tipo de seguimiento es periódico, con opciones mensual/bimestral según Anexo 30. La periodicidad concreta debe documentarse con la empresa antes de programar fechas; EVENTUAL es un bloqueo operativo a la generación genérica mientras no se seleccione, no una clasificación del informe como evento. No inferir periodos ni entregas históricas.')
 WHERE id=v_cat;
 UPDATE public.obligaciones o SET nombre=c.nombre,descripcion=c.descripcion,articulos=c.articulos,presentacion=c.presentacion FROM public.obligaciones_catalogo c WHERE c.id=v_cat AND o.catalogo_id=c.id AND o.activa;
 INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,aplicabilidad,parametros,fuente_url,fuente_referencia,importacion_referencia,created_by)
 VALUES(v_cat,1,'periodica','normativo','aprobada','pendiente','{}','{"periodicidades_permitidas":["mensual","bimestral"],"ventana_presentacion":"mes_calendario_siguiente_al_cierre","requiere_periodicidad_documentada":true}',
 'https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/anexos/Anexo30delasRGCEpara2026.pdf',
 'Leído Anexo 30 RGCE 2026, III a) y IV: informes mensuales y/o bimestrales dentro del mes calendario siguiente al cierre. Separado del inventario inicial, sin generar periodos inexistentes. No se establece día 17.',v_action,v_actor);
 INSERT INTO public.obligaciones_catalogo(programa,categoria,nombre,descripcion,articulos,presentacion,frecuencia_tipo,activo,obligatorio,created_by,notas_internas)
 VALUES('cert_iva_ieps','cert_iva_ieps','Inventario inicial SCCCyG — Anexo 30',
 'Transmitir el inventario existente o inicial al inicio de la certificación o aceptación del esquema de garantías, aun en ceros cuando corresponda. Verificar estatus válido y conservar el acuse. Registrar el evento y su fecha real; no se repite por cada mes ni por una renovación sin nuevo supuesto.',
 'Anexo 30 RGCE 2026, fracción I, incisos a) y b); RGCE 7.2.1, segundo párrafo, fracción IV',
 'Por inicio de certificación o garantía; plazo indicado de 30 días naturales',
 'EVENTUAL',true,false,v_actor,'Separado del control que mezclaba descargos e inventario inicial. No crear un evento histórico ni un nuevo vencimiento por el simple alta de esta definición.') RETURNING id INTO v_new;
 INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,aplicabilidad,parametros,fuente_url,fuente_referencia,importacion_referencia,created_by)
 VALUES(v_new,1,'evento','normativo','aprobada','pendiente','{}','{"plazo_dias":30,"sentido":"despues","dias_habiles":false,"activador":"entrada_en_vigor_certificacion_o_aceptacion_garantia"}',
 'https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/anexos/Anexo30delasRGCEpara2026.pdf',
 'Anexo 30 I a) y b): inicio real del supuesto, inventario aun en ceros y estatus válido. No se registra un evento ni se da por presentado el inventario existente.',v_action,v_actor);
 INSERT INTO public.obligaciones(empresa_id,catalogo_id,categoria,nombre,descripcion,articulos,presentacion,activa,estado,created_by)
 SELECT v_company,id,categoria,nombre,descripcion,articulos,presentacion,true,'vigente',v_actor FROM public.obligaciones_catalogo WHERE id=v_new;
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id IN(SELECT id FROM public.obligaciones WHERE catalogo_id=v_new)) THEN RAISE EXCEPTION 'Se creó vencimiento sin evento'; END IF;
 IF v_marks IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_occs IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x) THEN RAISE EXCEPTION 'Cambió un cumplimiento o periodo existente'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,record_id,old_values,new_values)
 VALUES(v_actor,v_action,'obligaciones_catalogo',v_cat,v_before,jsonb_build_object('estado','aplicado','catalogo_inventario_inicial',v_new,'empresas',1,'cumplimientos_hash',v_marks,'ocurrencias_hash',v_occs,'normativa_validada',false,'periodicidad_descargos','Documentar opción mensual/bimestral con empresa antes de generar fechas'));
END $$;
COMMIT;

-- Referencias fiscales generales del catálogo: ninguna asignación activa.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_action constant text:='revision_catalogo_fiscal_sin_asignaciones_20261023';
 v_actor constant uuid:='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
 v_items jsonb:=$criterios$[
  {
    "id": "775a46cc-0dca-4f94-9cc8-5e04402d34b1",
    "nombre": "DIOT — Declaración Informativa de Operaciones con Terceros",
    "descripcion": "Presentar la información mensual de operaciones con proveedores que corresponda a la empresa, conforme a la Ley del IVA y las facilidades de la RMF aplicables a su régimen.",
    "articulos": "Ley del IVA, artículo 32, fracción VIII; RMF 2026, regla 4.5.1",
    "presentacion": "Mensual; durante el mes inmediato posterior conforme a RMF 4.5.1 cuando resulte aplicable",
    "frecuencia": "MENSUAL",
    "dia": null,
    "fuente": "https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/RMF_2026-DOF-28122025.pdf",
    "referencia": "LIVA 32 VIII indica día 17 y RMF 4.5.1 permite proporcionar la información durante el mes inmediato posterior en los supuestos ahí previstos. Cotejadas las tres modificaciones publicadas de RMF 2026: sin reforma a 4.5.1. No fijar un día 17 universal ni presumir aplicación o exención por régimen."
  },
  {
    "id": "8b3502e4-25a8-46e0-a978-ff55b2b67f10",
    "nombre": "Contabilidad electrónica al Portal SAT",
    "descripcion": "Enviar la balanza de comprobación y los archivos de contabilidad electrónica aplicables al contribuyente. El catálogo de cuentas se presenta inicialmente y al modificarse; otros archivos se atienden según su supuesto.",
    "articulos": "CFF artículo 28, fracción IV; RMF 2026, reglas 2.8.1.5 y 2.8.1.6",
    "presentacion": "Balanza mensual y archivos según supuesto; plazo por tipo de contribuyente",
    "frecuencia": "MENSUAL",
    "dia": null,
    "fuente": "https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/RMF_2026-DOF-28122025.pdf",
    "referencia": "Leída RMF 2.8.1.6: catálogo inicial/modificado y balanza; personas morales primeros tres días del segundo mes posterior, físicas primeros cinco, con excepciones y ajustes propios. Tres modificaciones publicadas 2026 cotejadas sin reforma de esta regla. El día 17 genérico del catálogo no acredita su vencimiento."
  },
  {
    "id": "3f6d2c99-c9f5-4d14-95e2-0f8dc57440d2",
    "nombre": "Entero de ISR retenido a trabajadores",
    "descripcion": "Efectuar las retenciones y enteros mensuales del ISR por salarios que correspondan a los pagos realizados a trabajadores. Conservar declaración, determinación y comprobante del entero.",
    "articulos": "Ley del ISR, artículos 96 y 99, fracción I; CFF artículo 6, fracción I",
    "presentacion": "Mensual; plazo general del 17 del mes siguiente, sujeto a disposiciones aplicables",
    "frecuencia": "MENSUAL",
    "dia": 17,
    "fuente": "https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf",
    "referencia": "Se reemplaza la referencia genérica de certificación por el fundamento del entero fiscal de salarios. CFF 6 I consultado para plazo supletorio; no se valida integralmente el calendario ni extensiones particulares. Cero asignaciones activas."
  },
  {
    "id": "3d747b69-81a3-45a1-a4e6-c01f6c049fff",
    "nombre": "Pago anual de derechos art. 40 m) LFD (e5cinco)",
    "descripcion": "Realizar el pago de derechos por inscripción, renovación y anualidades que correspondan al registro, según la modalidad y vigencia autorizadas. Conservar comprobante y acreditar su presentación cuando proceda.",
    "articulos": "LFD artículos 4 y 40, inciso m), y párrafos aplicables; RGCE 7.2.1, fracción IX, y 7.2.3, según modalidad",
    "presentacion": "Anualidad, inscripción o renovación según supuesto; sin fecha única genérica",
    "frecuencia": "ANUAL",
    "dia": null,
    "fuente": "https://www.diputados.gob.mx/LeyesBiblio/pdf/LFD.pdf",
    "referencia": "Leídos LFD 4 y 40: inciso m) de pago anual y renovación; RGCE establece supuestos por modalidad y vigencia. No convertir automáticamente un aniversario de OEA en fecha universal de CERTIVA, ni cobrar dos veces un mismo concepto. Cuota y vencimiento concretos requieren modalidad, ejercicio y resolución; cero asignaciones activas."
  }
]$criterios$::jsonb;
 v_item jsonb; v_ids uuid[]; v_before jsonb; v_marks text; v_occs text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(v_action));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN RAISE EXCEPTION 'Administrador no encontrado'; END IF;
 SELECT array_agg((value->>'id')::uuid) INTO v_ids FROM jsonb_array_elements(v_items);
 PERFORM id FROM public.obligaciones_catalogo WHERE id=ANY(v_ids) AND activo FOR UPDATE;
 IF (SELECT count(*) FROM public.obligaciones_catalogo WHERE id=ANY(v_ids) AND activo)<>4 THEN RAISE EXCEPTION 'Cambió el catálogo'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligaciones WHERE catalogo_id=ANY(v_ids)) THEN RAISE EXCEPTION 'Hay asignaciones que requieren conciliación'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_reglas WHERE catalogo_id=ANY(v_ids) AND normativa_estado='validada') THEN RAISE EXCEPTION 'No sustituir normativa validada'; END IF;
 SELECT jsonb_build_object('catalogos',(SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM public.obligaciones_catalogo c WHERE id=ANY(v_ids)),
 'reglas',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM public.obligacion_reglas r WHERE catalogo_id=ANY(v_ids))) INTO v_before;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_occs FROM public.obligacion_ocurrencias x;
 FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
  UPDATE public.obligaciones_catalogo SET nombre=v_item->>'nombre',descripcion=v_item->>'descripcion',articulos=v_item->>'articulos',presentacion=v_item->>'presentacion',
  frecuencia_tipo=v_item->>'frecuencia',dia_vencimiento=(v_item->>'dia')::integer,mes_vencimiento=NULL,usar_ultimo_dia_habil=false,
  notas_internas=concat_ws(E'\n',nullif(notas_internas,''),v_item->>'referencia') WHERE id=(v_item->>'id')::uuid;
  INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,aplicabilidad,parametros,fuente_url,fuente_referencia,importacion_referencia,created_by)
  SELECT (v_item->>'id')::uuid,coalesce(max(version),0)+1,'periodica','normativo','aprobada','pendiente','{}','{}',v_item->>'fuente',v_item->>'referencia',v_action,v_actor
  FROM public.obligacion_reglas WHERE catalogo_id=(v_item->>'id')::uuid;
 END LOOP;
 IF v_marks IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_occs IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x) THEN RAISE EXCEPTION 'Cambió un antecedente'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,old_values,new_values) VALUES(v_actor,v_action,'obligaciones_catalogo',v_before,
 jsonb_build_object('estado','aplicado','criterios',4,'asignaciones',0,'cumplimientos_hash',v_marks,'ocurrencias_hash',v_occs,'normativa_validada',false));
END $$;
COMMIT;

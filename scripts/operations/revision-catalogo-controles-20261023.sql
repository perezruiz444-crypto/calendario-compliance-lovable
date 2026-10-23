-- Revisión general autorizada: controles permanentes y avisos; no acredita entregas.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_action constant text:='revision_catalogo_controles_20261023';
 v_actor constant uuid:='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
 v_items jsonb:= $criterios$[
  {
    "id": "b34c4595-d4eb-420f-a327-f73d640cb5ff",
    "esperadas": 1,
    "nombre": "Aviso CERTIVA de modificaciones de socios y relaciones comerciales",
    "descripcion": "Reportar a la AGACE, por Ventanilla Digital, las modificaciones de socios, accionistas, representantes legales con facultades para actos de dominio o integrantes de la administración, clientes y proveedores en el extranjero con operaciones de comercio exterior y proveedores nacionales, según corresponda. Registrar la modificación y presentar el aviso durante el mes inmediato siguiente.",
    "articulos": "Regla 7.2.1, segundo párrafo, fracción I, RGCE 2026",
    "presentacion": "Por modificación; presentar durante el mes inmediato siguiente",
    "tipo": "evento",
    "frecuencia": "EVENTUAL",
    "params": {
      "activador": "Modificación de los sujetos o relaciones comerciales comprendidos en la regla",
      "ventana_presentacion": "mes_calendario_inmediato_siguiente"
    },
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "Leída regla 7.2.1, segundo párrafo I; cotejadas primera y segunda modificaciones 2026: esta fracción permanece sin cambio. El día 17 heredado no se acredita como límite legal. La empresa registra sus modificaciones; no inventar avisos sin evento."
  },
  {
    "id": "214e1d0e-26cc-4bd1-a703-119da899e936",
    "esperadas": 6,
    "nombre": "Opinión positiva de cumplimiento fiscal",
    "descripcion": "Mantener el cumplimiento fiscal y verificar la opinión positiva expedida por el SAT. Conservar la opinión consultada y, cuando corresponda, la autorización de publicación.",
    "articulos": "CFF artículo 32-D; RMF reglas 2.1.24 y 2.1.36; RGCE 1.3.3, fracción III",
    "presentacion": "Condición permanente; revisión interna mensual el día 21",
    "tipo": "condicion",
    "frecuencia": "MENSUAL",
    "dia": 21,
    "origen": "mixto",
    "params": {
      "revision_interna": {
        "frecuencia": "mensual",
        "dia_inicio": 21,
        "dia_fin": 21,
        "desde": "2026-10-23"
      }
    },
    "fuente": "https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf",
    "referencia": "Control permanente; revisión mensual del día 21 tomada de OBLIGACIONES.xlsx, hoja Obligaciones, fila 3. La periodicidad es interna, no un plazo legal mensual para obtener la opinión. CFF 32-D y RMF 2.1.24/2.1.36 consultados; validación normativa integral pendiente."
  },
  {
    "id": "a148b98f-75b0-4f76-baa2-25a4af3fe3cd",
    "esperadas": 1,
    "nombre": "Pago de Cuotas Compensatorias",
    "descripcion": "Determinar y pagar las cuotas compensatorias que correspondan a las operaciones de importación, según la fracción arancelaria, origen y resolución aplicable. Conservar pedimento, determinación y pago o garantía procedente.",
    "articulos": "Ley de Comercio Exterior, artículos 62, 63 y 65; Ley Aduanera, artículos 52 y 81",
    "presentacion": "Por operación sujeta a cuota y resolución aplicable",
    "tipo": "evento",
    "frecuencia": "EVENTUAL",
    "params": {
      "activador": "Operación sujeta a una cuota compensatoria conforme a su resolución"
    },
    "fuente": "https://www.diputados.gob.mx/LeyesBiblio/pdf/LCE.pdf",
    "referencia": "LCE 63 identifica el aprovechamiento; 62 y 65 regulan determinación/cobro. No se presume cuota general, monto ni fecha fija; requiere resolución y operación identificadas."
  },
  {
    "id": "c5ee0a2a-8695-4540-b258-db6a8e1c7957",
    "esperadas": 2,
    "nombre": "Padrón de Importadores — mantener registro y datos actualizados",
    "descripcion": "Mantener la inscripción en el Padrón de Importadores y los datos y requisitos que correspondan a las operaciones de la empresa. Tramitar modificaciones o reincorporación cuando se presente el supuesto correspondiente.",
    "articulos": "Ley Aduanera, artículo 59, fracción IV; RGCE 1.3.2 y 1.3.3",
    "presentacion": "Condición permanente; trámites cuando cambien los datos o el estado del padrón",
    "tipo": "condicion",
    "frecuencia": "EVENTUAL",
    "params": {},
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "RGCE 1.3.2 trata inscripción y 1.3.3 suspensión. La referencia anterior RMF 1.3.1 no sustenta una renovación ni verificación anual legal. Se conserva el registro y su histórico; no se genera entrega anual."
  },
  {
    "id": "29ab3559-a650-41fb-9dc8-8c2e37eeefd3",
    "esperadas": 3,
    "nombre": "Padrón de Exportadores Sectorial — mantener inscripción vigente",
    "descripcion": "Mantener la inscripción y requisitos del Padrón de Exportadores Sectorial que correspondan a las mercancías exportadas. Tramitar actualizaciones, altas o bajas y, en su caso, dejar sin efectos una suspensión conforme al supuesto aplicable.",
    "articulos": "RGCE 1.3.7 y 1.3.3; Reglamento de la Ley Aduanera, artículo 87",
    "presentacion": "Condición permanente; sin solicitud anual genérica de renovación",
    "tipo": "condicion",
    "frecuencia": "EVENTUAL",
    "params": {},
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "Leída RGCE 1.3.7: inscripción y procedimiento para dejar sin efectos suspensión. No exige renovación anual genérica. Se conserva el antecedente de ITW sin atribuirle cobertura de otros periodos."
  },
  {
    "id": "cfe7b3f7-da3b-485a-bee9-6fbd993e6b64",
    "esperadas": 5,
    "nombre": "PROSEC — vigencia ligada al reporte anual",
    "descripcion": "Mantener vigente el programa PROSEC mediante el cumplimiento de sus condiciones y la presentación del informe anual de operaciones. La renovación es automática al presentar el informe anual; conservar la autorización y el acuse del reporte real.",
    "articulos": "Decreto PROSEC, artículo 7, último párrafo, y artículo 8",
    "presentacion": "Condición de vigencia; renovación automática vinculada al informe anual",
    "tipo": "condicion",
    "frecuencia": "EVENTUAL",
    "params": {},
    "fuente": "https://www.snice.gob.mx/~oracle/SNICE_DOCS/Decreto_prosec-Prosec_20240704-20240704.pdf",
    "referencia": "Criterio ya aprobado el 18/10/2026. Ahora se corrige texto y frecuencia de catálogo/empresas para que no parezca solicitud anual independiente. Compilación SNICE leída: artículos 7 y 8; normativa integral pendiente."
  }
]$criterios$::jsonb;
 v_item jsonb; v_cat uuid; v_rule public.obligacion_reglas%ROWTYPE;
 v_before jsonb; v_marks text; v_occs text; v_past text; v_others text;
 v_ids uuid[]; v_retired uuid[]:=ARRAY['35a957ad-b72b-4916-ae5b-574a093cde9f','d5219690-363c-4584-a47c-3d87b13a72ae']::uuid[];
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(v_action));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN RAISE EXCEPTION 'Administrador no encontrado'; END IF;
 SELECT array_agg((value->>'id')::uuid) INTO v_ids FROM jsonb_array_elements(v_items);
 PERFORM id FROM public.obligaciones_catalogo WHERE id=ANY(v_ids||v_retired) FOR UPDATE;
 PERFORM id FROM public.obligaciones WHERE catalogo_id=ANY(v_ids) AND activa FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.obligacion_reglas WHERE normativa_estado='validada' AND (catalogo_id=ANY(v_ids) OR obligacion_id IN(SELECT id FROM public.obligaciones WHERE catalogo_id=ANY(v_ids)))) THEN RAISE EXCEPTION 'Hay normativa validada fuera del alcance operativo'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_reglas r JOIN public.obligaciones o ON o.id=r.obligacion_id WHERE o.activa AND o.catalogo_id=ANY(v_ids)) THEN RAISE EXCEPTION 'Hay excepciones particulares que revisar'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligaciones WHERE catalogo_id=ANY(v_retired) AND activa) THEN RAISE EXCEPTION 'El catálogo duplicado tiene nuevas asignaciones activas'; END IF;
 SELECT jsonb_build_object('catalogos',(SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM public.obligaciones_catalogo c WHERE id=ANY(v_ids||v_retired)),
 'obligaciones',(SELECT jsonb_agg(to_jsonb(o) ORDER BY id) FROM public.obligaciones o WHERE catalogo_id=ANY(v_ids)),
 'reglas',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM public.obligacion_reglas r WHERE catalogo_id=ANY(v_ids))) INTO v_before;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x)-ARRAY['regla_id','regla_snapshot','origen_fecha','fecha_objetivo_interna','updated_at'] ORDER BY id)::text,'[]')) INTO v_occs FROM public.obligacion_ocurrencias x;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_past FROM public.obligacion_ocurrencias x WHERE fecha_vencimiento<'2026-10-23';
 SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id)::text,'[]')) INTO v_others FROM public.obligaciones o WHERE catalogo_id IS NULL OR NOT(catalogo_id=ANY(v_ids));
 FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
  v_cat:=(v_item->>'id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.obligaciones_catalogo WHERE id=v_cat AND activo) THEN RAISE EXCEPTION 'Catálogo inactivo o ausente'; END IF;
  IF (SELECT count(*) FROM public.obligaciones WHERE catalogo_id=v_cat AND activa)<>(v_item->>'esperadas')::integer THEN RAISE EXCEPTION 'Cambió alcance de %',v_item->>'nombre'; END IF;
  SELECT * INTO v_rule FROM public.obligacion_reglas WHERE catalogo_id=v_cat AND clasificacion_estado='aprobada' ORDER BY version DESC LIMIT 1;
  INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,aplicabilidad,parametros,fuente_url,fuente_referencia,importacion_referencia,created_by)
  SELECT v_cat,coalesce(max(version),0)+1,v_item->>'tipo',coalesce(v_item->>'origen',v_rule.origen_control,'mixto'),'aprobada','pendiente',coalesce(v_rule.aplicabilidad,'{}'),v_item->'params',v_item->>'fuente',v_item->>'referencia',v_action,v_actor
  FROM public.obligacion_reglas WHERE catalogo_id=v_cat;
  UPDATE public.obligaciones_catalogo SET nombre=v_item->>'nombre',descripcion=v_item->>'descripcion',articulos=v_item->>'articulos',presentacion=v_item->>'presentacion',
   frecuencia_tipo=v_item->>'frecuencia',dia_vencimiento=(v_item->>'dia')::integer,mes_vencimiento=NULL,usar_ultimo_dia_habil=false,
   notas_internas=concat_ws(E'\n',nullif(notas_internas,''),v_item->>'referencia') WHERE id=v_cat;
  UPDATE public.obligaciones SET nombre=v_item->>'nombre',descripcion=v_item->>'descripcion',articulos=v_item->>'articulos',presentacion=v_item->>'presentacion' WHERE catalogo_id=v_cat AND activa;
  IF EXISTS(SELECT 1 FROM public.obligaciones WHERE catalogo_id=v_cat AND activa AND public.obligacion_v2_tipo(id) IS DISTINCT FROM v_item->>'tipo') THEN RAISE EXCEPTION 'Clasificación efectiva distinta'; END IF;
 END LOOP;
 -- Solo los objetivos futuros ya existentes de opinión positiva, sin tocar fechas ni crear periodos.
 UPDATE public.obligacion_ocurrencias x SET regla_id=r.id,regla_snapshot=to_jsonb(r),origen_fecha='interna',fecha_objetivo_interna=x.fecha_vencimiento
 FROM public.obligaciones o CROSS JOIN LATERAL public.obligacion_v2_regla(o.id) r
 WHERE x.obligacion_id=o.id AND o.activa AND o.catalogo_id='214e1d0e-26cc-4bd1-a703-119da899e936'
 AND x.fecha_vencimiento>='2026-10-23' AND extract(day FROM x.fecha_vencimiento)=21 AND x.periodo_key=to_char(x.fecha_vencimiento,'YYYY-MM')
 AND x.origen_fecha IN('heredada','interna') AND x.evento_id IS NULL
 AND NOT EXISTS(SELECT 1 FROM public.obligacion_cumplimientos m WHERE m.ocurrencia_id=x.id OR (m.obligacion_id=x.obligacion_id AND m.periodo_key=x.periodo_key AND m.vigente));
 UPDATE public.obligaciones_catalogo SET activo=false,obligatorio=false,
 notas_internas=concat_ws(E'\n',nullif(notas_internas,''),CASE id
 WHEN '35a957ad-b72b-4916-ae5b-574a093cde9f' THEN 'Duplicado de declaración fiscal mensual de IVA 92cbb8be-aabf-4145-9b7d-f1703bc31c71. Cero asignaciones; usar el criterio fiscal confirmado por administrador.'
 ELSE 'Duplicado de INEGI 6a4f4015-ef50-46ae-b1fa-0bb6b9b011c3. Asignaciones duplicadas ya retiradas por autorización previa; conservar íntegramente historial inactivo.' END)
 WHERE id=ANY(v_retired);
 IF v_marks IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_occs IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x)-ARRAY['regla_id','regla_snapshot','origen_fecha','fecha_objetivo_interna','updated_at'] ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x)
 OR v_past IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x WHERE fecha_vencimiento<'2026-10-23')
 OR v_others IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id)::text,'[]')) FROM public.obligaciones o WHERE catalogo_id IS NULL OR NOT(catalogo_id=ANY(v_ids))) THEN RAISE EXCEPTION 'Cambió un cumplimiento, fecha, periodo o registro ajeno'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,old_values,new_values) VALUES(v_actor,v_action,'obligaciones_catalogo',v_before,
 jsonb_build_object('estado','aplicado','criterios',6,'asignaciones_activas',18,'catalogos_duplicados_retirados',2,'cumplimientos_hash',v_marks,'fechas_periodos_hash',v_occs,'historicos_hash',v_past,'otras_obligaciones_hash',v_others,'normativa_validada',false));
END $$;
COMMIT;

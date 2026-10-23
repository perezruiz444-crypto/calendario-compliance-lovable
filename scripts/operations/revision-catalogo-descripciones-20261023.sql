-- Segunda pasada: fases, referencias y consecuencias; preservar controles reales.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_action constant text:='revision_catalogo_descripciones_20261023';
 v_actor constant uuid:='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
 v_items jsonb:=$criterios$[
  {
    "id": "bc322a5f-7c14-4fe4-be37-bd3f54b26546",
    "esperadas": 5,
    "tipo": "riesgo",
    "fuente": "https://www.snice.gob.mx/~oracle/SNICE_DOCS/DECRETO-IMMEX-BIBLIOTECA_20250925-20250925.08.2025).pdf",
    "referencia": "Leído artículo 27 IV: el contenido es una causal de cancelación, no otra entrega. Se asocia a Domicilios, control real del artículo 24 VI, sin transformar ese control en riesgo. No afirmar cancelación de ninguna empresa.",
    "nombre": "Consecuencias del incumplimiento — mercancías fuera de domicilios IMMEX",
    "descripcion": "La falta de localización de mercancías importadas temporalmente en los domicilios registrados puede ser causal de cancelación del Programa IMMEX conforme al artículo 27, fracción IV. Mantener el control de domicilios y localización de las mercancías como seguimiento independiente.",
    "articulos": "Decreto IMMEX, artículo 27, fracción IV; control asociado: artículo 24, fracción VI",
    "presentacion": "Consecuencia del incumplimiento; vinculada al control de domicilios",
    "frecuencia": "EVENTUAL"
  },
  {
    "id": "e90d50d6-87b7-4912-a5b5-ff59683c2a03",
    "esperadas": 5,
    "tipo": "evento",
    "fuente": "https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/anexos/Anexo2delasRGCEpara2026.pdf",
    "referencia": "Leídas RGCE 4.3.5 y ficha 102/LA. Se corrige la referencia no acreditada al artículo 35 del Decreto IMMEX y la mención de presentar constancia ante SE. Aviso previo y acta posterior son fases del mismo proceso, con evidencia compartida; no se acredita destrucción ni se equiparan jurídicamente mermas y desperdicios.",
    "nombre": "Destrucción de desperdicios IMMEX — acta y evidencia",
    "descripcion": "Conservar el acta de hechos y la evidencia de la destrucción de desperdicios amparados por IMMEX. Cuando no asista la autoridad y proceda levantar el acta por la empresa, transmitirla conforme a la ficha 102/LA. El aviso para realizar la destrucción se sigue por separado dentro del mismo proceso.",
    "articulos": "Ley Aduanera, artículo 109; RGCE 4.3.5 y ficha 102/LA del Anexo 2",
    "presentacion": "Por destrucción realizada; acta y transmisión conforme a ficha 102/LA",
    "frecuencia": "EVENTUAL"
  },
  {
    "id": "10fd55c6-9ce8-4fc3-aa6e-d534d80b17af",
    "esperadas": 1,
    "tipo": "evento",
    "fuente": "https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/anexos/Anexo2delasRGCEpara2026.pdf",
    "referencia": "Se elimina el año erróneo 2032. La ficha 62/LA, descripción II y plazo II, sustenta cinco días siguientes al supuesto. No calcular días hábiles sin calendario normativo validado ni alterar antecedentes.",
    "articulos": "Regla 7.2.1, primer párrafo, fracción VIII, RGCE 2026; ficha 62/LA del Anexo 2",
    "presentacion": "Por cambio del documento del inmueble; cinco días siguientes conforme a ficha 62/LA"
  },
  {
    "id": "e97001de-b67c-42ef-8909-ddb28c43149f",
    "esperadas": 1,
    "tipo": "evento",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "Se corrige el año erróneo 2030; la fracción VI corresponde a fusión con personas morales del esquema de garantías. No se fusiona con avisos de otros supuestos de fusión.",
    "articulos": "Regla 7.2.1, primer párrafo, fracción VI, RGCE 2026"
  },
  {
    "id": "95fefae0-5769-4aae-a201-f58475a9c74c",
    "esperadas": 1,
    "tipo": "evento",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "Se elimina el año erróneo 2033. La regla establece un mes previo, no una equivalencia automática de treinta días. No recalcular fechas existentes.",
    "articulos": "Regla 7.2.1, primer párrafo, fracción X, RGCE 2026; ficha 62/LA",
    "presentacion": "Por mercancías adicionales; al menos un mes previo a su introducción"
  },
  {
    "id": "b57bcb72-71bf-4738-860d-fec7f38bd4e4",
    "esperadas": 1,
    "tipo": "vigencia",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "Leída regla 7.2.3: renovación vinculada al vencimiento real. No asumir periodicidad anual igual para rubros A, AA y AAA; conservar fechas de autorizaciones y antecedentes, sin inventar renovaciones.",
    "nombre": "Renovación de certificación IVA/IEPS según vigencia autorizada",
    "presentacion": "Según vigencia de la resolución; solicitud dentro de los treinta días previos al vencimiento",
    "frecuencia": "EVENTUAL"
  },
  {
    "id": "b8b8b653-efdd-4ee1-b1ca-0c6f7a6094c7",
    "esperadas": 6,
    "tipo": "evento",
    "fuente": "https://www.snice.gob.mx/~oracle/SNICE_DOCS/DECRETO-IMMEX-BIBLIOTECA_20250925-20250925.08.2025).pdf",
    "referencia": "Se amplía la descripción incompleta que solo decía e.firma. La obtención no es una renovación anual independiente. Se conserva identidad e historial de todas las asignaciones.",
    "nombre": "Requisitos de obtención y conservación del Programa IMMEX",
    "descripcion": "Verificar e.firma vigente, RFC activo, domicilios inscritos y activos, opinión positiva y requisitos fiscales aplicables a la autorización del Programa IMMEX. Conservar los documentos de la solicitud y de las verificaciones asociadas al reporte anual real; no crear otra solicitud anual de obtención.",
    "articulos": "Decreto IMMEX, artículo 11, fracción III; artículo 25",
    "presentacion": "Por solicitud o verificación asociada al reporte anual real"
  },
  {
    "id": "7963ce26-2f23-412d-a5fa-9df4108ff53f",
    "esperadas": 6,
    "tipo": "periodica",
    "fuente": "https://www.snice.gob.mx/~oracle/SNICE_DOCS/DECRETO-IMMEX-BIBLIOTECA_20250925-20250925.08.2025).pdf",
    "referencia": "Artículo 25 consultado: último día hábil de mayo. El 15 de abril capturado se distingue como objetivo interno; no se modifica la fecha histórica ni se valida un calendario jurídico por este cambio.",
    "presentacion": "Anual; límite indicado: último día hábil de mayo. Objetivo interno capturado: 15 de abril"
  },
  {
    "id": "d615a028-a3c9-4998-be01-26f412c4acc4",
    "esperadas": 4,
    "tipo": "periodica",
    "fuente": "https://www.snice.gob.mx/~oracle/SNICE_DOCS/Decreto_prosec-Prosec_20240704-20240704.pdf",
    "referencia": "Artículo 8 consultado: último día hábil de abril. El 15 de abril se identifica como objetivo interno; no se altera ni se acredita ningún periodo.",
    "presentacion": "Anual; límite indicado: último día hábil de abril. Objetivo interno capturado: 15 de abril"
  },
  {
    "id": "d33046d2-e306-4d4b-8a50-cbb5bf88897a",
    "esperadas": 5,
    "tipo": "condicion",
    "fuente": "https://www.snice.gob.mx/~oracle/SNICE_DOCS/DECRETO-IMMEX-BIBLIOTECA_20250925-20250925.08.2025).pdf",
    "referencia": "Artículo 24 I exige mantener el umbral de ventas/exportaciones. Marzo es revisión interna capturada; no es otra declaración anual ni el vencimiento del reporte del artículo 25.",
    "presentacion": "Condición anual de ventas/exportaciones; revisión interna capturada en marzo",
    "frecuencia": "EVENTUAL"
  },
  {
    "id": "dd9a828b-320a-4891-aeae-c4745577c99a",
    "esperadas": 5,
    "tipo": "evento",
    "fuente": "https://www.snice.gob.mx/~oracle/SNICE_DOCS/DECRETO-IMMEX-BIBLIOTECA_20250925-20250925.08.2025).pdf",
    "referencia": "Se evita presentar dieciocho meses como plazo universal. No se modifica ni recalcula una fecha histórica; el cálculo concreto requiere identificar el bien, régimen y beneficio aplicable.",
    "descripcion": "Controlar los plazos de retorno o cambio de régimen de cada mercancía importada temporalmente, según tipo de bien, régimen, fecha de importación y beneficios aplicables. Conservar pedimentos y el cálculo del plazo concreto por operación.",
    "articulos": "Ley Aduanera, artículo 108; Decreto IMMEX, artículos 4 y 24, fracción V",
    "presentacion": "Por operación y plazo aplicable a la mercancía"
  },
  {
    "id": "822c0fd7-f0b1-46e7-9ca5-0a9a60114afb",
    "esperadas": 4,
    "tipo": "evento",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "Leída RGCE 4.3.13 II: el supuesto es recepción de constancia, no periodicidad mensual automática. Hay excepción de pedimento de retorno ligada al IGI; conservar su análisis por operación. No mezclar con expedición mensual de constancias por industria terminal.",
    "nombre": "Retorno de autopartes por recepción de constancia C3 — apartado C",
    "presentacion": "Por recepción de constancia C3; apartado C: plazo indicado de sesenta días naturales",
    "articulos": "RGCE 4.3.13, fracción II; Decreto IMMEX, artículo 8"
  },
  {
    "id": "b98945ff-3ce6-4045-9168-a973c0aa3a15",
    "esperadas": 4,
    "tipo": "periodica",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "Leída RGCE 4.3.17: último día hábil de cada mes para industria terminal/fabricante de vehículos, distinto de recepción y retorno de autopartes. Se conserva el mensual confirmado en ITW y los otros alcances existentes; no se presume comprobado el papel industrial de cada empresa.",
    "articulos": "RGCE 4.3.17; Decreto IMMEX, artículo 8",
    "descripcion": "Expedir y entregar la constancia C3 a los proveedores de autopartes por las partes y componentes exportados o destinados al mercado nacional en el mes inmediato anterior, cuando la empresa actúe como industria automotriz terminal o fabricante de vehículos. Conservar la constancia y soporte del periodo."
  },
  {
    "id": "3121eaaa-0c58-4d08-9d50-dbb1f44f47e0",
    "esperadas": 1,
    "tipo": "condicion",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "Texto 2026 consultado: incluye 49 Bis X y 69-B cuarto párrafo. Mantener alcance de proveedores, distinto de la revisión del estado fiscal de la empresa; puede compartir evidencia con el control general de listados.",
    "descripcion": "Verificar que los proveedores comprendidos en el requisito no estén publicados en los listados previstos por los artículos 49 Bis, fracción X, o 69-B, cuarto párrafo, del CFF. Conservar la consulta y el análisis correspondiente.",
    "articulos": "Regla 7.1.2, primer párrafo, fracción V, RGCE 2026"
  },
  {
    "id": "e849f6e0-2d40-41e5-84d4-ae24d74f7c90",
    "esperadas": 0,
    "tipo": "condicion",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "Regla 7.2.1 exige mantener el perfil de seguridad. No se acreditó una remisión anual genérica de la matriz. Cero asignaciones: se conserva como herramienta interna opcional, sin activarla en empresas.",
    "origen": "interno",
    "nombre": "Matriz interna de seguridad OEA — mantenimiento del perfil",
    "descripcion": "Mantener los controles y la documentación interna que soportan el perfil de seguridad OEA aplicable. La matriz es una herramienta interna de seguimiento; los avisos ante AGACE se presentan cuando ocurra el supuesto correspondiente.",
    "articulos": "Regla 7.2.1, tercer párrafo, fracción III, RGCE 2026",
    "presentacion": "Condición permanente; sin remisión anual genérica de matriz al SAT",
    "frecuencia": "EVENTUAL",
    "obligatorio": false
  },
  {
    "id": "8e1bcc9e-7bb0-4fd2-80bd-b7d9f09dd070",
    "esperadas": 0,
    "tipo": "periodica",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5739205",
    "referencia": "Clasificación operativa basada en OBLIGACIONES.xlsx, Hoja1 fila 109, y artículo 65 del Acuerdo SENER reformado el 18/09/2024. Distinguir reportes anuales de permisos 39/41 y trimestrales de 40/42, así como agotamiento de cantidad. No se presume el tipo de permiso ni se valida integralmente la vigencia de este régimen tras reformas energéticas posteriores. Cero asignaciones; sin fechas generadas.",
    "origen": "mixto",
    "presentacion": "Según tipo de permiso: reporte anual o trimestral; también por agotamiento de cantidad",
    "frecuencia": "EVENTUAL",
    "articulos": "Artículo 65 del Acuerdo de mercancías reguladas por SENER, reforma DOF 18/09/2024"
  },
  {
    "id": "bb12f9ac-38d0-4a4e-a87d-5821959ab42b",
    "esperadas": 0,
    "tipo": "condicion",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "La cadencia capturada es planificación de revisión interna, no una entrega jurídica por ese solo intervalo. Cero asignaciones activas; sin nuevos periodos ni marcas.",
    "presentacion": "Condición permanente; revisión interna mensual"
  },
  {
    "id": "563cdb91-a23c-4dd1-91fd-6ea6735083b7",
    "esperadas": 0,
    "tipo": "condicion",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "La cadencia capturada es planificación de revisión interna, no una entrega jurídica por ese solo intervalo. Cero asignaciones activas; sin nuevos periodos ni marcas.",
    "presentacion": "Condición permanente; revisión interna trimestral"
  },
  {
    "id": "191fffa3-3f0e-472a-8e87-ab3a6934aea5",
    "esperadas": 0,
    "tipo": "condicion",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "La cadencia capturada es planificación de revisión interna, no una entrega jurídica por ese solo intervalo. Cero asignaciones activas; sin nuevos periodos ni marcas.",
    "presentacion": "Condición permanente; revisión interna trimestral"
  },
  {
    "id": "92d9b2e4-b2de-419d-9143-5bd0e223a8df",
    "esperadas": 0,
    "tipo": "condicion",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "La cadencia capturada es planificación de revisión interna, no una entrega jurídica por ese solo intervalo. Cero asignaciones activas; sin nuevos periodos ni marcas.",
    "presentacion": "Condición permanente; revisión interna trimestral"
  },
  {
    "id": "feef2e3c-6ec2-4203-ab6a-30343ec8fde1",
    "esperadas": 0,
    "tipo": "condicion",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "La cadencia capturada es planificación de revisión interna, no una entrega jurídica por ese solo intervalo. Cero asignaciones activas; sin nuevos periodos ni marcas.",
    "presentacion": "Condición permanente; revisión interna trimestral"
  },
  {
    "id": "8305a108-7d24-4b75-8cb7-081a093b8017",
    "esperadas": 0,
    "tipo": "condicion",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "La cadencia capturada es planificación de revisión interna, no una entrega jurídica por ese solo intervalo. Cero asignaciones activas; sin nuevos periodos ni marcas.",
    "presentacion": "Condición permanente; revisión interna trimestral"
  },
  {
    "id": "aa50b5c7-480e-4b46-8cf9-ac177c78c45c",
    "esperadas": 0,
    "tipo": "condicion",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "La cadencia capturada es planificación de revisión interna, no una entrega jurídica por ese solo intervalo. Cero asignaciones activas; sin nuevos periodos ni marcas.",
    "presentacion": "Condición permanente; revisión interna trimestral"
  },
  {
    "id": "a5b1937e-05d5-4b3f-8cb3-333e36e08b2b",
    "esperadas": 0,
    "tipo": "condicion",
    "fuente": "https://sidof.segob.gob.mx/notas/docFuente/5777199",
    "referencia": "La cadencia capturada es planificación de revisión interna, no una entrega jurídica por ese solo intervalo. Cero asignaciones activas; sin nuevos periodos ni marcas.",
    "presentacion": "Condición permanente; revisión interna semestral"
  },
  {
    "id": "925689fc-7511-4759-b412-d2dd26bb51ac",
    "esperadas": 4,
    "tipo": "condicion",
    "articulos": "Decreto PROSEC, artículo 8, último párrafo",
    "fuente": "https://www.snice.gob.mx/~oracle/SNICE_DOCS/Decreto_prosec-Prosec_20240704-20240704.pdf",
    "referencia": "Control permanente de inventarios, independiente del informe anual. Se elimina únicamente la prioridad particular accidental de ITW; conserva todas las versiones anteriores."
  },
  {
    "id": "d68056d1-365e-48a2-b54b-7a9a2ce05ee3",
    "esperadas": 4,
    "tipo": "riesgo",
    "articulos": "Decreto PROSEC, artículo 9",
    "fuente": "https://www.snice.gob.mx/~oracle/SNICE_DOCS/Decreto_prosec-Prosec_20240704-20240704.pdf",
    "referencia": "Consecuencia del incumplimiento, ya asociada a controles PROSEC. Se conserva como riesgo, sin crear entrega ni eliminar relaciones; la antigua alineación de ITW vuelve a heredar el catálogo."
  }
]$criterios$::jsonb;
 v_item jsonb; v_cat uuid; v_ids uuid[]; v_rule public.obligacion_reglas%ROWTYPE;
 v_retired uuid[]:=ARRAY['4c17ffd9-f376-4580-8536-65f2e3f5d1da','755b738d-a0ae-4759-b27d-484089e2db20','457a9148-d8a5-4fa1-8cbd-db0301c72b7d','459fd612-6f42-4d34-a0f8-65396076e228']::uuid[];
 v_before jsonb; v_marks text; v_occs text; v_reviews text; v_events text; v_others text; v_links integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(v_action));
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN RAISE EXCEPTION 'Administrador no encontrado'; END IF;
 SELECT array_agg((value->>'id')::uuid) INTO v_ids FROM jsonb_array_elements(v_items);
 PERFORM id FROM public.obligaciones_catalogo WHERE id=ANY(v_ids||v_retired) FOR UPDATE;
 PERFORM id FROM public.obligaciones WHERE catalogo_id=ANY(v_ids||v_retired) AND activa FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.obligacion_reglas WHERE normativa_estado='validada' AND (catalogo_id=ANY(v_ids||v_retired) OR obligacion_id IN(SELECT id FROM public.obligaciones WHERE catalogo_id=ANY(v_ids||v_retired)))) THEN RAISE EXCEPTION 'No sustituir normativa validada'; END IF;
 -- Revisar solo la última versión aprobada, no reactivar reglas históricas anteriores a una herencia.
 IF EXISTS(SELECT 1 FROM public.obligaciones o JOIN LATERAL(
 SELECT r.* FROM public.obligacion_reglas r WHERE r.obligacion_id=o.id AND r.clasificacion_estado='aprobada' ORDER BY version DESC LIMIT 1
 ) r ON true WHERE o.activa AND o.catalogo_id=ANY(v_ids) AND NOT(r.parametros @> '{"heredar_catalogo":true}')
 AND r.id NOT IN('ad1947c4-2e08-4c61-b8de-48d585f62e9b','28aea856-ed76-40eb-b2ba-dc969827530b','7477aeab-0113-4734-8ec6-964586e96b63')) THEN RAISE EXCEPTION 'Excepciones particulares por revisar'; END IF;
 IF (SELECT count(*) FROM public.obligacion_reglas WHERE id IN('ad1947c4-2e08-4c61-b8de-48d585f62e9b','28aea856-ed76-40eb-b2ba-dc969827530b','7477aeab-0113-4734-8ec6-964586e96b63') AND normativa_estado='pendiente' AND parametros='{}' AND aplicabilidad='{}')<>3 THEN RAISE EXCEPTION 'Cambiaron las tres alineaciones PROSEC'; END IF;
 IF (SELECT count(*) FROM public.obligaciones WHERE catalogo_id='4c17ffd9-f376-4580-8536-65f2e3f5d1da' AND activa)<>1 THEN RAISE EXCEPTION 'Cambió el duplicado de buzón'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligaciones WHERE catalogo_id=ANY(v_retired) AND catalogo_id<>'4c17ffd9-f376-4580-8536-65f2e3f5d1da' AND activa) THEN RAISE EXCEPTION 'Nuevas asignaciones de plantillas no utilizadas'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligaciones a JOIN public.obligaciones b ON b.empresa_id=a.empresa_id WHERE a.catalogo_id='4c17ffd9-f376-4580-8536-65f2e3f5d1da' AND a.activa AND b.catalogo_id='8d5f3ef8-d84d-4e87-831c-a0c65faedd98' AND b.activa) THEN RAISE EXCEPTION 'No hay buzón canónico para conciliar'; END IF;
 SELECT jsonb_build_object('catalogos',(SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM public.obligaciones_catalogo c WHERE id=ANY(v_ids||v_retired)),
 'obligaciones',(SELECT jsonb_agg(to_jsonb(o) ORDER BY id) FROM public.obligaciones o WHERE catalogo_id=ANY(v_ids||v_retired)),
 'reglas',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM public.obligacion_reglas r WHERE catalogo_id=ANY(v_ids)),
 'reglas_particulares',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM public.obligacion_reglas r WHERE obligacion_id IN('ad24899c-39e7-445e-92fa-a246be084a68','e9652bc3-38fd-449a-9e40-219123e0f7e6','00a5bd94-bda6-4bcb-b5b1-5555a04dc7e4'))) INTO v_before;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_marks FROM public.obligacion_cumplimientos c;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_occs FROM public.obligacion_ocurrencias x;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_reviews FROM public.obligacion_revisiones x;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) INTO v_events FROM public.obligacion_eventos x;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id)::text,'[]')) INTO v_others FROM public.obligaciones o WHERE catalogo_id IS NULL OR NOT(catalogo_id=ANY(v_ids||v_retired));
 FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
  v_cat:=(v_item->>'id')::uuid;
  IF (SELECT count(*) FROM public.obligaciones WHERE catalogo_id=v_cat AND activa)<>(v_item->>'esperadas')::integer THEN RAISE EXCEPTION 'Cambió el alcance de %',v_cat; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.obligaciones_catalogo WHERE id=v_cat AND activo) THEN RAISE EXCEPTION 'Catálogo ausente o inactivo'; END IF;
  SELECT * INTO v_rule FROM public.obligacion_reglas WHERE catalogo_id=v_cat AND clasificacion_estado='aprobada' ORDER BY version DESC LIMIT 1;
  INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,aplicabilidad,parametros,fuente_url,fuente_referencia,importacion_referencia,created_by)
  SELECT v_cat,coalesce(max(version),0)+1,v_item->>'tipo',coalesce(v_item->>'origen',v_rule.origen_control,'mixto'),'aprobada','pendiente',coalesce(v_rule.aplicabilidad,'{}'),coalesce(v_rule.parametros,'{}'),v_item->>'fuente',v_item->>'referencia',v_action,v_actor
  FROM public.obligacion_reglas WHERE catalogo_id=v_cat;
  UPDATE public.obligaciones_catalogo SET nombre=coalesce(v_item->>'nombre',nombre),descripcion=coalesce(v_item->>'descripcion',descripcion),articulos=coalesce(v_item->>'articulos',articulos),presentacion=coalesce(v_item->>'presentacion',presentacion),
   frecuencia_tipo=coalesce(v_item->>'frecuencia',frecuencia_tipo),
   dia_vencimiento=CASE WHEN v_item->>'frecuencia'='EVENTUAL' THEN NULL ELSE dia_vencimiento END,
   mes_vencimiento=CASE WHEN v_item->>'frecuencia'='EVENTUAL' THEN NULL ELSE mes_vencimiento END,
   usar_ultimo_dia_habil=CASE WHEN v_item->>'frecuencia'='EVENTUAL' THEN false ELSE usar_ultimo_dia_habil END,
   obligatorio=coalesce((v_item->>'obligatorio')::boolean,obligatorio),
   notas_internas=concat_ws(E'\n',nullif(notas_internas,''),v_item->>'referencia') WHERE id=v_cat;
  -- Trigger compartido propaga cada texto que seguía el catálogo; conserva textos particulares.
  IF EXISTS(SELECT 1 FROM public.obligaciones WHERE catalogo_id=v_cat AND activa AND public.obligacion_v2_tipo(id) IS DISTINCT FROM v_item->>'tipo') THEN RAISE EXCEPTION 'Clasificación efectiva distinta'; END IF;
 END LOOP;
 -- Tres alineaciones provisionales ya coincidentes con PROSEC general no son excepciones empresariales.
 INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,aplicabilidad,parametros,fuente_referencia,importacion_referencia,created_by)
 SELECT o.id,(SELECT coalesce(max(version),0)+1 FROM public.obligacion_reglas WHERE obligacion_id=o.id),r.tipo_control,r.origen_control,'aprobada','pendiente','{}','{"heredar_catalogo":true}',
 'Usar el catálogo general y sus próximas versiones; conservar la antigua alineación operativa PROSEC de ITW como antecedente.',v_action,v_actor
 FROM public.obligaciones o CROSS JOIN LATERAL(
 SELECT x.* FROM public.obligacion_reglas x WHERE x.catalogo_id=o.catalogo_id AND x.clasificacion_estado='aprobada' ORDER BY version DESC LIMIT 1
 ) r WHERE o.id IN('ad24899c-39e7-445e-92fa-a246be084a68','e9652bc3-38fd-449a-9e40-219123e0f7e6','00a5bd94-bda6-4bcb-b5b1-5555a04dc7e4') AND o.activa;
 -- Causal real -> consecuencia asociada al control real de domicilios, conservado como condición.
 INSERT INTO public.obligacion_relaciones(empresa_id,obligacion_origen_id,obligacion_destino_id,tipo,created_by)
 SELECT control.empresa_id,control.id,riesgo.id,'riesgo',v_actor FROM public.obligaciones control JOIN public.obligaciones riesgo ON riesgo.empresa_id=control.empresa_id
 WHERE control.catalogo_id='2e809e9a-46ba-4a72-803c-4d7f4becd684' AND control.activa AND riesgo.catalogo_id='bc322a5f-7c14-4fe4-be37-bd3f54b26546' AND riesgo.activa
 ON CONFLICT(obligacion_origen_id,obligacion_destino_id,tipo) DO NOTHING;
 SELECT count(*) INTO v_links FROM public.obligacion_relaciones r JOIN public.obligaciones d ON d.id=r.obligacion_destino_id WHERE d.catalogo_id='bc322a5f-7c14-4fe4-be37-bd3f54b26546' AND d.activa AND r.tipo='riesgo';
 IF v_links<>5 THEN RAISE EXCEPTION 'Faltan relaciones de las cinco empresas'; END IF;
 -- Aviso y acta son fases distintas de una destrucción: reutilizar evidencia, no inventar otro evento.
 INSERT INTO public.obligacion_relaciones(empresa_id,obligacion_origen_id,obligacion_destino_id,tipo,created_by)
 SELECT aviso.empresa_id,aviso.id,acta.id,'evidencia_compartida',v_actor FROM public.obligaciones aviso JOIN public.obligaciones acta ON acta.empresa_id=aviso.empresa_id
 WHERE aviso.catalogo_id='e0fa8dd7-95d3-4551-a6f8-bf8d2eeff324' AND aviso.activa AND acta.catalogo_id='e90d50d6-87b7-4912-a5b5-ff59683c2a03' AND acta.activa
 ON CONFLICT(obligacion_origen_id,obligacion_destino_id,tipo) DO NOTHING;
 INSERT INTO public.obligacion_relaciones(empresa_id,obligacion_origen_id,obligacion_destino_id,tipo,created_by)
 SELECT b.empresa_id,b.id,a.id,'evidencia_compartida',v_actor FROM public.obligaciones a JOIN public.obligaciones b ON b.empresa_id=a.empresa_id
 WHERE a.catalogo_id='4c17ffd9-f376-4580-8536-65f2e3f5d1da' AND a.activa AND b.catalogo_id='8d5f3ef8-d84d-4e87-831c-a0c65faedd98' AND b.activa
 ON CONFLICT(obligacion_origen_id,obligacion_destino_id,tipo) DO NOTHING;
 UPDATE public.obligaciones SET activa=false,notas=concat_ws(E'\n',nullif(notas,''),'Mismo control de contacto del buzón tributario. Usar el seguimiento general mensual del 21 al 23; conservar antecedentes, sin acreditar revisiones adicionales.') WHERE catalogo_id='4c17ffd9-f376-4580-8536-65f2e3f5d1da' AND activa;
 UPDATE public.obligaciones_catalogo SET activo=false,obligatorio=false,
 notas_internas=concat_ws(E'\n',nullif(notas_internas,''),CASE id
 WHEN '459fd612-6f42-4d34-a0f8-65396076e228' THEN 'Plantilla sin entrega semestral de operaciones acreditada en la regla citada. RGCE 7.2.2 establece causales de requerimiento; no confundir con aviso semestral de altas/bajas de transportistas de 7.2.1. Cero asignaciones. Retiro preventivo reversible del catálogo disponible hasta acreditar fundamento y alcance.'
 WHEN '755b738d-a0ae-4759-b27d-484089e2db20' THEN 'Referencia de verificación de opinión positiva integrada al control general compartido 214e1d0e-26cc-4bd1-a703-119da899e936; mantener una sola revisión por empresa. Cero asignaciones en esta definición.'
 ELSE 'Referencia de buzón tributario integrada al control general compartido 8d5f3ef8-d84d-4e87-831c-a0c65faedd98; revisión interna mensual del 21 al 23. Se conserva historial de referencias particulares.' END)
 WHERE id=ANY(v_retired);
 IF v_marks IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
 OR v_occs IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias x)
 OR v_reviews IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_revisiones x)
 OR v_events IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'[]')) FROM public.obligacion_eventos x)
 OR v_others IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id)::text,'[]')) FROM public.obligaciones o WHERE catalogo_id IS NULL OR NOT(catalogo_id=ANY(v_ids||v_retired))) THEN RAISE EXCEPTION 'Cambió historial o registros ajenos'; END IF;
 INSERT INTO public.audit_logs(user_id,action,table_name,old_values,new_values) VALUES(v_actor,v_action,'obligaciones_catalogo',v_before,
 jsonb_build_object('estado','aplicado','criterios',26,'asignaciones_en_alcance',57,'alineaciones_prosec_ahora_compartidas',3,'catalogos_retirados',4,'asignaciones_duplicadas_retiradas',1,'relaciones_riesgo_immex',v_links,
 'cumplimientos_hash',v_marks,'ocurrencias_hash',v_occs,'revisiones_hash',v_reviews,'eventos_hash',v_events,'otras_obligaciones_hash',v_others,'normativa_validada',false));
END $$;
COMMIT;

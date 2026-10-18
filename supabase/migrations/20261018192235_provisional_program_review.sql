-- Configuración OPERATIVA provisional autorizada por el administrador, sujeta a revisión de Fernanda.
-- No valida normativa, no cambia fechas, no elimina obligaciones ni historial.
BEGIN;
WITH propuestas(catalogo_id,tipo,nota) AS (VALUES
('75190e24-2d37-405f-bcd0-c714675bfeff'::uuid,'condicion','Conservar como control permanente del destino autorizado. Art. 10, primer párrafo.'),
('d68056d1-365e-48a2-b54b-7a9a2ce05ee3'::uuid,'riesgo','Vincular como consecuencia del incumplimiento; no como trámite o entrega. Art. 9.'),
('925689fc-7511-4759-b412-d2dd26bb51ac'::uuid,'condicion','Control permanente, no entrega anual. Art. 8, último párrafo.'),
('025191f8-c3d7-4384-92d7-5713b07f4732'::uuid,'condicion','Conservar restricción permanente y comprobar condiciones cuando exista enajenación. Art. 10, segundo párrafo.'),
('cfe7b3f7-da3b-485a-bee9-6fbd993e6b64'::uuid,'condicion','Renovación automática vinculada al reporte anual; no generar otra solicitud. Fundamento a corregir: art. 7, último párrafo.'),
('d615a028-a3c9-4998-be01-26f412c4acc4'::uuid,'periodica','Anual. En 2026: 30/04 solo PROSEC; 29/05 si también IMMEX/ALTEX/ECEX, según guía SNICE. 15/04 solo puede ser meta interna. No recalcular históricos sin revisar empresa, periodo y evidencia.')
)
INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,parametros,fuente_url,fuente_referencia,importacion_referencia)
SELECT p.catalogo_id,coalesce((SELECT max(version) FROM public.obligacion_reglas r WHERE r.catalogo_id=p.catalogo_id),0)+1,p.tipo,'mixto','aprobada','pendiente','{}'::jsonb,
'https://www.snice.gob.mx/~oracle/SNICE_DOCS/DECRETO-PROSEC-BIBLIOTECA_20240826-20240826.pdf',
'Propuesta operativa provisional: '||p.nota,'revision-programas-20261018'
FROM propuestas p JOIN public.obligaciones_catalogo c ON c.id=p.catalogo_id
WHERE NOT EXISTS(SELECT 1 FROM public.obligacion_reglas r WHERE r.catalogo_id=p.catalogo_id AND r.importacion_referencia='revision-programas-20261018')
AND NOT EXISTS(SELECT 1 FROM public.obligacion_reglas r WHERE r.catalogo_id=p.catalogo_id AND r.normativa_estado='validada');
-- Tres excepciones operativas anteriores tienen prioridad sobre el catálogo.
-- Versionarlas explícitamente; nunca editar la versión anterior ni una normativa validada.
WITH ajustes(obligacion_id,catalogo_id,tipo) AS (VALUES
 ('00a5bd94-bda6-4bcb-b5b1-5555a04dc7e4'::uuid,'d615a028-a3c9-4998-be01-26f412c4acc4'::uuid,'periodica'),
 ('ad24899c-39e7-445e-92fa-a246be084a68'::uuid,'925689fc-7511-4759-b412-d2dd26bb51ac'::uuid,'condicion'),
 ('e9652bc3-38fd-449a-9e40-219123e0f7e6'::uuid,'d68056d1-365e-48a2-b54b-7a9a2ce05ee3'::uuid,'riesgo')
)
INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,fuente_url,fuente_referencia,importacion_referencia)
SELECT o.id,coalesce((SELECT max(version) FROM public.obligacion_reglas r WHERE r.obligacion_id=o.id),0)+1,a.tipo,'mixto','aprobada','pendiente',
 'https://www.snice.gob.mx/~oracle/SNICE_DOCS/DECRETO-PROSEC-BIBLIOTECA_20240826-20240826.pdf',
 'Alineación operativa provisional con revisión PROSEC; no valida plazo ni modifica historial.','revision-programas-20261018'
FROM ajustes a JOIN public.obligaciones o ON o.id=a.obligacion_id AND o.catalogo_id=a.catalogo_id
WHERE NOT EXISTS(SELECT 1 FROM public.obligacion_reglas r WHERE r.obligacion_id=o.id AND (r.normativa_estado='validada' OR r.importacion_referencia='revision-programas-20261018'));
-- La consecuencia queda enlazada a controles y reporte de la MISMA empresa.
INSERT INTO public.obligacion_relaciones(empresa_id,obligacion_origen_id,obligacion_destino_id,tipo,created_by)
SELECT o.empresa_id,o.id,riesgo.id,'riesgo',actor.id FROM public.obligaciones o
JOIN public.obligaciones riesgo ON riesgo.empresa_id=o.empresa_id AND riesgo.catalogo_id='d68056d1-365e-48a2-b54b-7a9a2ce05ee3' AND riesgo.activa
JOIN public.profiles actor ON actor.id='f623e0d3-37b5-4ff4-be4f-cc73c99c85c4'
JOIN public.user_roles ur ON ur.user_id=actor.id AND ur.role='administrador'
WHERE o.activa AND o.catalogo_id IN ('75190e24-2d37-405f-bcd0-c714675bfeff','925689fc-7511-4759-b412-d2dd26bb51ac','025191f8-c3d7-4384-92d7-5713b07f4732','d615a028-a3c9-4998-be01-26f412c4acc4')
AND public.obligacion_v2_tipo(riesgo.id)='riesgo'
ON CONFLICT(obligacion_origen_id,obligacion_destino_id,tipo) DO NOTHING;
COMMIT;


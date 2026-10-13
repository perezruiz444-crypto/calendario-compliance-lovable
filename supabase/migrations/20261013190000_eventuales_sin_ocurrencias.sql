-- Eventuales: una versión anterior del generador les creó una ocurrencia "2026" con vencimiento 01/01,
-- y por eso salían VENCIDO. Se borran las que no tienen ningún cumplimiento ligado (las que sí, se conservan).
DELETE FROM public.obligacion_ocurrencias oc
 USING public.obligaciones o, public.obligaciones_catalogo c
 WHERE oc.obligacion_id = o.id AND o.catalogo_id = c.id AND c.frecuencia_tipo = 'EVENTUAL'
   AND NOT EXISTS (SELECT 1 FROM public.obligacion_cumplimientos x WHERE x.ocurrencia_id = oc.id);

-- Avisos derivados del usuario autenticado. Sin destinatarios ni contenido elegibles desde el cliente.
BEGIN;
CREATE OR REPLACE FUNCTION public.generar_mis_avisos_obligaciones()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count integer; v_today date:=(now() AT TIME ZONE 'America/Mexico_City')::date;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión requerida' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND coalesce((to_jsonb(p)->>'notificaciones_activas')::boolean,true)) THEN RETURN 0; END IF;
 WITH occurrences AS (
  SELECT oc.id::text AS action_id,o.id AS obligacion_id,o.empresa_id,o.nombre,oc.fecha_vencimiento AS fecha,oc.origen_fecha AS origen
  FROM public.obligacion_ocurrencias oc JOIN public.obligaciones o ON o.id=oc.obligacion_id
  CROSS JOIN LATERAL(SELECT public.obligacion_v2_tipo(o.id) AS tipo)t
  WHERE o.activa AND public.obligacion_v2_puede_registrar(o.id)
   AND (coalesce(t.tipo,'periodica')='periodica' OR (t.tipo='condicion' AND oc.origen_fecha='interna') OR(t.tipo='evento' AND oc.evento_id IS NOT NULL) OR(t.tipo='vigencia' AND (oc.evento_id IS NOT NULL OR oc.origen_fecha='interna')))
   AND NOT EXISTS(SELECT 1 FROM public.obligacion_cumplimientos c WHERE c.obligacion_id=o.id AND c.ocurrencia_id=oc.id AND c.periodo_key=oc.periodo_key AND c.vigente AND c.completada)
 ),latest_review AS (
  SELECT DISTINCT ON(r.obligacion_id) r.* FROM public.obligacion_revisiones r ORDER BY r.obligacion_id,r.revisada_en DESC,r.id DESC
 ),internal_reviews AS (
  SELECT 'revision:'||r.id::text AS action_id,o.id AS obligacion_id,o.empresa_id,o.nombre,r.proxima_revision AS fecha,'interna'::text AS origen
  FROM latest_review r JOIN public.obligaciones o ON o.id=r.obligacion_id
  WHERE o.activa AND public.obligacion_v2_puede_registrar(o.id) AND public.obligacion_v2_tipo(o.id)='condicion' AND r.proxima_revision IS NOT NULL
 ),candidates AS (
  SELECT * FROM occurrences UNION ALL SELECT * FROM internal_reviews
 ),windows AS (
  SELECT *,CASE WHEN fecha<v_today THEN 'atrasado' ELSE (fecha-v_today)::text END AS window_key FROM candidates
  WHERE fecha<v_today OR fecha-v_today IN (0,1,7,30)
 )
 INSERT INTO public.notificaciones(id,user_id,tipo,titulo,contenido,referencia_id,referencia_tipo,leida)
 SELECT md5('obligacion-v2:'||auth.uid()::text||':'||action_id||':'||fecha::text||':'||window_key)::uuid,
  auth.uid(),'obligacion_v2_'||window_key,
  CASE WHEN origen='interna' THEN 'Revisión interna: ' ELSE 'Fecha registrada: ' END||nombre,
  'Fecha: '||fecha::text||CASE WHEN origen='heredada' THEN ' · Regla por validar' ELSE '' END,
  obligacion_id,'obligacion',false FROM windows ON CONFLICT(id) DO NOTHING;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.generar_mis_avisos_obligaciones() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.generar_mis_avisos_obligaciones() TO authenticated;
COMMIT;

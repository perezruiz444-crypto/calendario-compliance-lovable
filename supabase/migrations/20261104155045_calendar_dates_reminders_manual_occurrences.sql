-- Fechas capturadas sin recurrencias inferidas y recordatorios por empresa.
BEGIN;
-- El widget de consultores necesita las reglas globales y las de sus empresas asignadas.
-- La administración y las escrituras conservan sus políticas existentes.
DROP POLICY IF EXISTS recordatorios_lectura_consultor ON public.reminder_rules;
CREATE POLICY recordatorios_lectura_consultor ON public.reminder_rules FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.role='consultor')
 AND (empresa_id IS NULL OR EXISTS(SELECT 1 FROM public.consultor_empresa_asignacion a
   WHERE a.consultor_id=auth.uid() AND a.empresa_id=reminder_rules.empresa_id))
);
CREATE OR REPLACE FUNCTION public.reminder_days(p_tipo text,p_empresa_id uuid,p_defaults integer[] DEFAULT ARRAY[1,7,30])
RETURNS integer[] LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 WITH matching AS (
  SELECT * FROM public.reminder_rules WHERE tipo=p_tipo AND (empresa_id IS NULL OR empresa_id=p_empresa_id)
 ),selected AS (
  SELECT * FROM matching WHERE empresa_id=p_empresa_id
   OR NOT EXISTS(SELECT 1 FROM matching WHERE empresa_id=p_empresa_id)
 )
 SELECT CASE WHEN EXISTS(SELECT 1 FROM selected)
  THEN coalesce((SELECT array_agg(DISTINCT dias_antes ORDER BY dias_antes) FROM selected WHERE activa AND dias_antes>0),ARRAY[]::integer[])
  ELSE p_defaults END;
$$;
REVOKE ALL ON FUNCTION public.reminder_days(text,uuid,integer[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reminder_days(text,uuid,integer[]) TO authenticated,service_role;

-- Solo una fecha explícita; no se fabrican los demás periodos de una regla pendiente.
CREATE OR REPLACE FUNCTION public.registrar_fecha_manual_obligacion(p_obligacion_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ob public.obligaciones%ROWTYPE; v_tipo text; v_claim text;
BEGIN
 SELECT * INTO v_ob FROM public.obligaciones WHERE id=p_obligacion_id FOR UPDATE;
 IF NOT FOUND OR NOT v_ob.activa THEN RETURN; END IF;
 v_claim:=coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','');
 IF auth.uid() IS NOT NULL THEN
  IF NOT public.obligacion_v2_puede_registrar(p_obligacion_id) THEN RAISE EXCEPTION 'Sin permiso sobre la obligación' USING ERRCODE='42501'; END IF;
 ELSIF session_user<>'postgres' AND v_claim<>'service_role' THEN
  RAISE EXCEPTION 'Sesión requerida' USING ERRCODE='42501';
 END IF;
 IF v_ob.fecha_vencimiento IS NULL THEN
  IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias oc JOIN public.obligacion_cumplimientos c ON c.ocurrencia_id=oc.id
    WHERE oc.obligacion_id=v_ob.id AND oc.regla_snapshot @> '{"fecha_manual":true}'::jsonb) THEN
   RAISE EXCEPTION 'La fecha ya tiene historial de cumplimiento; consérvala' USING ERRCODE='23514';
  END IF;
  DELETE FROM public.obligacion_ocurrencias WHERE obligacion_id=v_ob.id AND periodo_key='manual'
    AND regla_snapshot @> '{"fecha_manual":true}'::jsonb;
  RETURN;
 END IF;
 v_tipo:=public.obligacion_v2_tipo(v_ob.id);
 -- Eventos y controles tienen sus propios registros; una semilla no los sustituye.
 IF v_tipo IS NOT NULL AND v_tipo<>'periodica' THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id=v_ob.id AND periodo_key<>'manual') THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias oc JOIN public.obligacion_cumplimientos c ON c.ocurrencia_id=oc.id
   WHERE oc.obligacion_id=v_ob.id AND oc.periodo_key='manual' AND oc.fecha_vencimiento<>v_ob.fecha_vencimiento) THEN
  RAISE EXCEPTION 'La fecha ya tiene historial de cumplimiento; registra una nueva acción para conservarlo' USING ERRCODE='23514';
 END IF;
 INSERT INTO public.obligacion_ocurrencias AS existing(obligacion_id,empresa_id,periodo_key,fecha_vencimiento,origen_fecha,regla_snapshot)
 VALUES(v_ob.id,v_ob.empresa_id,'manual',v_ob.fecha_vencimiento,'heredada','{"fecha_manual":true}'::jsonb)
 ON CONFLICT(obligacion_id,periodo_key) DO UPDATE SET fecha_vencimiento=excluded.fecha_vencimiento
 WHERE existing.regla_snapshot @> '{"fecha_manual":true}'::jsonb
   AND existing.fecha_vencimiento IS DISTINCT FROM excluded.fecha_vencimiento;
END $$;
REVOKE ALL ON FUNCTION public.registrar_fecha_manual_obligacion(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.registrar_fecha_manual_obligacion(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.trg_registrar_fecha_manual_obligacion()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 -- Un alta automática desde catálogo puede traer una semilla antigua, no una fecha capturada.
 -- Su fecha manual se registra explícitamente desde el diálogo de activación.
 IF (TG_OP='INSERT' AND NEW.catalogo_id IS NULL) OR (TG_OP='UPDATE' AND (
   NEW.fecha_vencimiento IS DISTINCT FROM OLD.fecha_vencimiento
   OR (NEW.activa IS DISTINCT FROM OLD.activa AND (NEW.catalogo_id IS NULL OR EXISTS(
     SELECT 1 FROM public.obligacion_ocurrencias oc WHERE oc.obligacion_id=NEW.id
       AND oc.regla_snapshot @> '{"fecha_manual":true}'::jsonb))))) THEN
  PERFORM public.registrar_fecha_manual_obligacion(NEW.id);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.trg_registrar_fecha_manual_obligacion() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_registrar_fecha_manual ON public.obligaciones;
CREATE TRIGGER trg_registrar_fecha_manual AFTER INSERT OR UPDATE OF fecha_vencimiento,activa ON public.obligaciones
 FOR EACH ROW EXECUTE FUNCTION public.trg_registrar_fecha_manual_obligacion();

-- Recupera solo obligaciones personalizadas; las semillas históricas de catálogo
-- requieren confirmación explícita y no se convierten en nuevos atrasos al desplegar.
SELECT public.registrar_fecha_manual_obligacion(o.id) FROM public.obligaciones o
 WHERE o.activa AND o.catalogo_id IS NULL AND o.fecha_vencimiento IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.obligacion_ocurrencias oc WHERE oc.obligacion_id=o.id);

CREATE OR REPLACE FUNCTION public.generar_mis_avisos_obligaciones()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count integer; v_today date:=(now() AT TIME ZONE 'America/Mexico_City')::date;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión requerida' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND coalesce((to_jsonb(p)->>'notificaciones_activas')::boolean,true)) THEN RETURN 0; END IF;
 WITH occurrences AS (
  SELECT oc.id::text AS action_id,o.id AS obligacion_id,o.empresa_id,o.categoria,o.nombre,oc.fecha_vencimiento AS fecha,oc.origen_fecha AS origen
  FROM public.obligacion_ocurrencias oc JOIN public.obligaciones o ON o.id=oc.obligacion_id
  CROSS JOIN LATERAL(SELECT public.obligacion_v2_tipo(o.id) AS tipo)t
  WHERE o.activa AND public.obligacion_v2_puede_registrar(o.id)
   AND (coalesce(t.tipo,'periodica')='periodica' OR (t.tipo='condicion' AND oc.origen_fecha='interna') OR(t.tipo='evento' AND oc.evento_id IS NOT NULL) OR(t.tipo='vigencia' AND (oc.evento_id IS NOT NULL OR oc.origen_fecha='interna')))
   AND NOT EXISTS(SELECT 1 FROM public.obligacion_cumplimientos c WHERE c.obligacion_id=o.id AND c.ocurrencia_id=oc.id AND c.periodo_key=oc.periodo_key AND c.vigente AND c.completada)
 ),latest_review AS (
  SELECT DISTINCT ON(r.obligacion_id) r.* FROM public.obligacion_revisiones r ORDER BY r.obligacion_id,r.revisada_en DESC,r.id DESC
 ),internal_reviews AS (
  SELECT 'revision:'||r.id::text AS action_id,o.id AS obligacion_id,o.empresa_id,o.categoria,o.nombre,r.proxima_revision AS fecha,'interna'::text AS origen
  FROM latest_review r JOIN public.obligaciones o ON o.id=r.obligacion_id
  WHERE o.activa AND public.obligacion_v2_puede_registrar(o.id) AND public.obligacion_v2_tipo(o.id)='condicion' AND r.proxima_revision IS NOT NULL
 ),candidates AS (
  SELECT * FROM occurrences UNION ALL SELECT * FROM internal_reviews
 ),windows AS (
  SELECT *,CASE WHEN fecha<v_today THEN 'atrasado' ELSE (fecha-v_today)::text END AS window_key FROM candidates
  WHERE fecha<=v_today OR fecha-v_today=ANY(public.reminder_days(
   CASE categoria WHEN 'cert_iva_ieps' THEN 'certificacion' WHEN 'immex' THEN 'immex' WHEN 'prosec' THEN 'prosec' ELSE 'general' END,empresa_id))
 )
 INSERT INTO public.notificaciones(id,user_id,tipo,titulo,contenido,referencia_id,referencia_tipo,leida)
 SELECT md5('obligacion-v2:'||auth.uid()::text||':'||action_id||':'||fecha::text||':'||window_key)::uuid,
  auth.uid(),'tarea_vencimiento',
  CASE WHEN origen='interna' THEN 'Revisión interna: ' ELSE 'Fecha registrada: ' END||nombre,
  'Fecha: '||fecha::text||CASE WHEN origen='heredada' THEN ' · Regla por validar' ELSE '' END,
  obligacion_id,'obligacion',false FROM windows ON CONFLICT(id) DO NOTHING;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.generar_mis_avisos_obligaciones() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.generar_mis_avisos_obligaciones() TO authenticated;
COMMIT;

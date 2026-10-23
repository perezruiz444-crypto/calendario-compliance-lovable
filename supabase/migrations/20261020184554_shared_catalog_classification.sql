-- Criterio compartido por defecto; las excepciones reales conservan prioridad.
BEGIN;
CREATE OR REPLACE FUNCTION public.obligacion_v2_regla(p_obligacion_id uuid)
RETURNS SETOF public.obligacion_reglas LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 WITH particular AS (
  SELECT r.* FROM public.obligacion_reglas r WHERE r.obligacion_id=p_obligacion_id AND r.clasificacion_estado='aprobada'
  ORDER BY r.version DESC LIMIT 1
 ), especifica AS (SELECT * FROM particular WHERE NOT (parametros @> '{"heredar_catalogo":true}'::jsonb))
 SELECT * FROM especifica
 UNION ALL
 SELECT r.* FROM public.obligacion_reglas r JOIN public.obligaciones o ON o.id=p_obligacion_id AND r.catalogo_id=o.catalogo_id
 WHERE r.clasificacion_estado='aprobada' AND NOT EXISTS(SELECT 1 FROM especifica)
 ORDER BY version DESC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.obligacion_v2_regla(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.obligacion_v2_regla(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.obligacion_v2_tipo(p_obligacion_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT tipo_control FROM public.obligacion_v2_regla(p_obligacion_id);
$$;
CREATE OR REPLACE FUNCTION public.generar_ocurrencias_obligacion_anio(p_obligacion_id uuid,p_year integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ob public.obligaciones%ROWTYPE; v_regla public.obligacion_reglas%ROWTYPE; v_step integer; v_mes integer; v_inicio integer; v_fin integer; v_result jsonb; v_claim_role text; v_date date; v_from date; v_start integer; v_end integer; v_schedule jsonb; v_due date; v_target date;
BEGIN
 SELECT * INTO v_ob FROM public.obligaciones WHERE id=p_obligacion_id;
 IF NOT FOUND OR NOT v_ob.activa THEN RETURN; END IF;
 v_claim_role:=coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','');
 IF auth.uid() IS NOT NULL THEN
  IF NOT public.obligacion_v2_puede_registrar(p_obligacion_id) THEN RAISE EXCEPTION 'Sin permiso sobre la obligación' USING ERRCODE='42501'; END IF;
 ELSIF session_user<>'postgres' AND v_claim_role<>'service_role' THEN RAISE EXCEPTION 'Sesión requerida' USING ERRCODE='42501'; END IF;
 IF p_year<2000 OR p_year>2200 THEN RAISE EXCEPTION 'Año fuera de rango' USING ERRCODE='23514'; END IF;
 SELECT * INTO v_regla FROM public.obligacion_v2_regla(v_ob.id);
 IF FOUND AND v_regla.tipo_control='periodica' AND v_regla.aplicabilidad='{}'::jsonb
   AND v_regla.parametros->'programacion_interna'->>'frecuencia'='mensual' THEN
  v_schedule:=v_regla.parametros->'programacion_interna';
  v_end:=(v_schedule->>'dia')::integer;
  v_from:=(v_schedule->>'desde')::date;
  IF v_end IS NULL OR v_end<1 OR v_end>28 OR v_from IS NULL
    OR v_schedule->'calendario'->'feriados' IS NULL
    OR jsonb_typeof(v_schedule->'calendario'->'feriados')<>'array' THEN
   RAISE EXCEPTION 'Programación operativa incompleta' USING ERRCODE='23514';
  END IF;
  -- Sin calendario explícito para el año, no fabricar un objetivo hábil.
  IF NOT (v_schedule->'calendario'->'anios' @> jsonb_build_array(p_year)) THEN RETURN; END IF;
  FOR v_mes IN 1..12 LOOP
   v_due:=make_date(p_year,v_mes,v_end);
   IF v_due<greatest(v_from,(now() AT TIME ZONE 'America/Mexico_City')::date,
     (v_ob.created_at AT TIME ZONE 'America/Mexico_City')::date) THEN CONTINUE; END IF;
   v_target:=v_due-1;
   WHILE extract(isodow FROM v_target)>5 OR (v_schedule->'calendario'->'feriados' ? v_target::text) LOOP
    v_target:=v_target-1;
   END LOOP;
   INSERT INTO public.obligacion_ocurrencias AS existing
    (obligacion_id,empresa_id,periodo_key,fecha_vencimiento,regla_id,regla_snapshot,origen_fecha,fecha_objetivo_interna)
   VALUES(v_ob.id,v_ob.empresa_id,to_char(v_due,'YYYY-MM'),v_due,v_regla.id,to_jsonb(v_regla),'interna',v_target)
   ON CONFLICT(obligacion_id,periodo_key) DO UPDATE SET
    fecha_vencimiento=excluded.fecha_vencimiento,regla_id=excluded.regla_id,regla_snapshot=excluded.regla_snapshot,
    origen_fecha='interna',fecha_objetivo_interna=excluded.fecha_objetivo_interna
   WHERE existing.fecha_vencimiento>=(now() AT TIME ZONE 'America/Mexico_City')::date
    AND existing.origen_fecha IN ('heredada','interna') AND existing.evento_id IS NULL
    AND NOT EXISTS(SELECT 1 FROM public.obligacion_cumplimientos c WHERE c.ocurrencia_id=existing.id OR (c.obligacion_id=existing.obligacion_id AND c.periodo_key=existing.periodo_key AND c.vigente))
    AND (existing.fecha_vencimiento,existing.regla_id,existing.regla_snapshot,existing.origen_fecha,existing.fecha_objetivo_interna)
      IS DISTINCT FROM (excluded.fecha_vencimiento,excluded.regla_id,excluded.regla_snapshot,'interna',excluded.fecha_objetivo_interna);
  END LOOP;
  RETURN;
 END IF;
 IF FOUND AND v_regla.tipo_control='condicion' AND v_regla.aplicabilidad='{}'::jsonb
   AND v_regla.parametros->'revision_interna'->>'frecuencia'='mensual' THEN
  -- Una revisión interna autorizada no necesita ni concede validación normativa.
  v_start:=(v_regla.parametros->'revision_interna'->>'dia_inicio')::integer;
  v_end:=(v_regla.parametros->'revision_interna'->>'dia_fin')::integer;
  v_from:=(v_regla.parametros->'revision_interna'->>'desde')::date;
  IF v_start IS NULL OR v_end IS NULL OR v_from IS NULL OR v_start<1 OR v_end>28 OR v_start>v_end THEN
   RAISE EXCEPTION 'Ventana de revisión interna incompleta' USING ERRCODE='23514';
  END IF;
  FOR v_mes IN 1..12 LOOP
   v_date:=make_date(p_year,v_mes,v_end);
   IF v_date<greatest(v_from,(now() AT TIME ZONE 'America/Mexico_City')::date,
     (v_ob.created_at AT TIME ZONE 'America/Mexico_City')::date) THEN CONTINUE; END IF;
   -- Una revisión ya registrada de ese mismo control y mes sigue siendo antecedente.
   -- No fabricar una segunda marca ni pedir repetir la revisión por cambiar frecuencia.
   IF EXISTS(SELECT 1 FROM public.obligacion_cumplimientos c
     JOIN public.obligacion_ocurrencias x ON x.id=c.ocurrencia_id
     WHERE c.obligacion_id=v_ob.id AND c.empresa_id=v_ob.empresa_id AND c.vigente AND c.completada
       AND x.obligacion_id=v_ob.id AND x.empresa_id=v_ob.empresa_id AND x.periodo_key=c.periodo_key
       AND date_trunc('month',x.fecha_vencimiento)=date_trunc('month',v_date)) THEN CONTINUE; END IF;
   INSERT INTO public.obligacion_ocurrencias AS existing
     (obligacion_id,empresa_id,periodo_key,fecha_vencimiento,regla_id,regla_snapshot,origen_fecha,fecha_objetivo_interna)
   VALUES(v_ob.id,v_ob.empresa_id,to_char(v_date,'YYYY-MM'),v_date,v_regla.id,to_jsonb(v_regla),'interna',make_date(p_year,v_mes,v_start))
   ON CONFLICT(obligacion_id,periodo_key) DO UPDATE SET
     fecha_vencimiento=excluded.fecha_vencimiento,regla_id=excluded.regla_id,regla_snapshot=excluded.regla_snapshot,
     origen_fecha='interna',fecha_objetivo_interna=excluded.fecha_objetivo_interna
   WHERE existing.fecha_vencimiento>=(now() AT TIME ZONE 'America/Mexico_City')::date
     AND existing.origen_fecha IN ('heredada','interna') AND existing.evento_id IS NULL
     AND NOT EXISTS(SELECT 1 FROM public.obligacion_cumplimientos c WHERE c.ocurrencia_id=existing.id)
     AND (existing.fecha_vencimiento,existing.regla_id,existing.regla_snapshot,existing.origen_fecha,existing.fecha_objetivo_interna)
       IS DISTINCT FROM (excluded.fecha_vencimiento,excluded.regla_id,excluded.regla_snapshot,'interna',excluded.fecha_objetivo_interna);
  END LOOP;
  RETURN;
 END IF;
 IF NOT FOUND OR v_regla.tipo_control<>'periodica' OR v_regla.normativa_estado<>'validada' THEN RETURN; END IF;
 -- Alcances no triviales deben resolverse antes de generar; nunca ampliar aplicabilidad por omisión.
 IF v_regla.aplicabilidad<>'{}'::jsonb THEN RETURN; END IF;
 v_step:=CASE v_regla.parametros->>'frecuencia' WHEN 'mensual' THEN 1 WHEN 'bimestral' THEN 2 WHEN 'trimestral' THEN 3 WHEN 'semestral' THEN 6 WHEN 'anual' THEN 12 ELSE NULL END;
 IF v_step IS NULL THEN RETURN; END IF;
 IF v_step=12 THEN v_inicio:=(v_regla.parametros->>'mes')::integer;v_fin:=v_inicio;ELSE v_inicio:=1;v_fin:=12;END IF;
 IF v_inicio IS NULL OR v_inicio<1 OR v_inicio>12 THEN RETURN; END IF;
 FOR v_mes IN v_inicio..v_fin BY v_step LOOP
  v_result:=public.obligacion_v2_calcular_fecha(v_regla.parametros,true,make_date(p_year,v_mes,1));
  IF v_result->>'fecha' IS NOT NULL AND (v_result->>'fecha')::date >= (v_ob.created_at AT TIME ZONE 'America/Mexico_City')::date THEN
   INSERT INTO public.obligacion_ocurrencias(obligacion_id,empresa_id,periodo_key,fecha_vencimiento,regla_id,regla_snapshot,origen_fecha)
   VALUES(v_ob.id,v_ob.empresa_id,public.calcular_periodo_key((v_result->>'fecha')::date,upper(v_regla.parametros->>'frecuencia')),
    (v_result->>'fecha')::date,v_regla.id,to_jsonb(v_regla),'normativa') ON CONFLICT(obligacion_id,periodo_key) DO NOTHING;
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.generar_ocurrencias_obligacion_anio(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.generar_ocurrencias_obligacion_anio(uuid,integer) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.obligacion_v2_fecha_evento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_regla public.obligacion_reglas%ROWTYPE; v_result jsonb;
BEGIN
 SELECT * INTO v_regla FROM public.obligacion_v2_regla(NEW.obligacion_id);
 IF v_regla.tipo_control='evento' AND v_regla.normativa_estado='validada' AND v_regla.aplicabilidad='{}'::jsonb THEN
  v_result:=public.obligacion_v2_calcular_fecha(v_regla.parametros,true,NEW.fecha_evento,true);
  IF v_result->>'fecha' IS NOT NULL THEN
   INSERT INTO public.obligacion_ocurrencias(obligacion_id,empresa_id,periodo_key,fecha_vencimiento,evento_id,regla_id,regla_snapshot,origen_fecha)
   VALUES(NEW.obligacion_id,NEW.empresa_id,'evento:'||NEW.id::text,(v_result->>'fecha')::date,NEW.id,v_regla.id,to_jsonb(v_regla),'normativa');
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.obligacion_v2_fecha_evento() FROM PUBLIC,anon,authenticated;

-- Propagar textos que seguían el catálogo, preservando textos particulares explícitos.
CREATE OR REPLACE FUNCTION public.sincronizar_textos_catalogo_compartido()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 UPDATE public.obligaciones o SET
  nombre=CASE WHEN o.nombre IS NOT DISTINCT FROM OLD.nombre THEN NEW.nombre ELSE o.nombre END,
  descripcion=CASE WHEN o.descripcion IS NOT DISTINCT FROM OLD.descripcion THEN NEW.descripcion ELSE o.descripcion END,
  articulos=CASE WHEN o.articulos IS NOT DISTINCT FROM OLD.articulos THEN NEW.articulos ELSE o.articulos END,
  presentacion=CASE WHEN o.presentacion IS NOT DISTINCT FROM OLD.presentacion THEN NEW.presentacion ELSE o.presentacion END
 WHERE o.catalogo_id=NEW.id AND o.activa AND (
  (o.nombre IS NOT DISTINCT FROM OLD.nombre AND NEW.nombre IS DISTINCT FROM OLD.nombre) OR
  (o.descripcion IS NOT DISTINCT FROM OLD.descripcion AND NEW.descripcion IS DISTINCT FROM OLD.descripcion) OR
  (o.articulos IS NOT DISTINCT FROM OLD.articulos AND NEW.articulos IS DISTINCT FROM OLD.articulos) OR
  (o.presentacion IS NOT DISTINCT FROM OLD.presentacion AND NEW.presentacion IS DISTINCT FROM OLD.presentacion));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sincronizar_textos_catalogo_compartido() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS catalogo_textos_compartidos ON public.obligaciones_catalogo;
CREATE TRIGGER catalogo_textos_compartidos AFTER UPDATE OF nombre,descripcion,articulos,presentacion ON public.obligaciones_catalogo
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_textos_catalogo_compartido();
COMMIT;

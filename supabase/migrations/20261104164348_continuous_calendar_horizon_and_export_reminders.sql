-- Horizonte móvil: solo nuevas ocurrencias respaldadas por una regla aprobada.
-- Aplicar no genera periodos: el calendario y el cron invocan la RPC explícitamente.
BEGIN;
CREATE OR REPLACE FUNCTION public.asegurar_horizonte_calendario(p_empresa_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 v_today date:=(now() AT TIME ZONE 'America/Mexico_City')::date;
 v_until date:=(v_today+interval '12 months')::date;
 v_claim text; v_ob public.obligaciones%ROWTYPE; v_rule public.obligacion_reglas%ROWTYPE;
 v_month date; v_due date; v_target date; v_key text; v_origin text; v_schedule jsonb; v_calendar jsonb;
 v_step integer; v_start integer; v_end integer; v_from date; v_result jsonb; v_added integer; v_count integer:=0;
BEGIN
 v_claim:=coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','');
 IF auth.uid() IS NULL AND session_user<>'postgres' AND v_claim<>'service_role' THEN
  RAISE EXCEPTION 'Sesión requerida' USING ERRCODE='42501';
 END IF;
 IF auth.uid() IS NOT NULL AND p_empresa_id IS NOT NULL AND NOT (
  public.obligacion_v2_es_admin()
  OR EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.id WHERE p.id=auth.uid() AND p.empresa_id=p_empresa_id AND r.role='cliente')
  OR EXISTS(SELECT 1 FROM public.consultor_empresa_asignacion a JOIN public.user_roles r ON r.user_id=a.consultor_id WHERE a.consultor_id=auth.uid() AND a.empresa_id=p_empresa_id AND r.role='consultor')
 ) THEN RAISE EXCEPTION 'Sin permiso sobre la empresa' USING ERRCODE='42501'; END IF;
 FOR v_ob IN SELECT o.* FROM public.obligaciones o WHERE o.activa
  AND (p_empresa_id IS NULL OR o.empresa_id=p_empresa_id)
  AND (auth.uid() IS NULL OR public.obligacion_v2_puede_registrar(o.id)) ORDER BY o.id
 LOOP
  SELECT * INTO v_rule FROM public.obligacion_v2_regla(v_ob.id);
  IF NOT FOUND OR v_rule.aplicabilidad<>'{}'::jsonb THEN CONTINUE; END IF;
  v_schedule:=NULL;
  IF v_rule.tipo_control='periodica' AND v_rule.parametros->'programacion_interna'->>'frecuencia'='mensual' THEN
   v_schedule:=v_rule.parametros->'programacion_interna';
  ELSIF v_rule.tipo_control='condicion' AND v_rule.parametros->'revision_interna'->>'frecuencia'='mensual' THEN
   v_schedule:=v_rule.parametros->'revision_interna';
  ELSIF v_rule.tipo_control<>'periodica' OR v_rule.normativa_estado<>'validada' THEN CONTINUE;
  END IF;
  FOR v_month IN SELECT d::date FROM generate_series(date_trunc('month',v_today),date_trunc('month',v_until),interval '1 month') d
  LOOP
   -- Parámetros incompletos no autorizan un plazo; no bloquean las demás empresas.
   BEGIN
    v_target:=NULL;v_due:=NULL;
    IF v_schedule IS NOT NULL THEN
     v_from:=(v_schedule->>'desde')::date;
     IF v_from IS NULL THEN CONTINUE; END IF;
     IF v_rule.tipo_control='condicion' THEN
      v_start:=(v_schedule->>'dia_inicio')::integer;v_end:=(v_schedule->>'dia_fin')::integer;
      IF v_start IS NULL OR v_end IS NULL OR v_start<1 OR v_end>28 OR v_start>v_end THEN CONTINUE; END IF;
      v_due:=make_date(extract(year FROM v_month)::integer,extract(month FROM v_month)::integer,v_end);
      v_target:=make_date(extract(year FROM v_month)::integer,extract(month FROM v_month)::integer,v_start);
      IF EXISTS(SELECT 1 FROM public.obligacion_cumplimientos c JOIN public.obligacion_ocurrencias oc ON oc.id=c.ocurrencia_id
        WHERE c.obligacion_id=v_ob.id AND c.empresa_id=v_ob.empresa_id AND c.vigente AND c.completada
         AND oc.obligacion_id=v_ob.id AND oc.periodo_key=c.periodo_key AND date_trunc('month',oc.fecha_vencimiento)=v_month) THEN CONTINUE; END IF;
     ELSE
      v_end:=(v_schedule->>'dia')::integer;v_calendar:=v_schedule->'calendario';
      IF v_end IS NULL OR v_end<1 OR v_end>28 OR jsonb_typeof(v_calendar->'feriados') IS DISTINCT FROM 'array'
        OR coalesce(v_calendar->'anios' @> jsonb_build_array(extract(year FROM v_month)::integer),false)=false THEN CONTINUE; END IF;
      v_due:=make_date(extract(year FROM v_month)::integer,extract(month FROM v_month)::integer,v_end);
      v_target:=v_due-1;
      WHILE extract(isodow FROM v_target)>5 OR v_calendar->'feriados' ? v_target::text LOOP v_target:=v_target-1; END LOOP;
     END IF;
     IF v_due<v_from THEN CONTINUE; END IF;
     v_key:=to_char(v_month,'YYYY-MM');v_origin:='interna';
    ELSE
     v_step:=CASE v_rule.parametros->>'frecuencia' WHEN 'mensual' THEN 1 WHEN 'bimestral' THEN 2 WHEN 'trimestral' THEN 3 WHEN 'semestral' THEN 6 WHEN 'anual' THEN 12 ELSE NULL END;
     IF v_step IS NULL THEN CONTINUE; END IF;
     IF v_step=12 THEN
      IF (v_rule.parametros->>'mes')::integer IS DISTINCT FROM extract(month FROM v_month)::integer THEN CONTINUE; END IF;
     ELSIF (extract(month FROM v_month)::integer-1)%v_step<>0 THEN CONTINUE;
     END IF;
     IF coalesce((v_rule.parametros->>'dias_habiles')::boolean,false) THEN
      v_calendar:=v_rule.parametros->'calendario';
      -- Validar feriados de un año no acredita automáticamente los del siguiente.
      IF NOT (coalesce(v_calendar->'anios' @> jsonb_build_array(extract(year FROM v_month)::integer),false)
       OR (nullif(v_calendar->>'desde','') IS NOT NULL AND nullif(v_calendar->>'hasta','') IS NOT NULL
         AND v_month>=(v_calendar->>'desde')::date AND (v_month+interval '1 month - 1 day')::date<=(v_calendar->>'hasta')::date)) THEN CONTINUE; END IF;
     END IF;
     v_result:=public.obligacion_v2_calcular_fecha(v_rule.parametros,true,v_month);
     v_due:=(v_result->>'fecha')::date;
     v_key:=public.calcular_periodo_key(v_due,upper(v_rule.parametros->>'frecuencia'));v_origin:='normativa';
    END IF;
    IF v_due IS NULL OR v_due<greatest(v_today,(v_ob.created_at AT TIME ZONE 'America/Mexico_City')::date) OR v_due>=v_until THEN CONTINUE; END IF;
    INSERT INTO public.obligacion_ocurrencias(obligacion_id,empresa_id,periodo_key,fecha_vencimiento,regla_id,regla_snapshot,origen_fecha,fecha_objetivo_interna)
    VALUES(v_ob.id,v_ob.empresa_id,v_key,v_due,v_rule.id,to_jsonb(v_rule),v_origin,v_target)
    ON CONFLICT(obligacion_id,periodo_key) DO NOTHING;
    GET DIAGNOSTICS v_added=ROW_COUNT;v_count:=v_count+v_added;
   EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR numeric_value_out_of_range OR datetime_field_overflow THEN
    CONTINUE;
   END;
  END LOOP;
 END LOOP;
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.asegurar_horizonte_calendario(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.asegurar_horizonte_calendario(uuid) TO authenticated,service_role;

-- El archivo .ics necesita solo los días efectivos, no los datos privados de las reglas.
CREATE OR REPLACE FUNCTION public.dias_recordatorio_calendario(p_empresa_id uuid DEFAULT NULL)
RETURNS TABLE(empresa_id uuid,tipo text,dias_antes integer[]) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión requerida' USING ERRCODE='42501'; END IF;
 IF p_empresa_id IS NOT NULL AND NOT (
  public.obligacion_v2_es_admin()
  OR EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.id WHERE p.id=auth.uid() AND p.empresa_id=p_empresa_id AND r.role='cliente')
  OR EXISTS(SELECT 1 FROM public.consultor_empresa_asignacion a JOIN public.user_roles r ON r.user_id=a.consultor_id WHERE a.consultor_id=auth.uid() AND a.empresa_id=p_empresa_id AND r.role='consultor')
 ) THEN RAISE EXCEPTION 'Sin permiso sobre la empresa' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT companies.empresa_id,kinds.tipo,public.reminder_days(kinds.tipo,companies.empresa_id)
 FROM (SELECT DISTINCT o.empresa_id FROM public.obligaciones o WHERE o.activa AND public.obligacion_v2_puede_leer(o.id)
   AND (p_empresa_id IS NULL OR o.empresa_id=p_empresa_id)) companies
 CROSS JOIN (VALUES('certificacion'::text),('immex'),('prosec'),('general')) kinds(tipo)
 ORDER BY companies.empresa_id,kinds.tipo;
END $$;
REVOKE ALL ON FUNCTION public.dias_recordatorio_calendario(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dias_recordatorio_calendario(uuid) TO authenticated;
COMMIT;

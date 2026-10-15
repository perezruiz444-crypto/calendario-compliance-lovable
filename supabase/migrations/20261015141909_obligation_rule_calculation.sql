-- Cálculo protegido: las reglas pendientes no crean nuevas fechas legales.
BEGIN;
CREATE OR REPLACE FUNCTION public.obligacion_v2_calcular_fecha(p_parametros jsonb,p_validada boolean,p_origen date,p_evento boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE v_fecha date; v_dia integer; v_dias integer; v_sentido integer; v_i integer:=0; v_habiles boolean; v_calendar jsonb;
BEGIN
 IF NOT coalesce(p_validada,false) THEN RETURN jsonb_build_object('fecha',NULL,'motivo','normativa_pendiente'); END IF;
 IF p_origen IS NULL THEN RETURN jsonb_build_object('fecha',NULL,'motivo','fecha_origen_pendiente'); END IF;
 v_habiles:=coalesce((p_parametros->>'dias_habiles')::boolean,false);
 v_calendar:=p_parametros->'calendario';
 IF v_habiles AND (coalesce((v_calendar->>'validado')::boolean,false)=false OR nullif(v_calendar->>'referencia','') IS NULL OR jsonb_typeof(v_calendar->'feriados') IS DISTINCT FROM 'array') THEN
  RETURN jsonb_build_object('fecha',NULL,'motivo','calendario_pendiente');
 END IF;
 IF p_evento THEN
  v_dias:=(p_parametros->>'plazo_dias')::integer;
  IF v_dias IS NULL OR v_dias<0 OR v_dias>3660 THEN RETURN jsonb_build_object('fecha',NULL,'motivo','regla_incompleta'); END IF;
  IF p_parametros->>'sentido' NOT IN ('despues','antes') OR p_parametros->>'sentido' IS NULL THEN RETURN jsonb_build_object('fecha',NULL,'motivo','sentido_pendiente'); END IF;
  v_sentido:=CASE WHEN p_parametros->>'sentido'='antes' THEN -1 ELSE 1 END;
  v_fecha:=p_origen;
  WHILE v_i<v_dias LOOP
   v_fecha:=v_fecha+v_sentido;
   IF NOT v_habiles OR (extract(isodow FROM v_fecha)<6 AND NOT (v_calendar->'feriados' ? v_fecha::text)) THEN v_i:=v_i+1; END IF;
  END LOOP;
 ELSE
  v_dia:=(p_parametros->>'dia')::integer;
  IF v_dia IS NULL OR v_dia<1 OR v_dia>31 THEN RETURN jsonb_build_object('fecha',NULL,'motivo','regla_incompleta'); END IF;
  v_fecha:=make_date(extract(year FROM p_origen)::integer,extract(month FROM p_origen)::integer,
   least(v_dia,extract(day FROM (date_trunc('month',p_origen)+interval '1 month - 1 day'))::integer));
  IF v_habiles THEN
   WHILE extract(isodow FROM v_fecha)>5 OR (v_calendar->'feriados' ? v_fecha::text) LOOP
    v_fecha:=v_fecha-1;v_i:=v_i+1;
    IF v_i>366 THEN RETURN jsonb_build_object('fecha',NULL,'motivo','calendario_invalido'); END IF;
   END LOOP;
  END IF;
 END IF;
 RETURN jsonb_build_object('fecha',v_fecha,'motivo',NULL);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
 RETURN jsonb_build_object('fecha',NULL,'motivo','parametros_invalidos');
END $$;
REVOKE ALL ON FUNCTION public.obligacion_v2_calcular_fecha(jsonb,boolean,date,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.obligacion_v2_calcular_fecha(jsonb,boolean,date,boolean) TO authenticated;

-- Conserva la firma usada por triggers/cron. Sustituye el fallback silencioso al día 1.
CREATE OR REPLACE FUNCTION public.generar_ocurrencias_obligacion_anio(p_obligacion_id uuid,p_year integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ob public.obligaciones%ROWTYPE; v_regla public.obligacion_reglas%ROWTYPE; v_step integer; v_mes integer; v_inicio integer; v_fin integer; v_result jsonb; v_claim_role text;
BEGIN
 SELECT * INTO v_ob FROM public.obligaciones WHERE id=p_obligacion_id;
 IF NOT FOUND OR NOT v_ob.activa THEN RETURN; END IF;
 v_claim_role:=coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','');
 IF auth.uid() IS NOT NULL THEN
  IF NOT public.obligacion_v2_puede_registrar(p_obligacion_id) THEN RAISE EXCEPTION 'Sin permiso sobre la obligación' USING ERRCODE='42501'; END IF;
 ELSIF session_user<>'postgres' AND v_claim_role<>'service_role' THEN RAISE EXCEPTION 'Sesión requerida' USING ERRCODE='42501'; END IF;
 IF p_year<2000 OR p_year>2200 THEN RAISE EXCEPTION 'Año fuera de rango' USING ERRCODE='23514'; END IF;
 SELECT * INTO v_regla FROM public.obligacion_reglas r WHERE clasificacion_estado='aprobada'
  AND (r.obligacion_id=v_ob.id OR r.catalogo_id=v_ob.catalogo_id)
  ORDER BY (r.obligacion_id=v_ob.id) DESC NULLS LAST,version DESC LIMIT 1;
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
 SELECT r.* INTO v_regla FROM public.obligacion_reglas r JOIN public.obligaciones o ON o.id=NEW.obligacion_id
 WHERE r.clasificacion_estado='aprobada' AND (r.obligacion_id=o.id OR r.catalogo_id=o.catalogo_id)
 ORDER BY (r.obligacion_id=o.id) DESC NULLS LAST,r.version DESC LIMIT 1;
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
DROP TRIGGER IF EXISTS obligacion_evento_fecha_v2 ON public.obligacion_eventos;
CREATE TRIGGER obligacion_evento_fecha_v2 AFTER INSERT ON public.obligacion_eventos FOR EACH ROW EXECUTE FUNCTION public.obligacion_v2_fecha_evento();
COMMIT;

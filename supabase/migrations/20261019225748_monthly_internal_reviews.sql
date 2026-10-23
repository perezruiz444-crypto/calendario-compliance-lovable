-- Programación mensual interna explícita; no modifica el cálculo normativo.
BEGIN;
CREATE OR REPLACE FUNCTION public.generar_ocurrencias_obligacion_anio(p_obligacion_id uuid,p_year integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ob public.obligaciones%ROWTYPE; v_regla public.obligacion_reglas%ROWTYPE; v_step integer; v_mes integer; v_inicio integer; v_fin integer; v_result jsonb; v_claim_role text; v_date date; v_from date; v_start integer; v_end integer;
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

COMMIT;

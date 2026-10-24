-- Calendario explícito del Anexo 30; no genera ni modifica periodos al desplegar.
BEGIN;
CREATE OR REPLACE FUNCTION public.anexo30_calcular_plazo(p_frecuencia text,p_origen date,p_calendario jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE v_base date; v_limite date; v_fin date; v_i integer:=0;
BEGIN
 IF p_origen IS NULL OR extract(year FROM p_origen) NOT BETWEEN 2000 AND 2200 OR p_frecuencia IS NULL OR p_frecuencia NOT IN ('inicial','mensual','bimestral') THEN
  RAISE EXCEPTION 'Fecha o periodicidad inválida' USING ERRCODE='23514';
 END IF;
 IF p_frecuencia='inicial' THEN v_base:=p_origen+30; v_fin:=p_origen;
 ELSE
  IF extract(day FROM p_origen)<>1 THEN RAISE EXCEPTION 'Selecciona el primer mes del periodo' USING ERRCODE='23514'; END IF;
  v_fin:=(p_origen+CASE WHEN p_frecuencia='mensual' THEN interval '1 month' ELSE interval '2 months' END-interval '1 day')::date;
  v_base:=(date_trunc('month',v_fin)+interval '2 months - 1 day')::date;
 END IF;
 v_limite:=v_base;
 IF coalesce((p_calendario->>'validado')::boolean,false) IS NOT TRUE
 OR nullif(p_calendario->>'referencia','') IS NULL OR jsonb_typeof(p_calendario->'feriados') IS DISTINCT FROM 'array'
 OR nullif(p_calendario->>'desde','') IS NULL OR nullif(p_calendario->>'hasta','') IS NULL THEN
  RETURN jsonb_build_object('fecha_base',v_base,'fecha_limite',NULL,'periodo_inicio',p_origen,'periodo_fin',v_fin,'motivo','calendario_pendiente');
 END IF;
 LOOP
  IF v_limite NOT BETWEEN (p_calendario->>'desde')::date AND (p_calendario->>'hasta')::date THEN
   RETURN jsonb_build_object('fecha_base',v_base,'fecha_limite',NULL,'periodo_inicio',p_origen,'periodo_fin',v_fin,'motivo','calendario_fuera_de_cobertura');
  END IF;
  EXIT WHEN extract(isodow FROM v_limite)<6 AND NOT(p_calendario->'feriados' ? v_limite::text);
  v_limite:=v_limite+1; v_i:=v_i+1;
  IF v_i>31 THEN RAISE EXCEPTION 'Calendario sin día hábil disponible' USING ERRCODE='23514'; END IF;
 END LOOP;
 RETURN jsonb_build_object('fecha_base',v_base,'fecha_limite',v_limite,'periodo_inicio',p_origen,'periodo_fin',v_fin,'motivo',NULL);
END $$;
REVOKE ALL ON FUNCTION public.anexo30_calcular_plazo(text,date,jsonb) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.previsualizar_anexo30(p_obligacion_id uuid,p_frecuencia text,p_origen date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ob public.obligaciones%ROWTYPE; v_regla public.obligacion_reglas%ROWTYPE; v_cal jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.obligacion_v2_puede_leer(p_obligacion_id) THEN RAISE EXCEPTION 'Sin permiso sobre la empresa' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_ob FROM public.obligaciones WHERE id=p_obligacion_id AND activa;
 IF NOT FOUND OR v_ob.catalogo_id IS NULL OR v_ob.catalogo_id NOT IN ('9e088c03-803f-4625-876a-e4d1d1b1f9b1','0d34c8bc-b57b-43a2-ade9-401563e2f203')
 OR (v_ob.catalogo_id='0d34c8bc-b57b-43a2-ade9-401563e2f203') IS DISTINCT FROM (p_frecuencia='inicial') THEN
  RAISE EXCEPTION 'La obligación no corresponde a este cálculo' USING ERRCODE='23514';
 END IF;
 SELECT * INTO v_regla FROM public.obligacion_v2_regla(p_obligacion_id);
 IF v_regla.clasificacion_estado='aprobada' AND v_regla.normativa_estado='validada' AND v_regla.aplicabilidad='{}'::jsonb
 AND v_regla.tipo_control=(CASE WHEN p_frecuencia='inicial' THEN 'evento' ELSE 'periodica' END)
 AND v_regla.parametros->>'calculo_anexo30'=(CASE WHEN p_frecuencia='inicial' THEN 'inventario_inicial' ELSE 'descargos' END) THEN
  v_cal:=v_regla.parametros->'calendario';
 END IF;
 RETURN public.anexo30_calcular_plazo(p_frecuencia,p_origen,v_cal)||jsonb_build_object('regla_id',v_regla.id);
END $$;
REVOKE ALL ON FUNCTION public.previsualizar_anexo30(uuid,text,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.previsualizar_anexo30(uuid,text,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.programar_anexo30(p_obligacion_id uuid,p_frecuencia text,p_origen date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ob public.obligaciones%ROWTYPE; v_regla public.obligacion_reglas%ROWTYPE; v_result jsonb; v_key text; v_id uuid; v_old public.obligacion_ocurrencias%ROWTYPE; v_hoy date:=(now() AT TIME ZONE 'America/Mexico_City')::date;
BEGIN
 IF auth.uid() IS NULL OR NOT public.obligacion_v2_puede_registrar(p_obligacion_id) THEN RAISE EXCEPTION 'Sin permiso de seguimiento' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_ob FROM public.obligaciones WHERE id=p_obligacion_id AND activa FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Obligación no activa' USING ERRCODE='23514'; END IF;
 v_result:=public.previsualizar_anexo30(p_obligacion_id,p_frecuencia,p_origen);
 SELECT * INTO v_regla FROM public.obligacion_v2_regla(p_obligacion_id);
 IF v_regla.id::text IS DISTINCT FROM v_result->>'regla_id' THEN RAISE EXCEPTION 'La regla cambió; vuelve a calcular el plazo' USING ERRCODE='23514'; END IF;
 IF v_result->>'fecha_limite' IS NULL THEN RAISE EXCEPTION 'El plazo base está calculado; falta validar el calendario aplicable' USING ERRCODE='23514'; END IF;
 IF (v_result->>'fecha_limite')::date<v_hoy THEN RAISE EXCEPTION 'No se crearán vencimientos anteriores a hoy; consulta el historial' USING ERRCODE='23514'; END IF;
 IF p_frecuencia='inicial' THEN
  IF p_origen>v_hoy THEN RAISE EXCEPTION 'El inicio de vigencia todavía no ocurrió' USING ERRCODE='23514'; END IF;
  v_id:=public.registrar_evento_obligacion(p_obligacion_id,'Inicio de vigencia de certificación o aceptación de garantía',p_origen,'anexo30:inicial:'||p_obligacion_id::text||':'||p_origen::text);
  IF NOT EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE evento_id=v_id AND regla_id=v_regla.id AND fecha_vencimiento=(v_result->>'fecha_limite')::date) THEN RAISE EXCEPTION 'El inicio ya tenía otro seguimiento o cambió la regla; conserva su historial' USING ERRCODE='23514'; END IF;
  RETURN v_id;
 END IF;
 v_key:='anexo30:'||to_char(p_origen,'YYYY-MM')||':'||to_char((v_result->>'periodo_fin')::date,'YYYY-MM');
 SELECT * INTO v_old FROM public.obligacion_ocurrencias WHERE obligacion_id=p_obligacion_id AND periodo_key=v_key;
 IF FOUND THEN
  IF v_old.regla_snapshot->'programacion_anexo30'->>'frecuencia' IS DISTINCT FROM p_frecuencia OR v_old.fecha_vencimiento IS DISTINCT FROM (v_result->>'fecha_limite')::date THEN RAISE EXCEPTION 'El periodo ya existe con otros datos' USING ERRCODE='23514'; END IF;
  RETURN v_old.id;
 END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias o WHERE o.obligacion_id=p_obligacion_id AND (
  (o.regla_snapshot->'programacion_anexo30'->>'inicio' IS NOT NULL AND
   daterange((o.regla_snapshot->'programacion_anexo30'->>'inicio')::date,(o.regla_snapshot->'programacion_anexo30'->>'fin')::date,'[]') && daterange(p_origen,(v_result->>'periodo_fin')::date,'[]'))
  OR (o.periodo_key ~ '^20[0-9]{2}-[0-9]{2}$' AND o.periodo_key BETWEEN to_char(p_origen,'YYYY-MM') AND to_char((v_result->>'periodo_fin')::date,'YYYY-MM'))
 )) THEN RAISE EXCEPTION 'Ya hay un periodo que se cruza; conserva su seguimiento sin duplicarlo' USING ERRCODE='23514'; END IF;
 INSERT INTO public.obligacion_ocurrencias(obligacion_id,empresa_id,periodo_key,fecha_vencimiento,regla_id,regla_snapshot,origen_fecha)
 VALUES(p_obligacion_id,v_ob.empresa_id,v_key,(v_result->>'fecha_limite')::date,v_regla.id,
 to_jsonb(v_regla)||jsonb_build_object('programacion_anexo30',jsonb_build_object('inicio',p_origen,'fin',v_result->>'periodo_fin','frecuencia',p_frecuencia,'fecha_base',v_result->>'fecha_base')),'normativa') RETURNING id INTO v_id;
 INSERT INTO public.audit_logs(user_id,action,table_name,record_id,new_values) VALUES(auth.uid(),'programar_anexo30','obligacion_ocurrencias',v_id,jsonb_build_object('obligacion_id',p_obligacion_id,'periodo',v_key,'plazo',v_result));
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.programar_anexo30(uuid,text,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.programar_anexo30(uuid,text,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.obligacion_v2_fecha_evento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_regla public.obligacion_reglas%ROWTYPE; v_result jsonb;
BEGIN
 SELECT * INTO v_regla FROM public.obligacion_v2_regla(NEW.obligacion_id);
 IF v_regla.tipo_control='evento' AND v_regla.normativa_estado='validada' AND v_regla.aplicabilidad='{}'::jsonb THEN
  IF v_regla.parametros->>'calculo_anexo30'='inventario_inicial' THEN
   v_result:=public.anexo30_calcular_plazo('inicial',NEW.fecha_evento,v_regla.parametros->'calendario');
   v_result:=v_result||jsonb_build_object('fecha',v_result->>'fecha_limite');
   IF v_result->>'fecha' IS NULL OR (v_result->>'fecha')::date < (now() AT TIME ZONE 'America/Mexico_City')::date THEN RETURN NEW; END IF;
  ELSE
   v_result:=public.obligacion_v2_calcular_fecha(v_regla.parametros,true,NEW.fecha_evento,true);
  END IF;
  IF v_result->>'fecha' IS NOT NULL THEN
   INSERT INTO public.obligacion_ocurrencias(obligacion_id,empresa_id,periodo_key,fecha_vencimiento,evento_id,regla_id,regla_snapshot,origen_fecha)
   VALUES(NEW.obligacion_id,NEW.empresa_id,'evento:'||NEW.id::text,(v_result->>'fecha')::date,NEW.id,v_regla.id,to_jsonb(v_regla),'normativa');
  END IF;
 END IF;
 RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.obligacion_v2_fecha_evento() FROM PUBLIC,anon,authenticated;
COMMIT;

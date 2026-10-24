-- Solo fixture sintética, rollback al final. Nunca ejecutar contra producción.
BEGIN;
CREATE TABLE IF NOT EXISTS public.audit_logs(user_id uuid,action text,table_name text,record_id uuid,new_values jsonb);
ALTER TABLE public.obligacion_ocurrencias ALTER COLUMN id SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS fixture_oc_period ON public.obligacion_ocurrencias(obligacion_id,periodo_key);
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
INSERT INTO public.obligaciones_catalogo(id,nombre,programa) VALUES
 ('9e088c03-803f-4625-876a-e4d1d1b1f9b1','Descargos ficticios','cert_iva_ieps'),
 ('0d34c8bc-b57b-43a2-ade9-401563e2f203','Inventario inicial ficticio','cert_iva_ieps');
INSERT INTO public.obligaciones(id,empresa_id,catalogo_id,nombre,activa) VALUES
 ('40000000-0000-4000-8000-000000000021','20000000-0000-4000-8000-000000000001','9e088c03-803f-4625-876a-e4d1d1b1f9b1','Descargos ficticios',true),
 ('40000000-0000-4000-8000-000000000022','20000000-0000-4000-8000-000000000001','0d34c8bc-b57b-43a2-ade9-401563e2f203','Inventario inicial ficticio',true),
 ('40000000-0000-4000-8000-000000000023','20000000-0000-4000-8000-000000000002','9e088c03-803f-4625-876a-e4d1d1b1f9b1','Descargos de otra empresa',true);
INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,parametros,fuente_url,fuente_referencia,validada_por,validada_en,created_by)
SELECT c.id,1,CASE WHEN c.id='0d34c8bc-b57b-43a2-ade9-401563e2f203' THEN 'evento' ELSE 'periodica' END,'normativo','aprobada','validada',
 jsonb_build_object('calculo_anexo30',CASE WHEN c.id='0d34c8bc-b57b-43a2-ade9-401563e2f203' THEN 'inventario_inicial' ELSE 'descargos' END,'calendario',jsonb_build_object('validado',true,'desde','2000-01-01','hasta','2201-12-31','referencia','SOLO calendario ficticio','feriados','[]'::jsonb)),
 'https://example.invalid/fixture','SOLO fixture de prueba','10000000-0000-4000-8000-000000000001',now(),'10000000-0000-4000-8000-000000000001'
FROM public.obligaciones_catalogo c WHERE c.id IN('9e088c03-803f-4625-876a-e4d1d1b1f9b1','0d34c8bc-b57b-43a2-ade9-401563e2f203');
CREATE TEMP TABLE anexo30_marks AS SELECT to_jsonb(c) row FROM public.obligacion_cumplimientos c;
DO $$ DECLARE r jsonb; BEGIN
 r:=public.anexo30_calcular_plazo('mensual','2026-09-01','{"validado":true,"desde":"2026-01-01","hasta":"2026-12-31","referencia":"fixture","feriados":["2026-11-02"]}');
 IF r->>'fecha_base'<>'2026-10-31' OR r->>'fecha_limite'<>'2026-11-03' THEN RAISE EXCEPTION 'Falló prórroga de fin de semana más inhábil'; END IF;
 r:=public.anexo30_calcular_plazo('bimestral','2026-09-01',NULL);
 IF r->>'fecha_base'<>'2026-11-30' OR r->>'fecha_limite' IS NOT NULL THEN RAISE EXCEPTION 'Inventó calendario no validado'; END IF;
 r:=public.anexo30_calcular_plazo('inicial','2028-02-01',NULL);
 IF r->>'fecha_base'<>'2028-03-02' THEN RAISE EXCEPTION 'Falló año bisiesto'; END IF;
 r:=public.anexo30_calcular_plazo('mensual','2026-09-01','{"validado":true,"desde":"2026-01-01","hasta":"2026-10-31","referencia":"fixture","feriados":[]}');
 IF r->>'fecha_limite' IS NOT NULL THEN RAISE EXCEPTION 'Prorrogó fuera de cobertura'; END IF;
 IF has_function_privilege('anon','public.programar_anexo30(uuid,text,date)','EXECUTE') OR has_function_privilege('authenticated','public.anexo30_calcular_plazo(text,date,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Expuso helper o escritura anónima'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE a uuid; b uuid; d date:=date_trunc('month',now() AT TIME ZONE 'America/Mexico_City')::date; BEGIN
 a:=public.programar_anexo30('40000000-0000-4000-8000-000000000021','mensual',d);
 b:=public.programar_anexo30('40000000-0000-4000-8000-000000000021','mensual',d);
 IF a IS DISTINCT FROM b THEN RAISE EXCEPTION 'Duplicó periodo por reintento'; END IF;
 BEGIN
  PERFORM public.programar_anexo30('40000000-0000-4000-8000-000000000021','bimestral',d);
  RAISE EXCEPTION 'Permitió solapamiento mensual/bimestral';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.programar_anexo30('40000000-0000-4000-8000-000000000023','mensual',d);
  RAISE EXCEPTION 'Cliente escribe otra empresa';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.programar_anexo30('40000000-0000-4000-8000-000000000021','mensual',(d-interval '1 year')::date);
  RAISE EXCEPTION 'Creó atraso retroactivo';
 EXCEPTION WHEN check_violation THEN NULL; END;
 a:=public.programar_anexo30('40000000-0000-4000-8000-000000000022','inicial',(now() AT TIME ZONE 'America/Mexico_City')::date);
 b:=public.programar_anexo30('40000000-0000-4000-8000-000000000022','inicial',(now() AT TIME ZONE 'America/Mexico_City')::date);
 IF a IS DISTINCT FROM b THEN RAISE EXCEPTION 'Duplicó inicio de certificación'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000021')<>1 THEN RAISE EXCEPTION 'Cantidad de periodos incorrecta'; END IF;
 IF (SELECT count(*) FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000022')<>1 THEN RAISE EXCEPTION 'Inicio no generó su plazo'; END IF;
 IF EXISTS(SELECT row FROM anexo30_marks EXCEPT SELECT to_jsonb(c) FROM public.obligacion_cumplimientos c) OR EXISTS(SELECT to_jsonb(c) FROM public.obligacion_cumplimientos c EXCEPT SELECT row FROM anexo30_marks) THEN RAISE EXCEPTION 'Alteró cumplimientos al programar'; END IF;
END $$;
ROLLBACK;

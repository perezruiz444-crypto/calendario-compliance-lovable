-- Contrato local ficticio: calendario interno no equivale a normativa validada.
BEGIN;
ALTER TABLE public.obligaciones ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT '2026-01-01T12:00:00Z';
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,created_by,parametros)
VALUES('40000000-0000-4000-8000-000000000002',300,'periodica','mixto','aprobada','pendiente',
 '10000000-0000-4000-8000-000000000001',
 '{"programacion_interna":{"frecuencia":"mensual","dia":20,"desde":"2026-10-20","calendario":{"anios":[2026,2027],"feriados":["2027-02-19"]}}}');
INSERT INTO public.obligacion_ocurrencias(empresa_id,obligacion_id,periodo_key,fecha_vencimiento,origen_fecha)
VALUES('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','2027-01','2027-01-17','heredada'),
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','2027-03','2027-03-17','normativa'),
 ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','2026-08','2026-08-17','heredada');
INSERT INTO public.obligacion_cumplimientos(empresa_id,obligacion_id,ocurrencia_id,periodo_key,completada)
SELECT empresa_id,obligacion_id,id,periodo_key,true FROM public.obligacion_ocurrencias
WHERE obligacion_id='40000000-0000-4000-8000-000000000002' AND periodo_key='2027-01';
CREATE TEMP TABLE operational_original_marks AS SELECT to_jsonb(c) row FROM public.obligacion_cumplimientos c;
SELECT public.generar_ocurrencias_obligacion_anio('40000000-0000-4000-8000-000000000002',2027);
CREATE TEMP TABLE operational_first AS SELECT to_jsonb(x) row FROM public.obligacion_ocurrencias x;
SELECT public.generar_ocurrencias_obligacion_anio('40000000-0000-4000-8000-000000000002',2027);
SELECT public.generar_ocurrencias_obligacion_anio('40000000-0000-4000-8000-000000000002',2028);
SELECT public.generar_ocurrencias_obligacion_anio('40000000-0000-4000-8000-000000000002',2025);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000002'
  AND periodo_key='2027-02' AND fecha_vencimiento='2027-02-20' AND fecha_objetivo_interna='2027-02-18' AND origen_fecha='interna') THEN
  RAISE EXCEPTION 'No evitó fin de semana y feriado expresamente configurado'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000002'
  AND periodo_key='2027-06' AND fecha_objetivo_interna='2027-06-18') THEN
  RAISE EXCEPTION 'Objetivo incorrecto antes de un día 20 domingo'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000002'
  AND periodo_key='2027-01' AND fecha_vencimiento='2027-01-17' AND origen_fecha='heredada') THEN
  RAISE EXCEPTION 'Cambió un periodo ya marcado'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000002'
  AND periodo_key='2027-03' AND origen_fecha='normativa') THEN RAISE EXCEPTION 'Cambió una fecha normativa'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000002'
  AND periodo_key='2026-08' AND fecha_vencimiento='2026-08-17' AND origen_fecha='heredada') THEN RAISE EXCEPTION 'Cambió fecha histórica'; END IF;
 IF EXISTS(SELECT row FROM operational_original_marks EXCEPT SELECT to_jsonb(c) FROM public.obligacion_cumplimientos c) THEN RAISE EXCEPTION 'Cambió marca anterior'; END IF;
 IF EXISTS(SELECT row FROM operational_first EXCEPT SELECT to_jsonb(x) FROM public.obligacion_ocurrencias x)
 OR EXISTS(SELECT to_jsonb(x) FROM public.obligacion_ocurrencias x EXCEPT SELECT row FROM operational_first) THEN
  RAISE EXCEPTION 'No fue idempotente o generó año sin calendario/periodos pasados'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_reglas WHERE version=300 AND normativa_estado='pendiente') THEN RAISE EXCEPTION 'Validó normativa implícitamente'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
 BEGIN
  PERFORM public.generar_ocurrencias_obligacion_anio('40000000-0000-4000-8000-000000000002',2027);
  RAISE EXCEPTION 'Acceso entre empresas permitido';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;

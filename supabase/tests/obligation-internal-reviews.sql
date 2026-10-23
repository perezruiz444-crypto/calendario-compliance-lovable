-- Datos ficticios; ejecutar solo en el contrato local aislado.
BEGIN;
ALTER TABLE public.obligaciones ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT '2026-01-01T12:00:00Z';
CREATE TEMP TABLE review_test_year AS SELECT extract(year FROM now())::integer+1 y;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,created_by,parametros)
VALUES('40000000-0000-4000-8000-000000000001',200,'condicion','mixto','aprobada','pendiente',
 '10000000-0000-4000-8000-000000000001','{"revision_interna":{"frecuencia":"mensual","dia_inicio":21,"dia_fin":23,"desde":"2026-10-01"}}');
INSERT INTO public.obligacion_ocurrencias(id,empresa_id,obligacion_id,periodo_key,fecha_vencimiento,origen_fecha)
SELECT gen_random_uuid(),'20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',
 y||'-'||v.key,make_date(y,v.month,21),v.origin FROM review_test_year CROSS JOIN
 (VALUES('01',1,'heredada'),('W06',2,'heredada'),('03',3,'heredada'),('04',4,'normativa')) v(key,month,origin);
INSERT INTO public.obligacion_cumplimientos(empresa_id,obligacion_id,ocurrencia_id,periodo_key,completada)
SELECT x.empresa_id,x.obligacion_id,x.id,x.periodo_key,true FROM public.obligacion_ocurrencias x,review_test_year t
 WHERE x.periodo_key IN (t.y||'-W06',t.y||'-03');
CREATE TEMP TABLE review_test_marks AS SELECT to_jsonb(c) row FROM public.obligacion_cumplimientos c;
CREATE TEMP TABLE review_test_history AS SELECT to_jsonb(x) row FROM public.obligacion_ocurrencias x WHERE fecha_vencimiento<'2026-10-01';
SELECT public.generar_ocurrencias_obligacion_anio('40000000-0000-4000-8000-000000000001',y) FROM review_test_year;
CREATE TEMP TABLE review_test_first AS SELECT to_jsonb(x) row FROM public.obligacion_ocurrencias x;
SELECT public.generar_ocurrencias_obligacion_anio('40000000-0000-4000-8000-000000000001',y) FROM review_test_year;
SELECT public.generar_ocurrencias_obligacion_anio('40000000-0000-4000-8000-000000000001',2025);
DO $$ DECLARE v_year integer; BEGIN
 SELECT y INTO v_year FROM review_test_year;
 IF (SELECT count(*) FROM public.obligacion_ocurrencias WHERE origen_fecha='interna')<>9 THEN
  RAISE EXCEPTION 'Cantidad incorrecta de revisiones internas mensuales'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE origen_fecha='interna'
  AND (extract(day FROM fecha_vencimiento)<>23 OR extract(day FROM fecha_objetivo_interna)<>21 OR regla_id IS NULL)) THEN
  RAISE EXCEPTION 'Ventana interna incorrecta'; END IF;
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE periodo_key=v_year||'-02') THEN
  RAISE EXCEPTION 'Exigió repetir la revisión semanal ya atendida del mismo mes'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE periodo_key=v_year||'-03' AND origen_fecha='heredada' AND extract(day FROM fecha_vencimiento)=21) THEN
  RAISE EXCEPTION 'Cambió una ocurrencia ya marcada'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE periodo_key=v_year||'-04' AND origen_fecha='normativa') THEN
  RAISE EXCEPTION 'Sobrescribió una ocurrencia normativa'; END IF;
 IF EXISTS(SELECT row FROM review_test_marks EXCEPT SELECT to_jsonb(c) FROM public.obligacion_cumplimientos c)
  OR EXISTS(SELECT row FROM review_test_history EXCEPT SELECT to_jsonb(x) FROM public.obligacion_ocurrencias x) THEN
  RAISE EXCEPTION 'Cambió historial'; END IF;
 IF EXISTS(SELECT to_jsonb(x) FROM public.obligacion_ocurrencias x EXCEPT SELECT row FROM review_test_first)
  OR EXISTS(SELECT row FROM review_test_first EXCEPT SELECT to_jsonb(x) FROM public.obligacion_ocurrencias x) THEN
  RAISE EXCEPTION 'Generación no idempotente o creó periodos pasados'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_reglas WHERE version=200 AND normativa_estado='pendiente') THEN
  RAISE EXCEPTION 'Convirtió revisión interna en normativa validada'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
 BEGIN
  PERFORM public.generar_ocurrencias_obligacion_anio('40000000-0000-4000-8000-000000000001',2027);
  RAISE EXCEPTION 'Permitió generar revisión de otra empresa';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;

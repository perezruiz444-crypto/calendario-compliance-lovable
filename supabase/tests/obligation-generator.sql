BEGIN;
ALTER TABLE public.obligacion_ocurrencias ALTER COLUMN id SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS fixture_oc_period ON public.obligacion_ocurrencias(obligacion_id,periodo_key);
ALTER TABLE public.obligaciones ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
UPDATE public.obligaciones SET created_at='2026-10-15T12:00:00Z' WHERE id='40000000-0000-4000-8000-000000000002';
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,created_by,validada_por,validada_en,fuente_referencia,fuente_url,parametros)
VALUES('40000000-0000-4000-8000-000000000002',99,'periodica','normativo','aprobada','validada','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',now(),'solo fixture','https://example.invalid/fixture','{"frecuencia":"mensual","dia":17}');
SELECT public.generar_ocurrencias_obligacion_anio('40000000-0000-4000-8000-000000000002',2026);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000002')<>3 THEN RAISE EXCEPTION 'Generó periodos anteriores al alta'; END IF;
END $$;
ROLLBACK;

-- Cliente: toda obligación activa de su empresa, sin asignación individual.
BEGIN;
GRANT SELECT ON public.obligaciones TO authenticated;
GRANT INSERT ON public.obligacion_cumplimientos TO authenticated;
INSERT INTO public.obligacion_ocurrencias(id,empresa_id,obligacion_id,periodo_key,fecha_vencimiento)
VALUES('50000000-0000-4000-8000-000000000099','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','2026-08','2026-08-17');
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF NOT public.obligacion_v2_puede_registrar('40000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Cliente no puede registrar obligación de su empresa sin asignación'; END IF;
 IF public.obligacion_v2_puede_registrar('40000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'Cliente escribe otra empresa'; END IF;
END $$;
INSERT INTO public.obligacion_cumplimientos(empresa_id,obligacion_id,ocurrencia_id,periodo_key,completada,completada_por)
VALUES('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000099','2026-08',true,'10000000-0000-4000-8000-000000000001');
INSERT INTO storage.objects(bucket_id,name) VALUES('evidencias-cumplimiento','20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000002/prueba.pdf');
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_cumplimientos WHERE periodo_key='2026-08' AND completada AND completada_por=auth.uid()) THEN RAISE EXCEPTION 'Cumplimiento vencido perdido o autor suplantado'; END IF;
END $$;
UPDATE public.obligaciones SET activa=false WHERE id='40000000-0000-4000-8000-000000000002';
DO $$ BEGIN
 IF public.obligacion_v2_puede_registrar('40000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Obligación inactiva escribible'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 IF NOT public.obligacion_v2_puede_registrar('40000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'Administrador sin acceso a otra empresa'; END IF;
END $$;
-- Una asignación antigua nunca concede acceso a otra empresa.
INSERT INTO public.obligacion_responsables(obligacion_id,user_id) VALUES('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002');
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 IF public.obligacion_v2_puede_registrar('40000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'Asignación cruzada amplía acceso'; END IF;
END $$;
UPDATE public.profiles SET empresa_id=NULL WHERE id=auth.uid();
DO $$ BEGIN
 IF public.obligacion_v2_puede_registrar('40000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Cliente sin empresa puede escribir'; END IF;
END $$;
ROLLBACK;

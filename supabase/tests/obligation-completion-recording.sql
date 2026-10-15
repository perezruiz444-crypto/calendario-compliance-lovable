BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS obligacion_cumplimientos_vigente_unico ON public.obligacion_cumplimientos(obligacion_id,periodo_key) WHERE vigente;
UPDATE public.obligacion_cumplimientos SET completada=false WHERE id='60000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE a uuid;b uuid;BEGIN
 a:=public.registrar_cumplimiento_obligacion('40000000-0000-4000-8000-000000000001','2026-09','50000000-0000-4000-8000-000000000001');
 b:=public.registrar_cumplimiento_obligacion('40000000-0000-4000-8000-000000000001','2026-09','50000000-0000-4000-8000-000000000001');
 IF a<>b THEN RAISE EXCEPTION 'Reintento duplicado'; END IF;
 BEGIN
  PERFORM public.registrar_cumplimiento_obligacion('40000000-0000-4000-8000-000000000001','2026-10','50000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Periodo cruzado permitido';
 EXCEPTION WHEN check_violation THEN NULL;END;
 BEGIN
  PERFORM public.registrar_cumplimiento_obligacion('40000000-0000-4000-8000-000000000003','2026-09','50000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Otra empresa permitida';
 EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.obligacion_cumplimientos WHERE obligacion_id='40000000-0000-4000-8000-000000000001' AND periodo_key='2026-09')<>2 THEN RAISE EXCEPTION 'Historial duplicado o borrado';END IF;
 IF (SELECT count(*) FROM public.obligacion_cumplimientos WHERE obligacion_id='40000000-0000-4000-8000-000000000001' AND periodo_key='2026-09' AND vigente AND completada AND completada_por=auth.uid())<>1 THEN RAISE EXCEPTION 'Vigente o autoría incorrecta';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_cumplimientos WHERE id='60000000-0000-4000-8000-000000000001' AND NOT vigente AND NOT completada AND reemplazado_por IS NOT NULL) THEN RAISE EXCEPTION 'Historial sobrescrito';END IF;
END $$;
-- Evidencia nueva al corregir; un reintento no crea otra versión.
INSERT INTO storage.objects(bucket_id,name) VALUES('evidencias-cumplimiento','20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/prueba.pdf');
DO $$ DECLARE a uuid;b uuid;BEGIN
 a:=public.registrar_cumplimiento_obligacion('40000000-0000-4000-8000-000000000001','2026-09','50000000-0000-4000-8000-000000000001',NULL,'20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/prueba.pdf');
 b:=public.registrar_cumplimiento_obligacion('40000000-0000-4000-8000-000000000001','2026-09','50000000-0000-4000-8000-000000000001',NULL,'20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/prueba.pdf');
 IF a<>b OR (SELECT count(*) FROM public.obligacion_cumplimientos WHERE vigente AND evidencia_url IS NOT NULL)<>1 THEN RAISE EXCEPTION 'Evidencia perdida o repetida';END IF;
 BEGIN
  PERFORM public.registrar_cumplimiento_obligacion('40000000-0000-4000-8000-000000000001','2026-09','50000000-0000-4000-8000-000000000001',NULL,'20000000-0000-4000-8000-000000000002/ajena.pdf');
  RAISE EXCEPTION 'Evidencia cruzada admitida';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
-- Registro legado sin ocurrencia: se enlaza con nueva versión, sin borrarlo.
UPDATE public.obligacion_cumplimientos SET ocurrencia_id=NULL WHERE vigente;
SELECT public.registrar_cumplimiento_obligacion('40000000-0000-4000-8000-000000000001','2026-09','50000000-0000-4000-8000-000000000001');
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_cumplimientos WHERE vigente AND ocurrencia_id='50000000-0000-4000-8000-000000000001' AND evidencia_url IS NOT NULL) THEN RAISE EXCEPTION 'Registro legado sin enlace';END IF;
END $$;
-- El mismo guardado también conserva la identidad de eventos sin ocurrencia.
INSERT INTO public.obligacion_eventos(id,empresa_id,obligacion_id,tipo_evento,fecha_evento,creado_por,idempotency_key)
VALUES('70000000-0000-4000-8000-000000000095','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','cambio','2026-10-14',auth.uid(),'completion-test');
DO $$ DECLARE a uuid;b uuid;BEGIN
 a:=public.registrar_cumplimiento_obligacion('40000000-0000-4000-8000-000000000002','evento:70000000-0000-4000-8000-000000000095',NULL,'70000000-0000-4000-8000-000000000095');
 b:=public.registrar_cumplimiento_obligacion('40000000-0000-4000-8000-000000000002','evento:70000000-0000-4000-8000-000000000095',NULL,'70000000-0000-4000-8000-000000000095');
 IF a<>b OR NOT EXISTS(SELECT 1 FROM public.obligacion_cumplimientos WHERE id=a AND evento_id='70000000-0000-4000-8000-000000000095' AND ocurrencia_id IS NULL AND vigente AND completada) THEN RAISE EXCEPTION 'Evento repetido o mal enlazado';END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM public.registrar_cumplimiento_obligacion('40000000-0000-4000-8000-000000000001','2026-09','50000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Anon registra cumplimiento';
 EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;

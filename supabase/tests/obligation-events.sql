BEGIN;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
INSERT INTO obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,created_by) VALUES
 ('40000000-0000-4000-8000-000000000001',8,'condicion','interno','aprobada','10000000-0000-4000-8000-000000000001'),
 ('40000000-0000-4000-8000-000000000002',8,'evento','mixto','aprobada','10000000-0000-4000-8000-000000000001');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
SELECT public.registrar_revision_obligacion('40000000-0000-4000-8000-000000000001','verificada','Revisión ficticia',NULL,NULL);
DO $$ BEGIN
 BEGIN
  PERFORM public.registrar_revision_obligacion('40000000-0000-4000-8000-000000000001','no_aplica',NULL,NULL,NULL);
  RAISE EXCEPTION 'No aplica sin motivo permitido';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.registrar_evento_obligacion('40000000-0000-4000-8000-000000000002','cambio','2026-10-14','una-clave',NULL);
  RAISE EXCEPTION 'Cliente sin asignación registra evento';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
DO $$ DECLARE a uuid; b uuid; BEGIN
 a := public.registrar_evento_obligacion('40000000-0000-4000-8000-000000000002','cambio','2026-10-14','una-clave',NULL);
 b := public.registrar_evento_obligacion('40000000-0000-4000-8000-000000000002','cambio','2026-10-14','una-clave',NULL);
 IF a <> b OR (SELECT count(*) FROM obligacion_eventos WHERE idempotency_key='una-clave')<>1 THEN RAISE EXCEPTION 'Evento duplicado'; END IF;
 BEGIN
  PERFORM public.registrar_evento_obligacion('40000000-0000-4000-8000-000000000002','cambio','2026-10-13','una-clave',NULL);
  RAISE EXCEPTION 'Clave reutilizada con payload distinto permitida';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF (SELECT count(*) FROM obligacion_ocurrencias WHERE evento_id=a)<>0 THEN RAISE EXCEPTION 'Fecha inventada'; END IF;
END $$;
ROLLBACK;

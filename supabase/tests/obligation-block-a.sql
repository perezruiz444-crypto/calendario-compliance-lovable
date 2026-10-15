-- Ejecutar únicamente con runner local. Todo el caso se revierte.
BEGIN;
GRANT SELECT ON public.obligaciones TO authenticated;
GRANT INSERT,UPDATE ON public.obligacion_cumplimientos TO authenticated;
DO $$ BEGIN
  IF to_regclass('public.obligacion_reglas') IS NULL THEN RAISE EXCEPTION 'Falta modelo compatible de obligaciones'; END IF;
  IF (SELECT count(*) FROM obligacion_ocurrencias) <> 1 OR (SELECT count(*) FROM obligacion_cumplimientos) <> 1 THEN RAISE EXCEPTION 'Historial alterado'; END IF;
  IF (SELECT fecha_vencimiento FROM obligacion_ocurrencias LIMIT 1) <> '2026-09-20' THEN RAISE EXCEPTION 'Fecha histórica alterada'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
INSERT INTO obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,created_by)
VALUES ('30000000-0000-4000-8000-000000000001',1,'condicion','normativo','aprobada','10000000-0000-4000-8000-000000000001'),
 ('30000000-0000-4000-8000-000000000002',1,'condicion','normativo','aprobada','10000000-0000-4000-8000-000000000001');
DO $$ BEGIN
  BEGIN
    UPDATE obligacion_reglas SET tipo_control='evento' WHERE catalogo_id='30000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Regla aprobada mutable';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO obligacion_reglas(catalogo_id,version,tipo_control,origen_control,normativa_estado,clasificacion_estado,created_by)
    VALUES ('30000000-0000-4000-8000-000000000001',2,'periodica','normativo','validada','aprobada','10000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'Validación sin fuente permitida';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO obligacion_eventos(empresa_id,obligacion_id,tipo_evento,fecha_evento,creado_por,idempotency_key)
    VALUES('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000003','cambio','2026-10-14','10000000-0000-4000-8000-000000000001','cross');
    RAISE EXCEPTION 'Evento cruzado permitido';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    INSERT INTO obligacion_relaciones(empresa_id,obligacion_origen_id,obligacion_destino_id,tipo,created_by)
    VALUES('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000003','control','10000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'Relación cruzada permitida';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM obligacion_reglas) <> 1 THEN RAISE EXCEPTION 'Cliente A ve reglas de B'; END IF;
  IF NOT public.obligacion_v2_puede_registrar('40000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Asignación válida no reconocida'; END IF;
  IF NOT public.obligacion_v2_puede_registrar('40000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Cliente sin acceso a su empresa'; END IF;
  IF public.obligacion_v2_puede_registrar('40000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'Cliente escribe otra empresa'; END IF;
  BEGIN
    INSERT INTO obligacion_revisiones(empresa_id,obligacion_id,resultado) VALUES('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','verificada');
    RAISE EXCEPTION 'INSERT directo elude futura RPC';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO obligacion_cumplimientos(id,empresa_id,obligacion_id,periodo_key,completada,completada_por)
    VALUES('60000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000003','2026-10',true,'10000000-0000-4000-8000-000000000002');
    RAISE EXCEPTION 'Cumplimiento en otra empresa permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM obligacion_reglas) <> 1 THEN RAISE EXCEPTION 'Cliente B ve reglas de A'; END IF;
  IF public.obligacion_v2_puede_leer('40000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Lectura cliente cruzada'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM obligacion_reglas) <> 1 THEN RAISE EXCEPTION 'Consultor ve reglas fuera de asignación'; END IF;
  IF public.obligacion_v2_puede_registrar('40000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'Consultor escribe fuera de asignación'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM obligacion_reglas) <> 2 THEN RAISE EXCEPTION 'Administrador sin acceso'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
  BEGIN
    INSERT INTO obligacion_cumplimientos(id,empresa_id,obligacion_id,periodo_key,completada,completada_por)
    VALUES('60000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','evento:70000000-0000-4000-8000-000000000001',true,'10000000-0000-4000-8000-000000000002');
    RAISE EXCEPTION 'Periodo de evento sin referencia admitido';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
INSERT INTO obligacion_eventos(id,empresa_id,obligacion_id,tipo_evento,fecha_evento,creado_por,idempotency_key)
VALUES('70000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','cambio','2026-10-14','10000000-0000-4000-8000-000000000002','correction-test');
INSERT INTO obligacion_cumplimientos(id,empresa_id,obligacion_id,evento_id,periodo_key,completada,completada_por)
VALUES('60000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','evento:70000000-0000-4000-8000-000000000001',true,'10000000-0000-4000-8000-000000000002');
DO $$ DECLARE v_new uuid; BEGIN
  v_new := public.corregir_cumplimiento('60000000-0000-4000-8000-000000000003',false,'Corrección sintética');
  IF NOT EXISTS(SELECT 1 FROM obligacion_cumplimientos WHERE id=v_new AND evento_id='70000000-0000-4000-8000-000000000001' AND vigente AND NOT completada AND empresa_id='20000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Corrección perdió evento o identidad'; END IF;
  IF NOT EXISTS(SELECT 1 FROM obligacion_cumplimientos WHERE id='60000000-0000-4000-8000-000000000003' AND NOT vigente AND completada AND reemplazado_por=v_new) THEN RAISE EXCEPTION 'Corrección perdió historial'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM public.obligacion_v2_puede_leer('40000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'Anon ejecuta helper'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;

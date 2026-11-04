-- Contrato local aislado: fechas explícitas, alcance e idempotencia.
BEGIN;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
INSERT INTO public.obligaciones(id,empresa_id,nombre,activa,fecha_vencimiento,categoria)
VALUES('40000000-0000-4000-8000-000000000088','20000000-0000-4000-8000-000000000001','Fecha manual ficticia',true,'2026-12-31','immex');
SELECT public.registrar_fecha_manual_obligacion('40000000-0000-4000-8000-000000000088');
DO $$ BEGIN
 IF (SELECT count(*) FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000088')<>1 THEN RAISE EXCEPTION 'Manual ausente o duplicada'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000088' AND fecha_vencimiento='2026-12-31' AND origen_fecha='heredada' AND regla_id IS NULL) THEN RAISE EXCEPTION 'Cambió día u origen manual'; END IF;
END $$;
UPDATE public.obligaciones SET fecha_vencimiento='2027-01-02' WHERE id='40000000-0000-4000-8000-000000000088';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000088' AND fecha_vencimiento='2027-01-02') THEN RAISE EXCEPTION 'No sincronizó la fecha'; END IF;
END $$;
-- Catálogo pendiente: una fecha capturada, nunca doce periodos inferidos.
INSERT INTO public.obligaciones(id,empresa_id,catalogo_id,nombre,activa,fecha_vencimiento)
VALUES('40000000-0000-4000-8000-000000000087','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','Catálogo pendiente ficticio',true,'2026-12-31');
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000087') THEN RAISE EXCEPTION 'Convirtió una semilla automática de catálogo en un vencimiento manual'; END IF;
END $$;
SELECT public.registrar_fecha_manual_obligacion('40000000-0000-4000-8000-000000000087');
DO $$ BEGIN
 IF (SELECT count(*) FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000087')<>1 THEN RAISE EXCEPTION 'Catálogo pendiente perdió su fecha o inventó recurrencias'; END IF;
END $$;
UPDATE public.obligaciones SET fecha_vencimiento=NULL WHERE id='40000000-0000-4000-8000-000000000087';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000087') THEN RAISE EXCEPTION 'Dejó una fecha fantasma al limpiar el campo'; END IF;
END $$;
INSERT INTO public.obligacion_cumplimientos(empresa_id,obligacion_id,ocurrencia_id,periodo_key,completada)
SELECT empresa_id,obligacion_id,id,periodo_key,true FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000088';
DO $$ BEGIN
 BEGIN
  UPDATE public.obligaciones SET fecha_vencimiento='2027-02-02' WHERE id='40000000-0000-4000-8000-000000000088';
  RAISE EXCEPTION 'Modificó historial';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
-- Condiciones, riesgos y eventos no se vuelven entregas por una fecha semilla.
INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,created_by)
VALUES('40000000-0000-4000-8000-000000000002',999,'riesgo','interno','aprobada','10000000-0000-4000-8000-000000000001');
UPDATE public.obligaciones SET fecha_vencimiento='2026-12-31' WHERE id='40000000-0000-4000-8000-000000000002';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.obligacion_ocurrencias WHERE obligacion_id='40000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Inventó ocurrencia de riesgo'; END IF;
END $$;
INSERT INTO public.reminder_rules(tipo,dias_antes,empresa_id,activa) VALUES
 ('immex',30,NULL,true),('immex',15,'20000000-0000-4000-8000-000000000001',true),('immex',90,'20000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 IF public.reminder_days('immex','20000000-0000-4000-8000-000000000001')<>ARRAY[15] THEN RAISE EXCEPTION 'Ignoró regla de empresa A'; END IF;
 IF public.reminder_days('immex','20000000-0000-4000-8000-000000000002')<>ARRAY[90] THEN RAISE EXCEPTION 'Desfase entre empresas'; END IF;
 IF public.reminder_days('general','20000000-0000-4000-8000-000000000001')<>ARRAY[1,7,30] THEN RAISE EXCEPTION 'Default incorrecto'; END IF;
END $$;
UPDATE public.reminder_rules SET activa=false WHERE empresa_id='20000000-0000-4000-8000-000000000002';
DO $$ BEGIN
 IF public.reminder_days('immex','20000000-0000-4000-8000-000000000002')<>ARRAY[]::integer[] THEN RAISE EXCEPTION 'Reactivó regla inactiva'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.reminder_rules)<>2 THEN RAISE EXCEPTION 'Alcance de lectura del consultor incorrecto'; END IF;
 IF public.reminder_days('immex','20000000-0000-4000-8000-000000000001')<>ARRAY[15] THEN RAISE EXCEPTION 'Widget del consultor ignora la regla'; END IF;
END $$;
RESET ROLE;
CREATE TABLE IF NOT EXISTS public.notificaciones(id uuid PRIMARY KEY,user_id uuid,tipo text CHECK(tipo IN ('mensaje','tarea_asignada','tarea_vencimiento','comentario','reporte')),titulo text,contenido text,referencia_id uuid,referencia_tipo text,leida boolean DEFAULT false,created_at timestamptz DEFAULT now());
UPDATE public.obligaciones SET categoria='immex' WHERE id='40000000-0000-4000-8000-000000000001';
UPDATE public.obligacion_ocurrencias SET fecha_vencimiento=(now() AT TIME ZONE 'America/Mexico_City')::date+15 WHERE id='50000000-0000-4000-8000-000000000001';
UPDATE public.obligacion_cumplimientos SET completada=false WHERE id='60000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT public.generar_mis_avisos_obligaciones();
SELECT public.generar_mis_avisos_obligaciones();
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.notificaciones WHERE referencia_id='40000000-0000-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Aviso configurable ausente o duplicado'; END IF;
 IF EXISTS(SELECT 1 FROM public.notificaciones WHERE user_id<>'10000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Notificó a tercero'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.registrar_fecha_manual_obligacion('40000000-0000-4000-8000-000000000088');
  RAISE EXCEPTION 'Escritura cruzada';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;

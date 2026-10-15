BEGIN;
CREATE TABLE IF NOT EXISTS public.notificaciones(id uuid PRIMARY KEY,user_id uuid,tipo text,titulo text,contenido text,referencia_id uuid,referencia_tipo text,leida boolean DEFAULT false,created_at timestamptz DEFAULT now());
-- Contrato real de producción: el tipo de aviso tiene un CHECK cerrado.
ALTER TABLE public.notificaciones ADD CONSTRAINT notification_type_contract CHECK(tipo IN ('mensaje','tarea_asignada','tarea_vencimiento','comentario','reporte'));
UPDATE public.obligacion_ocurrencias SET fecha_vencimiento=(now() AT TIME ZONE 'America/Mexico_City')::date+1 WHERE id='50000000-0000-4000-8000-000000000001';
UPDATE public.obligacion_cumplimientos SET completada=false WHERE id='60000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT public.generar_mis_avisos_obligaciones();
SELECT public.generar_mis_avisos_obligaciones();
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.notificaciones WHERE user_id='10000000-0000-4000-8000-000000000002')<>1 THEN RAISE EXCEPTION 'Aviso faltante o duplicado'; END IF;
 IF EXISTS(SELECT 1 FROM public.notificaciones WHERE user_id<>'10000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Notifica a tercero'; END IF;
END $$;
ROLLBACK;

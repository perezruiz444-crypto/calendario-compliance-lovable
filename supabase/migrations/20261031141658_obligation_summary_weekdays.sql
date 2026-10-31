-- El resumen automático de obligaciones se envía solo de lunes a viernes.
-- cron.timezone=GMT: 14:00 UTC equivale a 08:00 de Ciudad de México.
-- No ejecuta el job ni envía correos; conserva comando, credenciales e historial.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='5s';
DO $$
DECLARE
 v_job cron.job%ROWTYPE;
 v_after cron.job%ROWTYPE;
 v_other_jobs text;
 v_timezone text:=coalesce(current_setting('cron.timezone',true),'GMT');
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('obligation_summary_weekdays'));
 IF v_timezone NOT IN ('GMT','UTC','Etc/UTC') THEN
  RAISE EXCEPTION 'Revisar zona horaria de cron antes de conservar la hora del resumen';
 END IF;
 IF (SELECT count(*) FROM cron.job WHERE jobname='send-daily-summary-email')<>1 THEN
  RAISE EXCEPTION 'No se encontró un único envío automático de obligaciones';
 END IF;
 SELECT * INTO v_job FROM cron.job WHERE jobname='send-daily-summary-email';
 IF position('/functions/v1/send-daily-summary' in v_job.command)=0 THEN
  RAISE EXCEPTION 'El job no apunta al resumen de obligaciones esperado';
 END IF;
 IF v_job.schedule='0 14 * * 1-5' THEN RETURN; END IF;
 IF v_job.schedule<>'0 14 * * *' THEN
  RAISE EXCEPTION 'Cambió el horario previo; revisar antes de modificarlo';
 END IF;
 SELECT md5(coalesce(jsonb_agg(to_jsonb(j) ORDER BY jobid)::text,'[]'))
 INTO v_other_jobs FROM cron.job j WHERE jobid<>v_job.jobid;
 PERFORM cron.alter_job(job_id:=v_job.jobid,schedule:='0 14 * * 1-5');
 SELECT * INTO v_after FROM cron.job WHERE jobid=v_job.jobid;
 IF v_after.schedule IS DISTINCT FROM '0 14 * * 1-5'
 OR (to_jsonb(v_after)-'schedule') IS DISTINCT FROM (to_jsonb(v_job)-'schedule')
 OR v_other_jobs IS DISTINCT FROM(SELECT md5(coalesce(jsonb_agg(to_jsonb(j) ORDER BY jobid)::text,'[]')) FROM cron.job j WHERE jobid<>v_job.jobid) THEN
  RAISE EXCEPTION 'El cambio afectó otra configuración del programador';
 END IF;
 -- No registrar el comando: puede contener credenciales del servicio.
 INSERT INTO public.audit_logs(user_id,action,table_name,old_values,new_values)
 VALUES(NULL,'obligation_summary_weekdays_20261031','cron.job',
 jsonb_build_object('jobid',v_job.jobid,'jobname',v_job.jobname,'schedule',v_job.schedule,'active',v_job.active),
 jsonb_build_object('jobid',v_after.jobid,'jobname',v_after.jobname,'schedule',v_after.schedule,'active',v_after.active,
 'timezone_cron',v_timezone,'timezone_usuario','America/Mexico_City','hora_local','08:00','dias','lunes a viernes',
 'motivo','Solicitud expresa: desactivar correos automáticos de obligaciones los sábados y domingos; no enviar correos de prueba.'));
END $$;
COMMIT;

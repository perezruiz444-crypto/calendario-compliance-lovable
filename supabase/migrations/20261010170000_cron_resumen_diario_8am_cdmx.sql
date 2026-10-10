-- Aplicada en producción el 2026-10-10 vía MCP (nombre: cron_resumen_diario_8am_cdmx).
-- Resumen diario a las 8:00 a.m. hora de CDMX (UTC-6 todo el año desde 2022) = 14:00 UTC.
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'send-daily-summary-email'),
  schedule := '0 14 * * *'
);

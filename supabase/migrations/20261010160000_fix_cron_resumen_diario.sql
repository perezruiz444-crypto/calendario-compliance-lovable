-- Aplicada en producción el 2026-10-10 vía MCP (nombre: fix_cron_resumen_diario).
-- El cron send-daily-summary-email fallaba siempre: pg_net no estaba instalado ("schema net does not exist")
-- y además no mandaba el header x-cron-secret que exige la función.
-- Requiere que el secret CRON_SECRET de la edge function tenga el mismo valor que vault 'cron_secret'.
create extension if not exists pg_net with schema extensions;

-- Secret aleatorio generado en la base; el mismo valor se configura como CRON_SECRET de la edge function.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret',
  'Header x-cron-secret para send-daily-summary (debe coincidir con CRON_SECRET de la edge function)')
where not exists (select 1 from vault.secrets where name = 'cron_secret');

select cron.unschedule('send-daily-summary-email')
where exists (select 1 from cron.job where jobname = 'send-daily-summary-email');

select cron.schedule(
  'send-daily-summary-email',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://svozqrjhwaohfmbkhpig.supabase.co/functions/v1/send-daily-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the schedule for daily summary email to run every day at 8:00 AM
SELECT cron.schedule(
  'send-daily-summary-email',
  '0 8 * * *', -- Every day at 8:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://svozqrjhwaohfmbkhpig.supabase.co/functions/v1/send-daily-summary',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2b3pxcmpod2FvaGZtYmtocGlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjIyMDAsImV4cCI6MjA3NTMzODIwMH0.NoVQ4BRX0UJy5fThsJQPzutAujdhrh2im6d1MSviKL8"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
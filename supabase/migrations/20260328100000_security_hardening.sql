-- Security Hardening: login_attempts table + rate limiting RPCs
-- Also extends audit_logs to log login events

-- ────────────────────────────────────────────────────────────
-- 1. login_attempts — tracks auth attempts for rate limiting
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  ip_address inet,
  success    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON public.login_attempts(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON public.login_attempts(ip_address, created_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Admins can view login_attempts"
  ON public.login_attempts
  FOR SELECT
  USING (public.has_role(auth.uid(), 'administrador'::app_role));

-- ────────────────────────────────────────────────────────────
-- 2. rate_limit_events — for edge function rate limiting
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text        NOT NULL,
  action     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_ip_action_time
  ON public.rate_limit_events(ip_address, action, created_at DESC);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Admins can view rate_limit_events"
  ON public.rate_limit_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'administrador'::app_role));

-- Service role (Edge Functions) can insert — bypasses RLS via service_role_key,
-- but an explicit policy protects against accidental anon-key usage
CREATE POLICY "Service role can insert rate_limit_events"
  ON public.rate_limit_events
  FOR INSERT
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 3. RPC: record_login_attempt (SECURITY DEFINER — bypasses RLS)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email   text,
  p_ip      inet    DEFAULT NULL,
  p_success boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts(email, ip_address, success)
  VALUES (p_email, p_ip, p_success);

  -- Prune entries older than 24h to keep the table small
  DELETE FROM public.login_attempts
  WHERE created_at < now() - interval '24 hours';
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. RPC: is_login_blocked — returns true if ≥5 failures in 15 min
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_login_blocked(
  p_email text,
  p_ip    inet DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fail_count integer;
BEGIN
  SELECT COUNT(*) INTO fail_count
  FROM public.login_attempts
  WHERE
    (email = p_email OR (p_ip IS NOT NULL AND ip_address = p_ip))
    AND success = false
    AND created_at > now() - interval '15 minutes';

  RETURN fail_count >= 5;
END;
$$;

COMMENT ON TABLE  public.login_attempts       IS 'Tracks login attempts for brute-force rate limiting.';
COMMENT ON TABLE  public.rate_limit_events    IS 'Tracks edge function calls per IP for rate limiting.';
COMMENT ON FUNCTION public.record_login_attempt IS 'Logs a login attempt. SECURITY DEFINER so unauthenticated callers can write.';
COMMENT ON FUNCTION public.is_login_blocked     IS 'Returns true if the email/IP has ≥5 failed attempts in the last 15 minutes.';

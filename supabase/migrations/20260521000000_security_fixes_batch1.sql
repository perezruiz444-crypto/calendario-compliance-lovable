-- ============================================================
-- Security fixes batch 1
-- Fix #1: agentes_aduanales SELECT scoped (era legible por todos)
-- Fix #2: drop policy laxa de miembros_socios (la scoped ya existe)
-- Fix #5: rate limit en record_login_attempt para mitigar DoS
-- ============================================================

-- ------------------------------------------------------------
-- miembros_socios: drop policy laxa
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view miembros of visible empresas" ON public.miembros_socios;

-- ------------------------------------------------------------
-- agentes_aduanales: drop policy laxa + crear scoped
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view agentes of visible empresas" ON public.agentes_aduanales;

CREATE POLICY "agentes_aduanales_select_scoped" ON public.agentes_aduanales
FOR SELECT USING (
  public.has_role(auth.uid(), 'administrador')
  OR EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion
    WHERE consultor_id = auth.uid()
      AND consultor_empresa_asignacion.empresa_id = agentes_aduanales.empresa_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND profiles.empresa_id = agentes_aduanales.empresa_id
  )
);

-- ------------------------------------------------------------
-- record_login_attempt con rate limit por IP
-- ------------------------------------------------------------
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
DECLARE
  recent_count integer;
BEGIN
  IF p_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO recent_count
    FROM public.login_attempts
    WHERE ip_address = p_ip
      AND created_at > now() - interval '1 minute';
    IF recent_count >= 20 THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.login_attempts(email, ip_address, success)
  VALUES (p_email, p_ip, p_success);

  DELETE FROM public.login_attempts
  WHERE created_at < now() - interval '24 hours';
END;
$$;

COMMENT ON FUNCTION public.record_login_attempt IS 'Logs a login attempt. SECURITY DEFINER so unauthenticated callers can write. Rate-limited to 20 inserts/IP/min to mitigate DoS.';

-- Hallazgo de auditoría (2026-10-10). Pendiente de aplicar en producción al momento del commit.
-- Política creada por scripts SQL fuera del historial (POLITICAS_SEGURO_V2.sql / POLITICAS_ADMIN_CORE.sql) sin WITH CHECK.
-- Al combinarse (OR) con profiles_update_own anulaba la restricción que impide a un no-admin cambiar su propio empresa_id.
-- La edición legítima queda cubierta por profiles_update_own (propio perfil) y profiles_admin_all (admin).
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;

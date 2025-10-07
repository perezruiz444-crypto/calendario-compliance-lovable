-- Fix critical security issue: Prevent users from creating fake system notifications
-- Drop all existing policies first to ensure clean state
DROP POLICY IF EXISTS "System can create notifications" ON public.notificaciones;
DROP POLICY IF EXISTS "Only admins can manually create notifications" ON public.notificaciones;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notificaciones;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notificaciones;

-- Ensure RLS is properly enforced
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones FORCE ROW LEVEL SECURITY;

-- SELECT: Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notificaciones
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id
);

-- UPDATE: Users can only update their own notifications (marking as read)
CREATE POLICY "Users can update their own notifications"
ON public.notificaciones
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id
);

-- INSERT: Only admins can manually create notifications
-- System notifications are created via SECURITY DEFINER triggers which bypass RLS
CREATE POLICY "Only admins can manually create notifications"
ON public.notificaciones
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Add documentation comment
COMMENT ON TABLE public.notificaciones IS 'RLS enabled: Users can only view and update their own notifications. Only admins can manually create notifications. System notifications are created via SECURITY DEFINER triggers which bypass RLS.';
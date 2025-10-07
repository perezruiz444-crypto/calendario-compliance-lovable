-- Fix critical security issue: Prevent users from creating fake system notifications
-- The current policy allows ANY authenticated user to create notifications for ANY other user

-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notificaciones;

-- Create a restrictive INSERT policy that only allows admins to manually create notifications
-- Note: Database triggers with SECURITY DEFINER can still insert notifications regardless of RLS policies
CREATE POLICY "Only admins can manually create notifications"
ON public.notificaciones
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Verify UPDATE policy is properly restricted
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notificaciones;
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

-- Verify SELECT policy is properly restricted
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notificaciones;
CREATE POLICY "Users can view their own notifications"
ON public.notificaciones
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id
);

-- Ensure RLS is properly enforced
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones FORCE ROW LEVEL SECURITY;

-- Add documentation comment
COMMENT ON TABLE public.notificaciones IS 'RLS enabled: Users can only view and update their own notifications. Only admins can manually create notifications. System notifications are created via SECURITY DEFINER triggers which bypass RLS.';
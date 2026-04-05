-- Fix user_roles RLS: the consultor policy joins profiles which triggers profiles RLS
-- Replace with a cleaner approach using SECURITY DEFINER helpers

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Consultores can view roles of users in their empresas" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Users can always see their own role
CREATE POLICY "user_roles_select_own"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins full access (has_role is SECURITY DEFINER, no recursion)
CREATE POLICY "user_roles_admin_all"
ON public.user_roles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Helper: get user IDs visible to a consultor (bypasses profiles RLS)
CREATE OR REPLACE FUNCTION public.get_consultor_visible_user_ids(p_consultor_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id
  FROM profiles p
  JOIN consultor_empresa_asignacion cea ON cea.empresa_id = p.empresa_id
  WHERE cea.consultor_id = p_consultor_id
    AND p.empresa_id IS NOT NULL;
$$;

-- Consultores can see roles of users in their assigned empresas
CREATE POLICY "user_roles_consultor_view"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'consultor'::app_role)
  AND user_id IN (SELECT get_consultor_visible_user_ids(auth.uid()))
);
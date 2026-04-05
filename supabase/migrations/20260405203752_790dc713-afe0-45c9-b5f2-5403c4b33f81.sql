
-- Step 1: Create a SECURITY DEFINER function to get current user's empresa_id from profiles
-- This avoids the infinite recursion when profiles RLS policies need to check empresa_id
CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_empresa_id FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_empresa_id TO authenticated;

-- Step 2: Drop all existing policies on profiles to rebuild them cleanly
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles: clientes see only own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles: consultores see own and their clients" ON public.profiles;

-- Step 3: Recreate clean policies using SECURITY DEFINER functions (no self-referencing queries)

-- Admins: full access
CREATE POLICY "profiles_admin_all"
ON public.profiles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Users can always read their own profile
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile (but cannot change empresa_id unless admin)
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (
    has_role(auth.uid(), 'administrador'::app_role)
    OR empresa_id IS NOT DISTINCT FROM get_my_empresa_id()
  )
);

-- Users can insert their own profile (for handle_new_user trigger)
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Consultores can see profiles of users in their assigned empresas
CREATE POLICY "profiles_consultor_see_clients"
ON public.profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'consultor'::app_role)
  AND empresa_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM consultor_empresa_asignacion
    WHERE consultor_id = auth.uid()
    AND empresa_id = profiles.empresa_id
  )
);

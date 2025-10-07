-- Strengthen RLS policies for profiles table to prevent unauthorized access to PII
-- This addresses the security concern about potential gaps in profile data access

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profile empresa assignments" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Verify RLS is enabled (should already be enabled, but ensuring it)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Explicitly force RLS for table owners (prevents superuser bypass in application context)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Policy 1: Admins have full access to all profiles
CREATE POLICY "Admins have full access to profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Policy 2: Users can view only their own profile (explicit authentication required)
CREATE POLICY "Users can view their own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() = id
);

-- Policy 3: Users can create their own profile during signup
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = id
);

-- Policy 4: Users can update their own profile (with restrictions for clientes)
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() = id
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = id AND
  -- Prevent clientes from changing their empresa assignment
  (
    NOT has_role(auth.uid(), 'cliente'::app_role) OR
    empresa_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Add security comment
COMMENT ON TABLE public.profiles IS 'Contains PII (phone numbers, full names). RLS enforced: only authenticated users can access their own profiles, admins have full access. No public/unauthenticated access allowed.';

-- Add column security comments
COMMENT ON COLUMN public.profiles.telefono IS 'PII: Phone number - protected by RLS, accessible only to profile owner and admins';
COMMENT ON COLUMN public.profiles.nombre_completo IS 'PII: Full name - protected by RLS, accessible only to profile owner and admins';
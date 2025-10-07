-- Ensure RLS is properly enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Add INSERT policy to allow users to create their own profile
-- This is critical for the signup flow and for cases where the trigger might fail
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = id
);

-- Verify UPDATE policy exists and is correct
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() = id
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = id
);

-- Verify SELECT policy exists and is correct
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() = id
);

-- Add policy for admins to view all profiles (for user management)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Add policy for admins to update any profile (for user management)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Add comment for documentation
COMMENT ON TABLE public.profiles IS 'RLS enabled: Users can create and manage their own profiles. Admins have full access for user management. Profile creation trigger ensures automatic creation on signup.';
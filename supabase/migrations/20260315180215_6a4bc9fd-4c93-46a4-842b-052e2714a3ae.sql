
-- Drop the restrictive SELECT policy and replace with a broader one
DROP POLICY IF EXISTS "Users can view their own profile only" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

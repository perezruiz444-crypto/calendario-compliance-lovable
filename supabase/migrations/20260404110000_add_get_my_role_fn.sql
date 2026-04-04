-- Fix: HTTP 500 on user_roles query caused by RLS infinite recursion.
-- has_role() queries user_roles, which triggers RLS policies that call has_role() again.
-- Solution: SECURITY DEFINER function bypasses RLS entirely.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

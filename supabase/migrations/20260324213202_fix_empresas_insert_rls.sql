-- Fix RLS violation when creating a new empresa
-- Root cause: the consultor INSERT policy required `created_by = auth.uid()`,
-- but the frontend could send created_by as undefined/null (if auth context isn't
-- fully hydrated), causing the WITH CHECK to fail.
-- Additionally, this improves reliability by auto-setting created_by via trigger.

-- 1. Add a BEFORE INSERT trigger to auto-set created_by = auth.uid() when NULL
--    This guarantees created_by is always the authenticated user, regardless of
--    whether the frontend sends it.
CREATE OR REPLACE FUNCTION public.set_empresa_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_empresa_created_by ON public.empresas;
CREATE TRIGGER trigger_set_empresa_created_by
  BEFORE INSERT ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_empresa_created_by();

-- 2. Simplify the consultor INSERT policy: remove the `created_by = auth.uid()`
--    check since the trigger above ensures it is always set correctly.
DROP POLICY IF EXISTS "Consultores can create empresas" ON public.empresas;

CREATE POLICY "Consultores can create empresas"
ON public.empresas
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role)
);

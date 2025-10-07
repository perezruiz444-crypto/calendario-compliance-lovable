-- Simplify and strengthen RLS policies for empresas table
-- This addresses the security concern about complex policies with potential gaps

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can delete empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can update empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can view all empresas" ON public.empresas;
DROP POLICY IF EXISTS "Clientes can view only their own empresa" ON public.empresas;
DROP POLICY IF EXISTS "Consultores can create empresas" ON public.empresas;
DROP POLICY IF EXISTS "Consultores can update their assigned empresas" ON public.empresas;
DROP POLICY IF EXISTS "Consultores can view their assigned empresas" ON public.empresas;

-- Create simplified, consolidated policies
-- Policy 1: Admins have full access
CREATE POLICY "Admins have full access to empresas"
ON public.empresas
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

-- Policy 2: Consultores can view and update their assigned empresas only
CREATE POLICY "Consultores can view their assigned empresas"
ON public.empresas
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.consultor_empresa_asignacion
    WHERE consultor_id = auth.uid()
    AND empresa_id = empresas.id
  )
);

CREATE POLICY "Consultores can update their assigned empresas"
ON public.empresas
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.consultor_empresa_asignacion
    WHERE consultor_id = auth.uid()
    AND empresa_id = empresas.id
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.consultor_empresa_asignacion
    WHERE consultor_id = auth.uid()
    AND empresa_id = empresas.id
  )
);

-- Policy 3: Consultores can create empresas (auto-assigned via trigger)
CREATE POLICY "Consultores can create empresas"
ON public.empresas
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  created_by = auth.uid()
);

-- Policy 4: Clientes can only view their own empresa (read-only)
-- More secure: checks through profiles.empresa_id with explicit role check
CREATE POLICY "Clientes can view their empresa only"
ON public.empresas
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'cliente'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.empresa_id = empresas.id
  )
);

-- Add security comment
COMMENT ON TABLE public.empresas IS 'Contains sensitive business data. RLS policies ensure: admins have full access, consultores can only access assigned empresas, clientes have read-only access to their own empresa.';
-- Verify and enforce RLS on empresas table
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas FORCE ROW LEVEL SECURITY;

-- Drop and recreate policies with more explicit checks to ensure security
DROP POLICY IF EXISTS "Admins can manage all empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can view all empresas" ON public.empresas;
DROP POLICY IF EXISTS "Clientes can view their own empresa v2" ON public.empresas;
DROP POLICY IF EXISTS "Consultores can create empresas" ON public.empresas;
DROP POLICY IF EXISTS "Consultores can update their assigned empresas" ON public.empresas;
DROP POLICY IF EXISTS "Consultores can view their assigned empresas" ON public.empresas;

-- Admin policies - most permissive, but only for verified admins
CREATE POLICY "Admins can view all empresas"
ON public.empresas
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

CREATE POLICY "Admins can insert empresas"
ON public.empresas
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

CREATE POLICY "Admins can update empresas"
ON public.empresas
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

CREATE POLICY "Admins can delete empresas"
ON public.empresas
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Consultor policies - restricted to assigned empresas only
CREATE POLICY "Consultores can view their assigned empresas"
ON public.empresas
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.consultor_empresa_asignacion
    WHERE consultor_empresa_asignacion.consultor_id = auth.uid()
    AND consultor_empresa_asignacion.empresa_id = empresas.id
  )
);

CREATE POLICY "Consultores can create empresas"
ON public.empresas
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  created_by = auth.uid()
);

CREATE POLICY "Consultores can update their assigned empresas"
ON public.empresas
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.consultor_empresa_asignacion
    WHERE consultor_empresa_asignacion.consultor_id = auth.uid()
    AND consultor_empresa_asignacion.empresa_id = empresas.id
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.consultor_empresa_asignacion
    WHERE consultor_empresa_asignacion.consultor_id = auth.uid()
    AND consultor_empresa_asignacion.empresa_id = empresas.id
  )
);

-- Cliente policies - can only view empresas they are assigned to
CREATE POLICY "Clientes can view their assigned empresa"
ON public.empresas
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'cliente'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.consultor_empresa_asignacion
    WHERE consultor_empresa_asignacion.consultor_id = auth.uid()
    AND consultor_empresa_asignacion.empresa_id = empresas.id
  )
);

-- Ensure no unauthenticated access is possible
-- This is implicit with the policies above, but we document it here for clarity
COMMENT ON TABLE public.empresas IS 'RLS enabled: Only authenticated users with specific roles can access empresa data. No public access allowed.';
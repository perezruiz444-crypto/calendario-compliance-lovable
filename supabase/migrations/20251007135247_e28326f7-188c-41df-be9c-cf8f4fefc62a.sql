-- Fix security issue: Restrict access to business operating addresses based on user roles and assignments
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view domicilios of visible empresas" ON public.domicilios_operacion;
DROP POLICY IF EXISTS "Admins and consultores can manage domicilios" ON public.domicilios_operacion;

-- Ensure RLS is properly enforced
ALTER TABLE public.domicilios_operacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domicilios_operacion FORCE ROW LEVEL SECURITY;

-- SELECT policies: Restrict viewing to authorized users only

-- Admins can view all domicilios
CREATE POLICY "Admins can view all domicilios"
ON public.domicilios_operacion
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Consultores can only view domicilios of their assigned empresas
CREATE POLICY "Consultores can view domicilios of their assigned empresas"
ON public.domicilios_operacion
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.consultor_empresa_asignacion
    WHERE consultor_empresa_asignacion.consultor_id = auth.uid()
    AND consultor_empresa_asignacion.empresa_id = domicilios_operacion.empresa_id
  )
);

-- Clientes can only view domicilios of their assigned empresa
CREATE POLICY "Clientes can view domicilios of their assigned empresa"
ON public.domicilios_operacion
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'cliente'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.consultor_empresa_asignacion
    WHERE consultor_empresa_asignacion.consultor_id = auth.uid()
    AND consultor_empresa_asignacion.empresa_id = domicilios_operacion.empresa_id
  )
);

-- INSERT/UPDATE/DELETE policies: Only admins and assigned consultores can manage domicilios

-- Admins can manage all domicilios
CREATE POLICY "Admins can manage all domicilios"
ON public.domicilios_operacion
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Consultores can manage domicilios of their assigned empresas
CREATE POLICY "Consultores can manage domicilios of their assigned empresas"
ON public.domicilios_operacion
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.consultor_empresa_asignacion
    WHERE consultor_empresa_asignacion.consultor_id = auth.uid()
    AND consultor_empresa_asignacion.empresa_id = domicilios_operacion.empresa_id
  )
);

-- Add documentation comment
COMMENT ON TABLE public.domicilios_operacion IS 'RLS enabled: Access to operating addresses is strictly controlled by role and empresa assignment. Admins see all, consultores and clientes only see addresses of their assigned empresas.';
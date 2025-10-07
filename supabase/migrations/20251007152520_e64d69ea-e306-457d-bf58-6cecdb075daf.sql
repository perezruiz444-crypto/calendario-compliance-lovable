-- Strengthen RLS policies for empresas table to prevent unauthorized access to sensitive business data
-- This addresses the critical security concern about potential exposure of confidential business information

-- Drop all existing policies on empresas table
DROP POLICY IF EXISTS "Admins have full access to empresas" ON public.empresas;
DROP POLICY IF EXISTS "Clientes can view their empresa only" ON public.empresas;
DROP POLICY IF EXISTS "Consultores can create empresas" ON public.empresas;
DROP POLICY IF EXISTS "Consultores can update their assigned empresas" ON public.empresas;
DROP POLICY IF EXISTS "Consultores can view their assigned empresas" ON public.empresas;

-- Verify RLS is enabled (should already be enabled, but ensuring it)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Explicitly force RLS for table owners (prevents superuser bypass in application context)
ALTER TABLE public.empresas FORCE ROW LEVEL SECURITY;

-- Policy 1: Admins have full access to all empresas
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

-- Policy 2: Consultores can view only their assigned empresas
CREATE POLICY "Consultores can view their assigned empresas"
ON public.empresas
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion
    WHERE consultor_id = auth.uid() AND empresa_id = empresas.id
  )
);

-- Policy 3: Consultores can update only their assigned empresas
CREATE POLICY "Consultores can update their assigned empresas"
ON public.empresas
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion
    WHERE consultor_id = auth.uid() AND empresa_id = empresas.id
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion
    WHERE consultor_id = auth.uid() AND empresa_id = empresas.id
  )
);

-- Policy 4: Consultores can create empresas (auto-assigned via trigger)
CREATE POLICY "Consultores can create empresas"
ON public.empresas
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  created_by = auth.uid()
);

-- Policy 5: Clientes can view only their assigned empresa (read-only)
CREATE POLICY "Clientes can view their empresa only"
ON public.empresas
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'cliente'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND empresa_id = empresas.id
  )
);

-- Add security comments to table and sensitive columns
COMMENT ON TABLE public.empresas IS 'Contains highly sensitive business data (RFC, legal representatives, IMMEX numbers, notary data, financial information). RLS enforced: only authenticated users with proper roles (administrador, consultor, cliente) can access. No public/unauthenticated access allowed. Consultores restricted to assigned empresas only.';

-- Add security comments to sensitive columns
COMMENT ON COLUMN public.empresas.rfc IS 'SENSITIVE: Tax ID (RFC) - protected by RLS, accessible only to authorized users';
COMMENT ON COLUMN public.empresas.representante_legal_nombre IS 'SENSITIVE: Legal representative name - protected by RLS, accessible only to authorized users';
COMMENT ON COLUMN public.empresas.datos_notario IS 'SENSITIVE: Notary data - protected by RLS, accessible only to authorized users';
COMMENT ON COLUMN public.empresas.immex_numero IS 'SENSITIVE: IMMEX program number - protected by RLS, accessible only to authorized users';
COMMENT ON COLUMN public.empresas.prosec_numero IS 'SENSITIVE: PROSEC program number - protected by RLS, accessible only to authorized users';
COMMENT ON COLUMN public.empresas.padron_general_numero IS 'SENSITIVE: General registry number - protected by RLS, accessible only to authorized users';
COMMENT ON COLUMN public.empresas.numero_escritura IS 'SENSITIVE: Constitutional act number - protected by RLS, accessible only to authorized users';
COMMENT ON COLUMN public.empresas.telefono IS 'SENSITIVE: Business phone number - protected by RLS, accessible only to authorized users';
COMMENT ON COLUMN public.empresas.domicilio_fiscal IS 'SENSITIVE: Fiscal address - protected by RLS, accessible only to authorized users';
-- Document the security model for the empresas table
-- This makes it explicit that sensitive business data is protected by RLS

COMMENT ON TABLE public.empresas IS 'Company business data containing sensitive information (RFC, legal representatives, phone numbers, fiscal addresses, IMMEX/PROSEC details). Protected by RLS - only admins can view all companies, consultores can only access their assigned companies, and clientes can only view their own company.';

COMMENT ON COLUMN public.empresas.rfc IS 'Tax ID (RFC) - sensitive business identifier';
COMMENT ON COLUMN public.empresas.telefono IS 'Company phone number - contact information';
COMMENT ON COLUMN public.empresas.domicilio_fiscal IS 'Fiscal address - sensitive location data';
COMMENT ON COLUMN public.empresas.representante_legal_nombre IS 'Legal representative name - sensitive personal data';
COMMENT ON COLUMN public.empresas.immex_numero IS 'IMMEX program number - confidential regulatory data';
COMMENT ON COLUMN public.empresas.prosec_numero IS 'PROSEC program number - confidential regulatory data';
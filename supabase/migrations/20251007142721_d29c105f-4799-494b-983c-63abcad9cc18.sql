-- Create table for client invitations
CREATE TABLE IF NOT EXISTS public.client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  accepted_at timestamp with time zone,
  UNIQUE(empresa_id, email)
);

-- Enable RLS
ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
ON public.client_invitations
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Consultores can view invitations for their assigned empresas
CREATE POLICY "Consultores can view invitations for their empresas"
ON public.client_invitations
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.consultor_empresa_asignacion
    WHERE consultor_id = auth.uid()
    AND empresa_id = client_invitations.empresa_id
  )
);

-- Consultores can create invitations for their empresas
CREATE POLICY "Consultores can create invitations for their empresas"
ON public.client_invitations
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'consultor'::app_role) AND
  invited_by = auth.uid() AND
  EXISTS (
    SELECT 1
    FROM public.consultor_empresa_asignacion
    WHERE consultor_id = auth.uid()
    AND empresa_id = client_invitations.empresa_id
  )
);

-- Admins can create any invitation
CREATE POLICY "Admins can create invitations"
ON public.client_invitations
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role) AND
  invited_by = auth.uid()
);

-- Admins and consultores can update/delete their invitations
CREATE POLICY "Users can manage their invitations"
ON public.client_invitations
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  (
    has_role(auth.uid(), 'administrador'::app_role) OR
    (has_role(auth.uid(), 'consultor'::app_role) AND invited_by = auth.uid())
  )
);

-- Create index for performance
CREATE INDEX idx_invitations_token ON public.client_invitations(token) WHERE status = 'pending';
CREATE INDEX idx_invitations_email ON public.client_invitations(email);
CREATE INDEX idx_invitations_empresa ON public.client_invitations(empresa_id);
CREATE INDEX idx_invitations_expires ON public.client_invitations(expires_at) WHERE status = 'pending';

-- Add comment
COMMENT ON TABLE public.client_invitations IS 'Stores pending and accepted client invitations. Tokens expire after 7 days by default.';
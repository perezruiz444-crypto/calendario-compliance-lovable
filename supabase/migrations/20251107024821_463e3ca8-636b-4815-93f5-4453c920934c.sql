-- Fix security vulnerabilities in RLS policies

-- 1. PROFILES: Strengthen profile update policy to prevent privilege escalation
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = id)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id AND
  -- Prevent users from changing their own empresa_id unless they're admin
  (
    has_role(auth.uid(), 'administrador'::app_role) OR
    empresa_id IS NOT DISTINCT FROM (SELECT empresa_id FROM profiles WHERE id = auth.uid())
  )
);

-- 2. CLIENT_INVITATIONS: Add missing delete policy and strengthen security
DROP POLICY IF EXISTS "Users can manage their invitations" ON public.client_invitations;

CREATE POLICY "Admins and consultores can delete invitations" ON public.client_invitations
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND 
  (
    has_role(auth.uid(), 'administrador'::app_role) OR
    (has_role(auth.uid(), 'consultor'::app_role) AND invited_by = auth.uid())
  )
);

CREATE POLICY "Admins and consultores can update invitations" ON public.client_invitations
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND 
  (
    has_role(auth.uid(), 'administrador'::app_role) OR
    (has_role(auth.uid(), 'consultor'::app_role) AND invited_by = auth.uid())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (
    has_role(auth.uid(), 'administrador'::app_role) OR
    (has_role(auth.uid(), 'consultor'::app_role) AND invited_by = auth.uid())
  )
);

-- 3. MENSAJES: Add delete policy for message cleanup
CREATE POLICY "Users can delete their sent messages" ON public.mensajes
FOR DELETE
USING (auth.uid() = remitente_id);

-- 4. EMPRESAS: Strengthen delete policy (only admins should delete)
CREATE POLICY "Only admins can delete empresas" ON public.empresas
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'administrador'::app_role)
);

-- 5. SOLICITUDES_SERVICIO: Add explicit delete policy
CREATE POLICY "Admins and consultores can delete solicitudes" ON public.solicitudes_servicio
FOR DELETE
USING (
  has_role(auth.uid(), 'administrador'::app_role) OR
  (
    has_role(auth.uid(), 'consultor'::app_role) AND
    EXISTS (
      SELECT 1 FROM consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = solicitudes_servicio.empresa_id
    )
  )
);

-- 6. USER_INVITATIONS: Strengthen to prevent unauthorized access
DROP POLICY IF EXISTS "Consultores can view their invitations" ON public.user_invitations;

CREATE POLICY "Consultores can view their sent invitations" ON public.user_invitations
FOR SELECT
USING (
  has_role(auth.uid(), 'consultor'::app_role) AND 
  invited_by = auth.uid()
);

CREATE POLICY "Admins and consultores can update invitations" ON public.user_invitations
FOR UPDATE
USING (
  has_role(auth.uid(), 'administrador'::app_role) OR
  (has_role(auth.uid(), 'consultor'::app_role) AND invited_by = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role) OR
  (has_role(auth.uid(), 'consultor'::app_role) AND invited_by = auth.uid())
);

CREATE POLICY "Admins and consultores can delete invitations" ON public.user_invitations
FOR DELETE
USING (
  has_role(auth.uid(), 'administrador'::app_role) OR
  (has_role(auth.uid(), 'consultor'::app_role) AND invited_by = auth.uid())
);

-- 7. CONSULTOR_EMPRESA_ASIGNACION: Add delete policy for admins
CREATE POLICY "Admins can delete asignaciones" ON public.consultor_empresa_asignacion
FOR DELETE
USING (has_role(auth.uid(), 'administrador'::app_role));

-- 8. TAREAS: Add explicit delete policy
CREATE POLICY "Admins and consultores can delete tareas" ON public.tareas
FOR DELETE
USING (
  has_role(auth.uid(), 'administrador'::app_role) OR
  (
    has_role(auth.uid(), 'consultor'::app_role) AND
    EXISTS (
      SELECT 1 FROM consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = tareas.empresa_id
    )
  )
);

-- 9. DOCUMENTOS: Add explicit delete policy
CREATE POLICY "Admins and consultores can delete documentos" ON public.documentos
FOR DELETE
USING (
  has_role(auth.uid(), 'administrador'::app_role) OR
  (
    has_role(auth.uid(), 'consultor'::app_role) AND
    EXISTS (
      SELECT 1 FROM consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = documentos.empresa_id
    )
  )
);
-- Aplicada en producción el 2026-10-10 (vía MCP con ALTER POLICY).
-- user_invitations: un consultor podía editar sus invitaciones (role, email, status) y el trigger
-- assign_role_on_invitation_accepted asigna el rol al aceptar → escalada a administrador.
-- Hoy ningún consultor tiene invitaciones, pero un admin degradado a consultor conservaría las suyas.
-- La app solo actualiza invitaciones desde send-user-invitation (service role), así que basta admin.
DROP POLICY IF EXISTS "Admins and consultores can update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS user_invitations_update_admin ON public.user_invitations;
CREATE POLICY user_invitations_update_admin ON public.user_invitations
  FOR UPDATE
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- automation_rules: cualquier consultor podía editar o borrar las reglas de todos (tabla global).
-- Ahora solo las que creó; el admin, todas.
DROP POLICY IF EXISTS "Admins and consultores can manage automation rules" ON public.automation_rules;
CREATE POLICY "Admins and consultores can manage automation rules" ON public.automation_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role) OR (has_role(auth.uid(), 'consultor'::app_role) AND created_by = auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR (has_role(auth.uid(), 'consultor'::app_role) AND created_by = auth.uid()));

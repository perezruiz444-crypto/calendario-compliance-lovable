CREATE POLICY "Consultores can view roles of users in their empresas"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'consultor'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN consultor_empresa_asignacion cea 
      ON cea.empresa_id = p.empresa_id
    WHERE p.id = user_roles.user_id
      AND cea.consultor_id = auth.uid()
  )
);
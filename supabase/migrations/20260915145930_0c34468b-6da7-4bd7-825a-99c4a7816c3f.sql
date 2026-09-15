GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultor_empresa_asignacion TO authenticated;
GRANT ALL ON public.consultor_empresa_asignacion TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultor_empresa_asignacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_consultor_view" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;

CREATE POLICY "user_roles_select_scoped"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'administrador'::public.app_role)
  OR (
    public.has_role((SELECT auth.uid()), 'consultor'::public.app_role)
    AND user_id IN (
      SELECT public.get_consultor_visible_user_ids((SELECT auth.uid()))
    )
  )
);

CREATE POLICY "user_roles_admin_manage"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role((SELECT auth.uid()), 'administrador'::public.app_role))
WITH CHECK (public.has_role((SELECT auth.uid()), 'administrador'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage asignaciones" ON public.consultor_empresa_asignacion;
DROP POLICY IF EXISTS "cea_all_admin" ON public.consultor_empresa_asignacion;
DROP POLICY IF EXISTS "Admins can delete asignaciones" ON public.consultor_empresa_asignacion;
DROP POLICY IF EXISTS "Consultores can view their asignaciones" ON public.consultor_empresa_asignacion;
DROP POLICY IF EXISTS "Consultores can view their asignaciones v2" ON public.consultor_empresa_asignacion;
DROP POLICY IF EXISTS "cea_select_scoped" ON public.consultor_empresa_asignacion;

CREATE POLICY "cea_select_scoped"
ON public.consultor_empresa_asignacion
FOR SELECT
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'administrador'::public.app_role)
  OR consultor_id = (SELECT auth.uid())
);

CREATE POLICY "cea_admin_manage"
ON public.consultor_empresa_asignacion
FOR ALL
TO authenticated
USING (public.has_role((SELECT auth.uid()), 'administrador'::public.app_role))
WITH CHECK (public.has_role((SELECT auth.uid()), 'administrador'::public.app_role));

DROP POLICY IF EXISTS "empresas_all_admin_final" ON public.empresas;
DROP POLICY IF EXISTS "empresas_select_final" ON public.empresas;

CREATE POLICY "empresas_select_scoped"
ON public.empresas
FOR SELECT
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'administrador'::public.app_role)
  OR (
    public.has_role((SELECT auth.uid()), 'consultor'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.consultor_empresa_asignacion cea
      WHERE cea.consultor_id = (SELECT auth.uid())
        AND cea.empresa_id = empresas.id
    )
  )
  OR (
    public.has_role((SELECT auth.uid()), 'cliente'::public.app_role)
    AND public.get_my_empresa_id() = empresas.id
  )
);

CREATE POLICY "empresas_admin_manage"
ON public.empresas
FOR ALL
TO authenticated
USING (public.has_role((SELECT auth.uid()), 'administrador'::public.app_role))
WITH CHECK (public.has_role((SELECT auth.uid()), 'administrador'::public.app_role));

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_empresa_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_empresa_id() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_consultor_visible_user_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_consultor_visible_user_ids(uuid) TO authenticated, service_role;
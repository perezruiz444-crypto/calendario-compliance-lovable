-- ============================================================
-- PARCHE: POLÍTICAS RLS PARA EMPRESAS, PERFILES Y ASIGNACIONES
-- ============================================================

DROP POLICY IF EXISTS "empresas_select_scoped" ON public.empresas;
CREATE POLICY "empresas_select_scoped" ON public.empresas FOR SELECT USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  OR (public.has_role(auth.uid(), 'consultor'::public.app_role) AND EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = empresas.id
  ))
  OR (public.has_role(auth.uid(), 'cliente'::public.app_role) AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = empresas.id
  ))
);

DROP POLICY IF EXISTS "empresas_all_admin" ON public.empresas;
CREATE POLICY "empresas_all_admin" ON public.empresas FOR ALL USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
);

DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
CREATE POLICY "profiles_select_scoped" ON public.profiles FOR SELECT USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  OR id = auth.uid()
  OR (public.has_role(auth.uid(), 'consultor'::public.app_role) AND EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = profiles.empresa_id
  ))
  OR (public.has_role(auth.uid(), 'cliente'::public.app_role) AND EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.id = auth.uid() AND p2.empresa_id = profiles.empresa_id
  ))
);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  OR id = auth.uid()
);

DROP POLICY IF EXISTS "profiles_all_admin" ON public.profiles;
CREATE POLICY "profiles_all_admin" ON public.profiles FOR ALL USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
);

DROP POLICY IF EXISTS "cea_select_scoped" ON public.consultor_empresa_asignacion;
CREATE POLICY "cea_select_scoped" ON public.consultor_empresa_asignacion FOR SELECT USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  OR consultor_id = auth.uid()
);

DROP POLICY IF EXISTS "cea_all_admin" ON public.consultor_empresa_asignacion;
CREATE POLICY "cea_all_admin" ON public.consultor_empresa_asignacion FOR ALL USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
);

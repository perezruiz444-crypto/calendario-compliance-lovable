-- ============================================================
-- PARCHE MAESTRO RLS V2 (USANDO GET_MY_ROLE)
-- ============================================================
-- Al parecer la base de datos está rechazando la función has_role
-- por un problema de tipos con el ENUM app_role. 
-- Para solucionarlo definitivamente, usaremos public.get_my_role() 
-- que devuelve texto plano y es 100% compatible.

-- ============================================================
-- 1. EMPRESAS
-- ============================================================
DROP POLICY IF EXISTS "empresas_select_scoped" ON public.empresas;
CREATE POLICY "empresas_select_scoped" ON public.empresas FOR SELECT USING (
  public.get_my_role() = 'administrador'
  OR (public.get_my_role() = 'consultor' AND EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = empresas.id
  ))
  OR (public.get_my_role() = 'cliente' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = empresas.id
  ))
);

DROP POLICY IF EXISTS "empresas_all_admin" ON public.empresas;
CREATE POLICY "empresas_all_admin" ON public.empresas FOR ALL USING (
  public.get_my_role() = 'administrador'
);

-- ============================================================
-- 2. USUARIOS (PROFILES)
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
CREATE POLICY "profiles_select_scoped" ON public.profiles FOR SELECT USING (
  public.get_my_role() = 'administrador'
  OR id = auth.uid()
  OR (public.get_my_role() = 'consultor' AND EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = profiles.empresa_id
  ))
  OR (public.get_my_role() = 'cliente' AND EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.id = auth.uid() AND p2.empresa_id = profiles.empresa_id
  ))
);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING (
  public.get_my_role() = 'administrador'
  OR id = auth.uid()
);

DROP POLICY IF EXISTS "profiles_all_admin" ON public.profiles;
CREATE POLICY "profiles_all_admin" ON public.profiles FOR ALL USING (
  public.get_my_role() = 'administrador'
);

-- ============================================================
-- 3. ASIGNACIONES (CONSULTOR_EMPRESA_ASIGNACION)
-- ============================================================
DROP POLICY IF EXISTS "cea_select_scoped" ON public.consultor_empresa_asignacion;
CREATE POLICY "cea_select_scoped" ON public.consultor_empresa_asignacion FOR SELECT USING (
  public.get_my_role() = 'administrador'
  OR consultor_id = auth.uid()
);

DROP POLICY IF EXISTS "cea_all_admin" ON public.consultor_empresa_asignacion;
CREATE POLICY "cea_all_admin" ON public.consultor_empresa_asignacion FOR ALL USING (
  public.get_my_role() = 'administrador'
);

-- ============================================================
-- 4. CALENDARIO (TAREAS, OCURRENCIAS Y DOCUMENTOS)
-- ============================================================
DROP POLICY IF EXISTS "tareas_select_scoped" ON public.tareas;
CREATE POLICY "tareas_select_scoped" ON public.tareas FOR SELECT USING (
  public.get_my_role() = 'administrador'
  OR EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = tareas.empresa_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = tareas.empresa_id
  )
);

DROP POLICY IF EXISTS "tareas_all_scoped" ON public.tareas;
CREATE POLICY "tareas_all_scoped" ON public.tareas FOR ALL USING (
  public.get_my_role() = 'administrador'
  OR (public.get_my_role() = 'consultor' AND EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = tareas.empresa_id
  ))
  OR (public.get_my_role() = 'cliente' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = tareas.empresa_id
  ))
);

DROP POLICY IF EXISTS "ocurrencias_select_scoped" ON public.obligacion_ocurrencias;
CREATE POLICY "ocurrencias_select_scoped" ON public.obligacion_ocurrencias FOR SELECT USING (
  public.get_my_role() = 'administrador'
  OR EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = obligacion_ocurrencias.empresa_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = obligacion_ocurrencias.empresa_id
  )
);

DROP POLICY IF EXISTS "ocurrencias_all_scoped" ON public.obligacion_ocurrencias;
CREATE POLICY "ocurrencias_all_scoped" ON public.obligacion_ocurrencias FOR ALL USING (
  public.get_my_role() = 'administrador'
  OR (public.get_my_role() = 'consultor' AND EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = obligacion_ocurrencias.empresa_id
  ))
);

DROP POLICY IF EXISTS "documentos_select_scoped" ON public.documentos;
CREATE POLICY "documentos_select_scoped" ON public.documentos FOR SELECT USING (
  public.get_my_role() = 'administrador'
  OR EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = documentos.empresa_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = documentos.empresa_id
  )
);

DROP POLICY IF EXISTS "documentos_all_scoped" ON public.documentos;
CREATE POLICY "documentos_all_scoped" ON public.documentos FOR ALL USING (
  public.get_my_role() = 'administrador'
  OR (public.get_my_role() = 'consultor' AND EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = documentos.empresa_id
  ))
  OR (public.get_my_role() = 'cliente' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = documentos.empresa_id
  ))
);

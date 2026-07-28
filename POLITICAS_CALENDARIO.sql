-- ============================================================
-- PARCHE: POLÍTICAS RLS FALTANTES (CALENDARIO)
-- ============================================================

DROP POLICY IF EXISTS "tareas_select_scoped" ON public.tareas;
CREATE POLICY "tareas_select_scoped" ON public.tareas FOR SELECT USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
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
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  OR (public.has_role(auth.uid(), 'consultor'::public.app_role) AND EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = tareas.empresa_id
  ))
  OR (public.has_role(auth.uid(), 'cliente'::public.app_role) AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = tareas.empresa_id
  ))
);

DROP POLICY IF EXISTS "ocurrencias_select_scoped" ON public.obligacion_ocurrencias;
CREATE POLICY "ocurrencias_select_scoped" ON public.obligacion_ocurrencias FOR SELECT USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
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
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  OR (public.has_role(auth.uid(), 'consultor'::public.app_role) AND EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = obligacion_ocurrencias.empresa_id
  ))
);

DROP POLICY IF EXISTS "documentos_select_scoped" ON public.documentos;
CREATE POLICY "documentos_select_scoped" ON public.documentos FOR SELECT USING (
  public.has_role(auth.uid(), 'administrador'::public.app_role)
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
  public.has_role(auth.uid(), 'administrador'::public.app_role)
  OR (public.has_role(auth.uid(), 'consultor'::public.app_role) AND EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = documentos.empresa_id
  ))
  OR (public.has_role(auth.uid(), 'cliente'::public.app_role) AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = documentos.empresa_id
  ))
);

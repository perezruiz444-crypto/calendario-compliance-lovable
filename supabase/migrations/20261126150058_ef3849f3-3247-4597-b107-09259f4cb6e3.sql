DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categorias_tareas;
CREATE POLICY "Members can view categories" ON public.categorias_tareas FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'consultor') OR public.get_my_empresa_id() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON public.app_settings;
CREATE POLICY "Members can read app_settings" ON public.app_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'consultor') OR public.get_my_empresa_id() IS NOT NULL);
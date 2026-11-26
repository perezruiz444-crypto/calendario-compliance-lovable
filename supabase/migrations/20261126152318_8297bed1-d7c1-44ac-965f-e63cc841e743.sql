REVOKE EXECUTE ON FUNCTION public.nombres_perfiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nombres_perfiles(uuid[]) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_consultor_visible_user_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_consultor_visible_user_ids(uuid) TO authenticated, service_role;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver catálogo" ON public.obligaciones_catalogo;
CREATE POLICY "Usuarios con rol pueden ver catálogo" ON public.obligaciones_catalogo
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador')
  OR public.has_role(auth.uid(), 'consultor')
  OR (public.has_role(auth.uid(), 'cliente') AND public.get_my_empresa_id() IS NOT NULL)
);
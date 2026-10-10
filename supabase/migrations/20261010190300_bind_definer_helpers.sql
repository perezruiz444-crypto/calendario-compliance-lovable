-- Aplicada en producción el 2026-10-10 (vía MCP con ALTER POLICY / CREATE OR REPLACE; mismo estado final).
-- Re-ejecutable: cada DROP IF EXISTS cubre el nombre viejo y el nuevo.
-- Hallazgo de auditoría: funciones SECURITY DEFINER que respondían sobre cualquier usuario
-- (oráculos de rol y de pertenencia a empresas).
-- Verificado en producción (2026-10-10): ninguna política ni función las llama con un uid
-- distinto de auth.uid(); get_user_empresa_id no se usa en ninguna parte.

-- has_role: solo sobre uno mismo, salvo admin o service role (auth.uid() NULL)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
  AND (
    auth.uid() IS NULL
    OR _user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador')
  )
$function$;

-- get_consultor_visible_user_ids: solo para uno mismo (o admin / service role)
CREATE OR REPLACE FUNCTION public.get_consultor_visible_user_ids(p_consultor_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT p.id
  FROM profiles p
  JOIN consultor_empresa_asignacion cea ON cea.empresa_id = p.empresa_id
  WHERE cea.consultor_id = p_consultor_id
    AND p.empresa_id IS NOT NULL
    AND (
      auth.uid() IS NULL
      OR p_consultor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'administrador')
    );
$function$;

-- get_user_empresa_id: sin uso; quitar acceso desde el cliente
REVOKE EXECUTE ON FUNCTION public.get_user_empresa_id(uuid) FROM PUBLIC, anon, authenticated;

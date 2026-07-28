CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'administrador'::public.app_role THEN 1
    WHEN 'consultor'::public.app_role     THEN 2
    ELSE 3
  END
  LIMIT 1;
$function$;
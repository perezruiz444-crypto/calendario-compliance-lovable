-- Aplicada en producción el 2026-10-10 (vía MCP con ALTER POLICY / CREATE OR REPLACE; mismo estado final).
-- Re-ejecutable: cada DROP IF EXISTS cubre el nombre viejo y el nuevo.
-- Hallazgo de auditoría: handle_new_user tomaba role y empresa_id de raw_user_meta_data,
-- que controla quien se registra (signUp options.data). Ahora solo se confía en
-- raw_app_meta_data, que únicamente puede escribir el service role
-- (edge functions create-user / send-user-invitation).
-- Orden de despliegue: primero las edge functions (que ya mandan app_metadata), luego esta migración.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nombre_completo, empresa_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
    NULLIF(NEW.raw_app_meta_data->>'empresa_id', '')::uuid
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_app_meta_data->>'role', '')::public.app_role,
      'cliente'::public.app_role
    )
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

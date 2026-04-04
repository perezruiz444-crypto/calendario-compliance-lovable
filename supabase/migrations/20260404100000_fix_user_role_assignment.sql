-- Fix: handle_new_user trigger now assigns default 'cliente' role
-- and backfills existing users without any role.

-- 1. Update handle_new_user to also insert into user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre_completo, empresa_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
    CASE
      WHEN NEW.raw_user_meta_data->>'empresa_id' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'empresa_id')::uuid
      ELSE NULL
    END
  );

  -- Assign default role: use metadata 'role' if provided, otherwise 'cliente'
  -- ON CONFLICT DO NOTHING prevents duplicate if create-user edge function also inserts
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::public.app_role,
      'cliente'::public.app_role
    )
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Backfill: assign 'cliente' to any existing auth users that have no role at all
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'cliente'::public.app_role
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = au.id
);

-- A user can only have one effective application role.
-- Keep the most recently assigned role when repairing historical duplicates.
WITH ranked_roles AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS position
  FROM public.user_roles
)
DELETE FROM public.user_roles
WHERE id IN (
  SELECT id FROM ranked_roles WHERE position > 1
);

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::public.app_role,
      'cliente'::public.app_role
    )
  )
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_role_on_invitation_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;

    IF user_uuid IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (user_uuid, NEW.role)
      ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;

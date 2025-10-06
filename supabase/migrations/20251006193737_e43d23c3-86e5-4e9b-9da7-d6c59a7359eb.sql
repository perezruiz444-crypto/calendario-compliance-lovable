-- Assign administrator role to the initial admin user
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find the user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'sebascanseco5@gmail.com';
  
  -- If user exists, assign admin role
  IF v_user_id IS NOT NULL THEN
    -- Insert role if it doesn't exist
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'administrador')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to user %', v_user_id;
  ELSE
    RAISE NOTICE 'User with email sebascanseco5@gmail.com not found. Please register first.';
  END IF;
END $$;
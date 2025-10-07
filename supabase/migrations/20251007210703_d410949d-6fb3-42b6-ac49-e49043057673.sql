-- Trigger para asignar rol automáticamente cuando se acepta una invitación
CREATE OR REPLACE FUNCTION public.assign_role_on_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo actuar cuando el estado cambia a 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Buscar el usuario por email
    DECLARE
      user_uuid UUID;
    BEGIN
      SELECT id INTO user_uuid
      FROM auth.users
      WHERE email = NEW.email
      LIMIT 1;
      
      -- Si encontramos el usuario, asignar el rol
      IF user_uuid IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (user_uuid, NEW.role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE LOG 'Rol % asignado a usuario %', NEW.role, user_uuid;
      ELSE
        RAISE WARNING 'No se encontró usuario con email %', NEW.email;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS on_invitation_accepted ON public.user_invitations;
CREATE TRIGGER on_invitation_accepted
  AFTER UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_role_on_invitation_accepted();

-- Asignar roles a usuarios existentes que no tienen rol
DO $$
DECLARE
  inv RECORD;
  user_uuid UUID;
BEGIN
  FOR inv IN 
    SELECT * FROM public.user_invitations 
    WHERE status = 'accepted'
  LOOP
    -- Buscar el usuario por email
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = inv.email
    LIMIT 1;
    
    -- Si encontramos el usuario y no tiene rol, asignarlo
    IF user_uuid IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (user_uuid, inv.role)
      ON CONFLICT (user_id, role) DO NOTHING;
      
      RAISE LOG 'Rol % asignado retroactivamente a usuario %', inv.role, user_uuid;
    END IF;
  END LOOP;
END;
$$;
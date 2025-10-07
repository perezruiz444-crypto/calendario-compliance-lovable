-- Eliminar usuario eechave@russellbedford.mx y todos sus datos relacionados
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Obtener el ID del usuario
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'eechave@russellbedford.mx';
  
  IF user_uuid IS NOT NULL THEN
    -- Eliminar de user_roles
    DELETE FROM public.user_roles WHERE user_id = user_uuid;
    
    -- Eliminar de profiles
    DELETE FROM public.profiles WHERE id = user_uuid;
    
    -- Eliminar de consultor_empresa_asignacion
    DELETE FROM public.consultor_empresa_asignacion WHERE consultor_id = user_uuid;
    
    -- Eliminar de auth.users (esto eliminará en cascada otros datos)
    DELETE FROM auth.users WHERE id = user_uuid;
    
    RAISE NOTICE 'Usuario % eliminado correctamente', user_uuid;
  ELSE
    RAISE NOTICE 'Usuario no encontrado';
  END IF;
END $$;
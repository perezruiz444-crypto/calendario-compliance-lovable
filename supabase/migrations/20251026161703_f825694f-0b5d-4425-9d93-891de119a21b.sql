-- Update handle_new_user function to support empresa_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with empresa_id if provided in metadata
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
  RETURN NEW;
END;
$$;
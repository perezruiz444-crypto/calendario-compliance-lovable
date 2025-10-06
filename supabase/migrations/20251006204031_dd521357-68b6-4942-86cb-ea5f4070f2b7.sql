-- Create function to auto-assign consultor to empresa they create
CREATE OR REPLACE FUNCTION public.auto_assign_consultor_to_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-assign if creator is a consultor
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = NEW.created_by 
    AND role = 'consultor'
  ) THEN
    INSERT INTO consultor_empresa_asignacion (consultor_id, empresa_id, asignado_por)
    VALUES (NEW.created_by, NEW.id, NEW.created_by)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign consultor when empresa is created
CREATE TRIGGER trigger_auto_assign_consultor
  AFTER INSERT ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_consultor_to_empresa();

COMMENT ON FUNCTION public.auto_assign_consultor_to_empresa() IS 'Automatically assigns a consultor to the empresa they create, preventing orphaned companies';
COMMENT ON TRIGGER trigger_auto_assign_consultor ON empresas IS 'Ensures consultores are automatically assigned to companies they create';
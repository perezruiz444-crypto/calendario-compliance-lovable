-- Security Improvements: Storage RLS Policies and Audit Logging

-- ============================================================
-- PART 1: Storage RLS Policies for task-attachments bucket
-- ============================================================

-- Users can view files from tasks they have access to
CREATE POLICY "Users can view task attachments they have access to"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'task-attachments' AND
  auth.uid() IS NOT NULL AND
  (
    -- Admins can see all files
    has_role(auth.uid(), 'administrador'::app_role) OR
    -- Users can see files from tasks they have access to
    EXISTS (
      SELECT 1
      FROM public.tareas t
      WHERE t.id::text = (storage.foldername(name))[1]
      AND (
        -- Task belongs to user's assigned empresa
        EXISTS (
          SELECT 1
          FROM public.consultor_empresa_asignacion cea
          WHERE cea.consultor_id = auth.uid()
          AND cea.empresa_id = t.empresa_id
        )
      )
    )
  )
);

-- Users can upload files to tasks they have access to
CREATE POLICY "Users can upload task attachments to accessible tasks"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments' AND
  auth.uid() IS NOT NULL AND
  (
    -- Admins can upload anywhere
    has_role(auth.uid(), 'administrador'::app_role) OR
    -- Users can upload to tasks they have access to
    EXISTS (
      SELECT 1
      FROM public.tareas t
      WHERE t.id::text = (storage.foldername(name))[1]
      AND (
        EXISTS (
          SELECT 1
          FROM public.consultor_empresa_asignacion cea
          WHERE cea.consultor_id = auth.uid()
          AND cea.empresa_id = t.empresa_id
        )
      )
    )
  )
);

-- Only admins and file owners can delete files
CREATE POLICY "Admins and file owners can delete task attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'task-attachments' AND
  auth.uid() IS NOT NULL AND
  (
    has_role(auth.uid(), 'administrador'::app_role) OR
    owner = auth.uid()
  )
);

-- ============================================================
-- PART 2: Audit Logging System
-- ============================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Create index for performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      new_values
    ) VALUES (
      auth.uid(),
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW)
    );
    RETURN NEW;
  
  -- Log UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    ) VALUES (
      auth.uid(),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  
  -- Log DELETE
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values
    ) VALUES (
      auth.uid(),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers for user_roles table (track role changes)
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Create trigger for profiles table (track user modifications)
CREATE TRIGGER audit_profiles
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Add comment
COMMENT ON TABLE public.audit_logs IS 'Audit log for tracking sensitive operations: user role changes, profile updates, and admin actions.';
COMMENT ON FUNCTION public.log_audit_event() IS 'Trigger function to automatically log INSERT, UPDATE, and DELETE operations to audit_logs table.';
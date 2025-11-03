-- Create notification settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view all settings
CREATE POLICY "Admins can view notification settings"
  ON public.notification_settings
  FOR SELECT
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- Admins can update settings
CREATE POLICY "Admins can update notification settings"
  ON public.notification_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Insert default notification settings
INSERT INTO public.notification_settings (notification_key, name, description, category, enabled) VALUES
  -- Tareas
  ('task_assigned', 'Tarea Asignada', 'Notificar cuando se asigna una tarea a un consultor', 'tareas', true),
  ('task_reminder_3days', 'Recordatorio de Tarea (3 días)', 'Recordatorio 3 días antes del vencimiento', 'tareas', true),
  ('task_reminder_1day', 'Recordatorio de Tarea (1 día)', 'Recordatorio 1 día antes del vencimiento', 'tareas', true),
  ('task_overdue', 'Tarea Vencida', 'Notificar cuando una tarea está vencida', 'tareas', true),
  ('task_completed', 'Tarea Completada', 'Notificar al cliente cuando se completa una tarea', 'tareas', true),
  
  -- Documentos y Certificaciones
  ('cert_expiring_90days', 'Certificación por Vencer (90 días)', 'Alerta 90 días antes del vencimiento de certificaciones', 'certificaciones', true),
  ('cert_expiring_60days', 'Certificación por Vencer (60 días)', 'Alerta 60 días antes del vencimiento', 'certificaciones', true),
  ('cert_expiring_30days', 'Certificación por Vencer (30 días)', 'Alerta 30 días antes del vencimiento', 'certificaciones', true),
  ('cert_expiring_15days', 'Certificación por Vencer (15 días)', 'Alerta CRÍTICA 15 días antes del vencimiento', 'certificaciones', true),
  ('doc_uploaded', 'Documento Cargado', 'Notificar cuando se carga un nuevo documento', 'documentos', true),
  
  -- Solicitudes de Servicio
  ('service_request_created', 'Nueva Solicitud de Servicio', 'Notificar a consultores sobre nueva solicitud', 'solicitudes', true),
  ('service_request_assigned', 'Solicitud Asignada', 'Notificar al cliente cuando se asigna su solicitud', 'solicitudes', true),
  ('service_request_completed', 'Solicitud Completada', 'Notificar al cliente cuando se completa su solicitud', 'solicitudes', true),
  
  -- Usuarios
  ('user_invited', 'Usuario Invitado', 'Enviar invitación a nuevos usuarios', 'usuarios', true),
  ('password_reset', 'Restablecimiento de Contraseña', 'Enviar enlace para restablecer contraseña', 'usuarios', true),
  
  -- Mensajes
  ('new_message', 'Nuevo Mensaje', 'Notificar cuando se recibe un nuevo mensaje', 'mensajes', true),
  
  -- Reportes
  ('monthly_report', 'Reporte Mensual', 'Enviar reporte mensual automático a clientes', 'reportes', true),
  ('weekly_summary', 'Resumen Semanal', 'Enviar resumen semanal de actividades', 'reportes', false)
ON CONFLICT (notification_key) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
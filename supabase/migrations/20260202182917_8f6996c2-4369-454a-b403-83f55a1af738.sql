-- Tabla: Preferencias de notificación por usuario
CREATE TABLE public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, notification_key)
);

-- Tabla: Reglas de recordatorio configurables
CREATE TABLE public.reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('certificacion', 'immex', 'prosec', 'documento', 'matriz_seguridad', 'general')),
  dias_antes INTEGER NOT NULL CHECK (dias_antes > 0),
  activa BOOLEAN DEFAULT true,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  ultima_ejecucion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Historial de notificaciones enviadas
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  contenido TEXT,
  canal TEXT NOT NULL CHECK (canal IN ('email', 'push', 'in_app')),
  estado TEXT NOT NULL DEFAULT 'enviada' CHECK (estado IN ('enviada', 'fallida', 'pendiente')),
  error_mensaje TEXT,
  referencia_id UUID,
  referencia_tipo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agregar columnas a profiles para preferencias de resumen
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS resumen_frecuencia TEXT DEFAULT 'diario' CHECK (resumen_frecuencia IN ('diario', 'semanal', 'nunca')),
ADD COLUMN IF NOT EXISTS resumen_hora INTEGER DEFAULT 8 CHECK (resumen_hora >= 0 AND resumen_hora <= 23);

-- Habilitar RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_notification_preferences
CREATE POLICY "Users can view their own notification preferences"
ON public.user_notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
ON public.user_notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON public.user_notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences"
ON public.user_notification_preferences FOR DELETE
USING (auth.uid() = user_id);

-- Políticas RLS para reminder_rules (solo admins pueden gestionar)
CREATE POLICY "Admins can view all reminder rules"
ON public.reminder_rules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'administrador'
  )
);

CREATE POLICY "Admins can insert reminder rules"
ON public.reminder_rules FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'administrador'
  )
);

CREATE POLICY "Admins can update reminder rules"
ON public.reminder_rules FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'administrador'
  )
);

CREATE POLICY "Admins can delete reminder rules"
ON public.reminder_rules FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'administrador'
  )
);

-- Políticas RLS para notification_logs
CREATE POLICY "Users can view their own notification logs"
ON public.notification_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification logs"
ON public.notification_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'administrador'
  )
);

-- Triggers para updated_at
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminder_rules_updated_at
BEFORE UPDATE ON public.reminder_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar reglas de recordatorio por defecto
INSERT INTO public.reminder_rules (nombre, tipo, dias_antes, activa) VALUES
('Certificación IVA/IEPS - 90 días', 'certificacion', 90, true),
('Certificación IVA/IEPS - 30 días', 'certificacion', 30, true),
('Certificación IVA/IEPS - 15 días', 'certificacion', 15, true),
('IMMEX - 60 días', 'immex', 60, true),
('IMMEX - 30 días', 'immex', 30, true),
('PROSEC - 60 días', 'prosec', 60, true),
('PROSEC - 30 días', 'prosec', 30, true),
('Matriz Seguridad - 30 días', 'matriz_seguridad', 30, true),
('Documentos - 30 días', 'documento', 30, true),
('Documentos - 7 días', 'documento', 7, true);
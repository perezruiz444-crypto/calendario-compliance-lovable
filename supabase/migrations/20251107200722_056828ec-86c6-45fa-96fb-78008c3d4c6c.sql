-- =====================================================
-- FASE 2: Subtareas, Dependencias, Múltiples Asignados, Time Tracking y Automatizaciones
-- =====================================================

-- 1. Tabla para Subtareas (jerárquicas)
CREATE TABLE IF NOT EXISTS public.subtareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  completada BOOLEAN DEFAULT false,
  orden INTEGER DEFAULT 0,
  asignado_a UUID REFERENCES auth.users(id),
  fecha_completado TIMESTAMPTZ,
  completado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla para Dependencias entre Tareas
CREATE TABLE IF NOT EXISTS public.tarea_dependencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  depende_de_tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'finish_to_start' CHECK (tipo IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(tarea_id, depende_de_tarea_id),
  CHECK (tarea_id != depende_de_tarea_id)
);

-- 3. Tabla para Múltiples Asignados
CREATE TABLE IF NOT EXISTS public.tarea_asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  consultor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol TEXT DEFAULT 'colaborador' CHECK (rol IN ('responsable', 'colaborador', 'revisor')),
  asignado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tarea_id, consultor_id)
);

-- 4. Tabla para Time Tracking
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inicio TIMESTAMPTZ NOT NULL,
  fin TIMESTAMPTZ,
  duracion_minutos INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN fin IS NOT NULL THEN EXTRACT(EPOCH FROM (fin - inicio)) / 60
      ELSE NULL
    END
  ) STORED,
  descripcion TEXT,
  facturable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabla para Reglas de Automatización
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activa BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('tarea_creada', 'tarea_actualizada', 'fecha_vencimiento', 'estado_cambiado')),
  condiciones JSONB DEFAULT '{}',
  acciones JSONB DEFAULT '[]',
  prioridad INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabla para Logs de Automatización
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  tarea_id UUID REFERENCES public.tareas(id) ON DELETE CASCADE,
  ejecutada BOOLEAN DEFAULT false,
  resultado TEXT,
  error TEXT,
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_subtareas_tarea ON public.subtareas(tarea_id);
CREATE INDEX IF NOT EXISTS idx_subtareas_orden ON public.subtareas(tarea_id, orden);
CREATE INDEX IF NOT EXISTS idx_subtareas_completada ON public.subtareas(completada);

CREATE INDEX IF NOT EXISTS idx_dependencias_tarea ON public.tarea_dependencias(tarea_id);
CREATE INDEX IF NOT EXISTS idx_dependencias_depende ON public.tarea_dependencias(depende_de_tarea_id);

CREATE INDEX IF NOT EXISTS idx_asignaciones_tarea ON public.tarea_asignaciones(tarea_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_consultor ON public.tarea_asignaciones(consultor_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_tarea ON public.time_entries(tarea_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_fecha ON public.time_entries(inicio, fin);

CREATE INDEX IF NOT EXISTS idx_automation_rules_activa ON public.automation_rules(activa);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON public.automation_rules(trigger_type);

-- 8. Triggers para updated_at
CREATE TRIGGER update_subtareas_updated_at
  BEFORE UPDATE ON public.subtareas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Función para calcular progreso de subtareas
CREATE OR REPLACE FUNCTION public.get_subtareas_progress(p_tarea_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_completadas INTEGER;
  v_progreso NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM subtareas
  WHERE tarea_id = p_tarea_id;
  
  IF v_total = 0 THEN
    RETURN jsonb_build_object(
      'total', 0,
      'completadas', 0,
      'progreso', 0
    );
  END IF;
  
  SELECT COUNT(*) INTO v_completadas
  FROM subtareas
  WHERE tarea_id = p_tarea_id AND completada = true;
  
  v_progreso := ROUND((v_completadas::NUMERIC / v_total::NUMERIC) * 100, 2);
  
  RETURN jsonb_build_object(
    'total', v_total,
    'completadas', v_completadas,
    'progreso', v_progreso
  );
END;
$$;

-- 10. Función para verificar si una tarea está bloqueada por dependencias
CREATE OR REPLACE FUNCTION public.is_tarea_blocked(p_tarea_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM tarea_dependencias td
    JOIN tareas t ON t.id = td.depende_de_tarea_id
    WHERE td.tarea_id = p_tarea_id
      AND t.estado != 'completada'
  );
END;
$$;

-- 11. Función para obtener tiempo total invertido en una tarea
CREATE OR REPLACE FUNCTION public.get_total_time_spent(p_tarea_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_minutes INTEGER;
BEGIN
  SELECT COALESCE(SUM(duracion_minutos), 0)
  INTO v_total_minutes
  FROM time_entries
  WHERE tarea_id = p_tarea_id AND fin IS NOT NULL;
  
  RETURN v_total_minutes;
END;
$$;

-- 12. Trigger para notificar cuando se desbloquea una tarea
CREATE OR REPLACE FUNCTION public.notify_tarea_unblocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si la tarea se marca como completada, notificar a tareas dependientes
  IF NEW.estado = 'completada' AND (OLD.estado IS NULL OR OLD.estado != 'completada') THEN
    INSERT INTO notificaciones (user_id, tipo, titulo, contenido, referencia_id, referencia_tipo)
    SELECT DISTINCT
      COALESCE(t.consultor_asignado_id, t.creado_por),
      'tarea_desbloqueada',
      'Tarea Desbloqueada',
      'La tarea "' || t.titulo || '" ya no está bloqueada',
      t.id,
      'tarea'
    FROM tarea_dependencias td
    JOIN tareas t ON t.id = td.tarea_id
    WHERE td.depende_de_tarea_id = NEW.id
      AND NOT EXISTS (
        SELECT 1 FROM tarea_dependencias td2
        JOIN tareas t2 ON t2.id = td2.depende_de_tarea_id
        WHERE td2.tarea_id = t.id AND t2.estado != 'completada'
      );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_tarea_completed_unblock
  AFTER UPDATE ON public.tareas
  FOR EACH ROW
  WHEN (NEW.estado = 'completada' AND OLD.estado IS DISTINCT FROM 'completada')
  EXECUTE FUNCTION public.notify_tarea_unblocked();

-- 13. RLS Policies para subtareas
ALTER TABLE public.subtareas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subtareas of visible tareas"
  ON public.subtareas FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tareas 
    WHERE tareas.id = subtareas.tarea_id
  ));

CREATE POLICY "Users can manage subtareas of their tareas"
  ON public.subtareas FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tareas 
    WHERE tareas.id = subtareas.tarea_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tareas 
    WHERE tareas.id = subtareas.tarea_id
  ));

-- 14. RLS Policies para dependencias
ALTER TABLE public.tarea_dependencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dependencias of visible tareas"
  ON public.tarea_dependencias FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tareas WHERE tareas.id = tarea_dependencias.tarea_id)
    AND EXISTS (SELECT 1 FROM public.tareas WHERE tareas.id = tarea_dependencias.depende_de_tarea_id)
  );

CREATE POLICY "Admins and consultores can manage dependencias"
  ON public.tarea_dependencias FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'consultor'))
  WITH CHECK (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'consultor'));

-- 15. RLS Policies para asignaciones
ALTER TABLE public.tarea_asignaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asignaciones of visible tareas"
  ON public.tarea_asignaciones FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tareas 
    WHERE tareas.id = tarea_asignaciones.tarea_id
  ));

CREATE POLICY "Admins and consultores can manage asignaciones"
  ON public.tarea_asignaciones FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'consultor'))
  WITH CHECK (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'consultor'));

-- 16. RLS Policies para time entries
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view time entries of visible tareas"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    has_role(auth.uid(), 'administrador') OR
    EXISTS (SELECT 1 FROM public.tareas WHERE tareas.id = time_entries.tarea_id)
  );

CREATE POLICY "Users can manage their own time entries"
  ON public.time_entries FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 17. RLS Policies para automation rules
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all automation rules"
  ON public.automation_rules FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can manage automation rules"
  ON public.automation_rules FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'))
  WITH CHECK (has_role(auth.uid(), 'administrador'));

-- 18. RLS Policies para automation logs
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view automation logs"
  ON public.automation_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'));
-- =====================================================
-- FASE 1: Quick Create, Custom Fields y Templates
-- =====================================================

-- 1. Tabla para Custom Fields (campos personalizados)
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('text', 'number', 'date', 'select', 'checkbox', 'currency')),
  opciones JSONB, -- Para campos tipo select (array de opciones)
  requerido BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla para valores de custom fields en tareas
CREATE TABLE IF NOT EXISTS public.tarea_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  valor TEXT, -- Almacenamos todo como texto y parseamos según el tipo
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tarea_id, custom_field_id)
);

-- 3. Tabla para Templates de Tareas
CREATE TABLE IF NOT EXISTS public.tarea_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  titulo_template TEXT NOT NULL, -- Título por defecto para tareas creadas
  descripcion_template TEXT, -- Descripción por defecto
  prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
  categoria_id UUID REFERENCES public.categorias_tareas(id),
  duracion_dias INTEGER, -- Duración estimada en días
  checklist JSONB DEFAULT '[]', -- Array de items de checklist
  campos_personalizados JSONB DEFAULT '[]', -- IDs de custom fields aplicables
  es_publico BOOLEAN DEFAULT false, -- Si puede ser usado por todos o solo el creador
  veces_usado INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Agregar índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_custom_fields_activo ON public.custom_fields(activo);
CREATE INDEX IF NOT EXISTS idx_custom_fields_orden ON public.custom_fields(orden);
CREATE INDEX IF NOT EXISTS idx_tarea_custom_values_tarea ON public.tarea_custom_field_values(tarea_id);
CREATE INDEX IF NOT EXISTS idx_tarea_custom_values_field ON public.tarea_custom_field_values(custom_field_id);
CREATE INDEX IF NOT EXISTS idx_templates_publico ON public.tarea_templates(es_publico);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON public.tarea_templates(created_by);

-- 5. Trigger para updated_at
CREATE TRIGGER update_custom_fields_updated_at
  BEFORE UPDATE ON public.custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tarea_custom_values_updated_at
  BEFORE UPDATE ON public.tarea_custom_field_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.tarea_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RLS Policies para custom_fields
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active custom fields"
  ON public.custom_fields FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE POLICY "Admins and consultores can manage custom fields"
  ON public.custom_fields FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'consultor'))
  WITH CHECK (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'consultor'));

-- 7. RLS Policies para tarea_custom_field_values
ALTER TABLE public.tarea_custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom field values of visible tareas"
  ON public.tarea_custom_field_values FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tareas 
    WHERE tareas.id = tarea_custom_field_values.tarea_id
  ));

CREATE POLICY "Users can manage custom field values of their tareas"
  ON public.tarea_custom_field_values FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tareas 
    WHERE tareas.id = tarea_custom_field_values.tarea_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tareas 
    WHERE tareas.id = tarea_custom_field_values.tarea_id
  ));

-- 8. RLS Policies para tarea_templates
ALTER TABLE public.tarea_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public templates and their own"
  ON public.tarea_templates FOR SELECT
  TO authenticated
  USING (es_publico = true OR created_by = auth.uid());

CREATE POLICY "Admins and consultores can create templates"
  ON public.tarea_templates FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'consultor'));

CREATE POLICY "Users can update their own templates, admins can update all"
  ON public.tarea_templates FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'administrador'))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'administrador'));

CREATE POLICY "Users can delete their own templates, admins can delete all"
  ON public.tarea_templates FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'administrador'));

-- 9. Función para incrementar uso de template
CREATE OR REPLACE FUNCTION public.increment_template_usage(template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tarea_templates
  SET veces_usado = veces_usado + 1
  WHERE id = template_id;
END;
$$;

-- 10. Insertar algunos custom fields de ejemplo
INSERT INTO public.custom_fields (nombre, descripcion, tipo, activo, orden) VALUES
  ('Número de Pedimento', 'Número del pedimento aduanal', 'text', true, 1),
  ('Fecha de Despacho', 'Fecha esperada de despacho', 'date', true, 2),
  ('Monto Factura', 'Monto total de la factura', 'currency', true, 3),
  ('Tipo de Certificación', 'Tipo de certificación a renovar', 'select', true, 4),
  ('Urgente', 'Marcar si requiere atención urgente', 'checkbox', true, 5)
ON CONFLICT DO NOTHING;

-- Actualizar las opciones del campo select
UPDATE public.custom_fields 
SET opciones = '["IVA/IEPS", "Matriz de Seguridad", "IMMEX", "PROSEC", "Otro"]'::jsonb
WHERE nombre = 'Tipo de Certificación';

-- 11. Insertar templates de ejemplo
INSERT INTO public.tarea_templates (nombre, descripcion, titulo_template, descripcion_template, prioridad, duracion_dias, checklist, es_publico) VALUES
  (
    'Renovación IMMEX',
    'Template para proceso de renovación de programa IMMEX',
    'Renovación IMMEX - [EMPRESA]',
    'Proceso de renovación del programa IMMEX para la empresa',
    'alta',
    30,
    '[
      {"texto": "Revisar vigencia actual del programa", "completado": false},
      {"texto": "Recopilar documentación requerida", "completado": false},
      {"texto": "Preparar solicitud de renovación", "completado": false},
      {"texto": "Enviar solicitud a la SE", "completado": false},
      {"texto": "Dar seguimiento a la solicitud", "completado": false},
      {"texto": "Recibir y archivar renovación", "completado": false}
    ]'::jsonb,
    true
  ),
  (
    'Certificación IVA/IEPS',
    'Template para proceso de certificación o renovación IVA/IEPS',
    'Certificación IVA/IEPS - [EMPRESA]',
    'Proceso de certificación o renovación de IVA/IEPS',
    'alta',
    45,
    '[
      {"texto": "Verificar requisitos actuales", "completado": false},
      {"texto": "Reunir documentación fiscal", "completado": false},
      {"texto": "Preparar expediente", "completado": false},
      {"texto": "Presentar solicitud ante SAT", "completado": false},
      {"texto": "Atender requerimientos", "completado": false},
      {"texto": "Obtener certificación", "completado": false}
    ]'::jsonb,
    true
  ),
  (
    'Actualización Matriz de Seguridad',
    'Template para actualización de matriz de seguridad',
    'Actualización Matriz de Seguridad - [EMPRESA]',
    'Proceso de actualización de la matriz de seguridad',
    'alta',
    20,
    '[
      {"texto": "Revisar matriz actual", "completado": false},
      {"texto": "Identificar cambios necesarios", "completado": false},
      {"texto": "Actualizar documentación", "completado": false},
      {"texto": "Enviar actualización", "completado": false},
      {"texto": "Confirmar recepción", "completado": false}
    ]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;
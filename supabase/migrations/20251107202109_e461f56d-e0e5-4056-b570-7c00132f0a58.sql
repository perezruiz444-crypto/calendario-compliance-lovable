-- Crear tabla para borradores de tareas
CREATE TABLE IF NOT EXISTS public.tareas_borradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT,
  descripcion TEXT,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  consultor_asignado_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prioridad TEXT,
  estado TEXT,
  fecha_vencimiento DATE,
  categoria_id UUID REFERENCES public.categorias_tareas(id) ON DELETE SET NULL,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  archivos_adjuntos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tareas_borradores ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own drafts
CREATE POLICY "Users can manage their own drafts"
  ON public.tareas_borradores
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_tareas_borradores_user_id ON public.tareas_borradores(user_id);
CREATE INDEX idx_tareas_borradores_updated_at ON public.tareas_borradores(updated_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_tareas_borradores_updated_at
  BEFORE UPDATE ON public.tareas_borradores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
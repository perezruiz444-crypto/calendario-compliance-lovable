-- Create table for task categories
CREATE TABLE IF NOT EXISTS public.categorias_tareas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.categorias_tareas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categorias_tareas
CREATE POLICY "Authenticated users can view categories"
  ON public.categorias_tareas
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and consultores can manage categories"
  ON public.categorias_tareas
  FOR ALL
  USING (
    has_role(auth.uid(), 'administrador'::app_role) OR
    has_role(auth.uid(), 'consultor'::app_role)
  );

-- Add categoria_id to tareas table
ALTER TABLE public.tareas
ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categorias_tareas(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tareas_categoria_id ON public.tareas(categoria_id);

-- Insert default categories
INSERT INTO public.categorias_tareas (nombre, descripcion, color) VALUES
  ('General', 'Tareas generales sin categoría específica', '#6366f1'),
  ('Fiscal', 'Tareas relacionadas con obligaciones fiscales', '#ef4444'),
  ('IMMEX', 'Tareas del programa IMMEX', '#f59e0b'),
  ('PROSEC', 'Tareas del programa PROSEC', '#10b981'),
  ('Aduanas', 'Trámites y gestiones aduanales', '#8b5cf6'),
  ('Anexo 24', 'Cumplimiento de Anexo 24', '#ec4899')
ON CONFLICT (nombre) DO NOTHING;

COMMENT ON TABLE public.categorias_tareas IS 'Categorías para clasificar tareas';
COMMENT ON COLUMN public.tareas.categoria_id IS 'Categoría de la tarea para clasificación';
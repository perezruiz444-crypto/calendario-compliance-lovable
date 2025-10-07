-- Add recurrence fields to tareas table
ALTER TABLE public.tareas
ADD COLUMN IF NOT EXISTS es_recurrente boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS frecuencia_recurrencia text CHECK (frecuencia_recurrencia IN ('diaria', 'semanal', 'mensual', 'trimestral', 'anual')),
ADD COLUMN IF NOT EXISTS intervalo_recurrencia integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS fecha_inicio_recurrencia date,
ADD COLUMN IF NOT EXISTS fecha_fin_recurrencia date,
ADD COLUMN IF NOT EXISTS tarea_padre_id uuid REFERENCES public.tareas(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS proxima_generacion date;

-- Add index for better query performance on recurring tasks
CREATE INDEX IF NOT EXISTS idx_tareas_recurrentes ON public.tareas(es_recurrente, proxima_generacion) WHERE es_recurrente = true;
CREATE INDEX IF NOT EXISTS idx_tareas_padre ON public.tareas(tarea_padre_id) WHERE tarea_padre_id IS NOT NULL;
-- Eliminar el constraint antiguo
ALTER TABLE public.notificaciones 
DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;

-- Agregar el nuevo constraint con el tipo 'reporte' incluido
ALTER TABLE public.notificaciones
ADD CONSTRAINT notificaciones_tipo_check 
CHECK (tipo IN ('mensaje', 'tarea_asignada', 'tarea_vencimiento', 'comentario', 'reporte'));
-- ============================================================
-- Security fixes batch 2
-- Fix #7: obligaciones INSERT scoped a empresa asignada (consultor)
-- Fix #8: realtime.messages RLS (suscripción a notificaciones)
-- Fix #9: task-attachments UPDATE policy + permitir cliente
-- ============================================================

-- ------------------------------------------------------------
-- Fix #7: obligaciones INSERT requiere asignacion del consultor
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins and consultores can insert obligaciones" ON public.obligaciones;

CREATE POLICY "obligaciones_insert_scoped"
ON public.obligaciones FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::app_role)
  OR (
    public.has_role(auth.uid(), 'consultor'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion
      WHERE consultor_id = auth.uid()
        AND consultor_empresa_asignacion.empresa_id = obligaciones.empresa_id
    )
  )
);

-- Misma proteccion en UPDATE
DROP POLICY IF EXISTS "Admins and consultores can update obligaciones" ON public.obligaciones;

CREATE POLICY "obligaciones_update_scoped"
ON public.obligaciones FOR UPDATE
USING (
  public.has_role(auth.uid(), 'administrador'::app_role)
  OR (
    public.has_role(auth.uid(), 'consultor'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion
      WHERE consultor_id = auth.uid()
        AND consultor_empresa_asignacion.empresa_id = obligaciones.empresa_id
    )
  )
);

-- ------------------------------------------------------------
-- Fix #8: realtime.messages — restringir suscripcion por topic
-- Convencion: topic = 'notificaciones:' || user_id
-- ------------------------------------------------------------
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe to own notification topic" ON realtime.messages;

CREATE POLICY "Users can subscribe to own notification topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Topic debe terminar con el uid del caller
  realtime.topic() = 'notificaciones:' || auth.uid()::text
  OR public.has_role(auth.uid(), 'administrador'::app_role)
);

-- ------------------------------------------------------------
-- Fix #9: task-attachments — agregar UPDATE policy + permitir clientes
-- ------------------------------------------------------------

-- Drop INSERT existente para reemplazar (permitir cliente cuyo empresa_id matchea la tarea)
DROP POLICY IF EXISTS "Users can upload task attachments to accessible tasks" ON storage.objects;

CREATE POLICY "task_attachments_insert_scoped"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.tareas t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (
          EXISTS (
            SELECT 1 FROM public.consultor_empresa_asignacion cea
            WHERE cea.consultor_id = auth.uid()
              AND cea.empresa_id = t.empresa_id
          )
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.empresa_id = t.empresa_id
          )
        )
    )
  )
);

-- UPDATE policy (faltaba completamente)
DROP POLICY IF EXISTS "task_attachments_update_scoped" ON storage.objects;

CREATE POLICY "task_attachments_update_scoped"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'administrador'::app_role)
    OR (
      owner = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.tareas t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND (
            EXISTS (
              SELECT 1 FROM public.consultor_empresa_asignacion cea
              WHERE cea.consultor_id = auth.uid()
                AND cea.empresa_id = t.empresa_id
            )
            OR EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.empresa_id = t.empresa_id
            )
          )
      )
    )
  )
);

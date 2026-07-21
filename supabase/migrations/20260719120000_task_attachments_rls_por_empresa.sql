-- =============================================================================
-- task-attachments: RLS por EMPRESA (primer segmento del path = empresa_id)
-- =============================================================================
-- Antes: las policies filtraban por tarea_id = foldername[1], pero el código
-- subía a `user_id/...`  (mismatch: la RLS no aislaba lo que creía).
-- Ahora el path es empresa_id/tarea_id/... y empresa_id/draft-{uuid}/..., mismo
-- patrón que los buckets `documentos` y `evidencias-cumplimiento`.
--
-- El primer segmento SIEMPRE es empresa_id (garantizado en FileAttachments.tsx,
-- que bloquea la subida sin empresa). Esto permite aislar borradores (aún sin
-- tarea) sin depender de que exista una fila en `tareas`.
--
-- Bucket vacío al aplicar (0 objetos) => sin migración de datos.
-- =============================================================================

-- Eliminar policies previas (nuevas "scoped" + legacy duplicadas).
DROP POLICY IF EXISTS "task_attachments_select_scoped" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_insert_scoped" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_update_scoped" ON storage.objects;
DROP POLICY IF EXISTS "Users can view task attachments they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Admins and file owners can delete task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;

-- Helper de aislamiento por empresa (primer segmento del path):
--   administrador  → todo
--   consultor      → empresas asignadas (consultor_empresa_asignacion)
--   cliente        → su propia empresa (profiles.empresa_id)

-- SELECT
CREATE POLICY "task_attachments_select_scoped"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (
      SELECT 1 FROM consultor_empresa_asignacion cea
      WHERE cea.consultor_id = auth.uid()
        AND cea.empresa_id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.empresa_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

-- INSERT
CREATE POLICY "task_attachments_insert_scoped"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (
      SELECT 1 FROM consultor_empresa_asignacion cea
      WHERE cea.consultor_id = auth.uid()
        AND cea.empresa_id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.empresa_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

-- UPDATE
CREATE POLICY "task_attachments_update_scoped"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (
      SELECT 1 FROM consultor_empresa_asignacion cea
      WHERE cea.consultor_id = auth.uid()
        AND cea.empresa_id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.empresa_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

-- DELETE (mismo alcance que documentos_delete_scoped: admin o consultor asignado)
CREATE POLICY "task_attachments_delete_scoped"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (
      SELECT 1 FROM consultor_empresa_asignacion cea
      WHERE cea.consultor_id = auth.uid()
        AND cea.empresa_id::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.empresa_id::text = (storage.foldername(objects.name))[1]
    )
  )
);

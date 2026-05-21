
-- ============================================================
-- SECURITY HARDENING: storage scoping, invitation tokens, RPC lockdown
-- ============================================================

-- 1) Storage: documentos bucket — scope consultor write/update/delete to assigned empresas
DROP POLICY IF EXISTS "Admins and consultores can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins and consultores can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins and consultores can delete documents" ON storage.objects;

CREATE POLICY "documentos_insert_scoped" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documentos'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion cea
      WHERE cea.consultor_id = auth.uid()
        AND cea.empresa_id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "documentos_update_scoped" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documentos'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion cea
      WHERE cea.consultor_id = auth.uid()
        AND cea.empresa_id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "documentos_delete_scoped" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documentos'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion cea
      WHERE cea.consultor_id = auth.uid()
        AND cea.empresa_id::text = (storage.foldername(name))[1]
    )
  )
);

-- 2) Storage: evidencias-cumplimiento bucket — scope consultor upload/delete
DROP POLICY IF EXISTS "evidencias: admin and consultor can upload" ON storage.objects;
DROP POLICY IF EXISTS "evidencias: admin and consultor can delete" ON storage.objects;

CREATE POLICY "evidencias_insert_scoped" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'evidencias-cumplimiento'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion cea
      WHERE cea.consultor_id = auth.uid()
        AND cea.empresa_id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "evidencias_delete_scoped" ON storage.objects
FOR DELETE USING (
  bucket_id = 'evidencias-cumplimiento'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'administrador'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion cea
      WHERE cea.consultor_id = auth.uid()
        AND cea.empresa_id::text = (storage.foldername(name))[1]
    )
  )
);

-- 3) Storage: task-attachments SELECT — scope consultor view by empresa assignment
DROP POLICY IF EXISTS "task-attachments: owner, admin and consultor can view" ON storage.objects;

CREATE POLICY "task_attachments_select_scoped" ON storage.objects
FOR SELECT USING (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'administrador'::app_role)
    OR owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tareas t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (
          EXISTS (
            SELECT 1 FROM public.consultor_empresa_asignacion cea
            WHERE cea.consultor_id = auth.uid()
              AND cea.empresa_id = t.empresa_id
          )
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.empresa_id = t.empresa_id
          )
        )
    )
  )
);

-- 4) Invitations: hide raw tokens from SELECT by consultores
-- Replace consultor SELECT policies with column-restricted SELECT via view-like approach.
-- Simpler: drop consultor SELECT on raw tables (admins still see), and let app fetch via edge function if needed.
DROP POLICY IF EXISTS "Consultores can view invitations they sent" ON public.user_invitations;
DROP POLICY IF EXISTS "Consultores can view client invitations of their empresas" ON public.client_invitations;

-- Replacement: consultores may see invitations metadata except the token, via filtered policy.
-- Since RLS can't hide columns, restrict reads to admins only; the token is single-use post-send.
-- (Consultor UI can still see status/email through future view if needed.)

-- 5) Lock down record_login_attempt RPC: revoke from anon
REVOKE EXECUTE ON FUNCTION public.record_login_attempt(text, inet, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, inet, boolean) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- Security Fix: Storage isolation + Profiles RLS
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- FIX 1a: task-attachments — path = {userId}/{filename}
-- Antes: cualquier usuario autenticado veía/subía cualquier adjunto
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view task attachments"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload task attachments" ON storage.objects;

-- SELECT: solo el dueño (mismo userId), admins y consultores
CREATE POLICY "task-attachments: owner, admin and consultor can view"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'task-attachments' AND
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'administrador'::app_role) OR
      has_role(auth.uid(), 'consultor'::app_role) OR
      auth.uid()::text = (storage.foldername(name))[1]
    )
  );

-- INSERT: solo puede subir a su propia carpeta
CREATE POLICY "task-attachments: only upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments' AND
    auth.uid() IS NOT NULL AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─────────────────────────────────────────────────────────────────
-- FIX 1b: documentos — path = {empresaId}/{filename}
-- Antes: cualquier usuario autenticado veía documentos de todas las empresas
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view their documents" ON storage.objects;

-- SELECT: admin, consultor asignado a esa empresa, cliente de esa empresa
CREATE POLICY "documentos storage: access by empresa membership"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documentos' AND
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'administrador'::app_role) OR
      EXISTS (
        SELECT 1 FROM public.consultor_empresa_asignacion cea
        WHERE cea.consultor_id = auth.uid()
          AND cea.empresa_id::text = (storage.foldername(name))[1]
      ) OR
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.empresa_id::text = (storage.foldername(name))[1]
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- FIX 1c: evidencias-cumplimiento — mejorar a role-based mínimo
-- Antes: bucket_id solo, cualquier autenticado
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can upload evidencias" ON storage.objects;
DROP POLICY IF EXISTS "Users can view evidencias"                 ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own evidencias"     ON storage.objects;

CREATE POLICY "evidencias: admin and consultor can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'evidencias-cumplimiento' AND
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'administrador'::app_role) OR
      has_role(auth.uid(), 'consultor'::app_role)
    )
  );

CREATE POLICY "evidencias: authenticated with role can view"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evidencias-cumplimiento' AND
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'administrador'::app_role) OR
      has_role(auth.uid(), 'consultor'::app_role) OR
      has_role(auth.uid(), 'cliente'::app_role)
    )
  );

CREATE POLICY "evidencias: admin and consultor can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'evidencias-cumplimiento' AND
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'administrador'::app_role) OR
      has_role(auth.uid(), 'consultor'::app_role)
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- FIX 3: profiles — restringir a perfiles relevantes por rol
-- Antes: cualquier usuario autenticado veía TODOS los perfiles
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Admins: todos los perfiles
CREATE POLICY "profiles: admins can view all"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- Consultores: su propio perfil + clientes de sus empresas asignadas
CREATE POLICY "profiles: consultores see own and their clients"
  ON public.profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'consultor'::app_role) AND (
      id = auth.uid() OR
      EXISTS (
        SELECT 1
        FROM public.consultor_empresa_asignacion cea
        JOIN public.profiles p2 ON p2.empresa_id = cea.empresa_id
        WHERE cea.consultor_id = auth.uid()
          AND p2.id = profiles.id
      )
    )
  );

-- Clientes: solo su propio perfil
CREATE POLICY "profiles: clientes see only own profile"
  ON public.profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'cliente'::app_role) AND
    id = auth.uid()
  );

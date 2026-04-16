
-- ============================================================
-- 1. Fix evidencias-cumplimiento storage: scope by empresa
-- ============================================================

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "evidencias: authenticated with role can view" ON storage.objects;

-- Create empresa-scoped SELECT policy
CREATE POLICY "evidencias: scoped by empresa" ON storage.objects
FOR SELECT USING (
  bucket_id = 'evidencias-cumplimiento'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'administrador')
    OR (public.has_role(auth.uid(), 'consultor') AND EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion
      WHERE consultor_id = auth.uid()
        AND empresa_id::text = (storage.foldername(name))[1]
    ))
    OR (public.has_role(auth.uid(), 'cliente') AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND empresa_id::text = (storage.foldername(name))[1]
    ))
  )
);

-- ============================================================
-- 2. Fix task-attachments: remove overly permissive upload policy
-- ============================================================

DROP POLICY IF EXISTS "task-attachments: only upload to own folder" ON storage.objects;

-- ============================================================
-- 3. Fix miembros_socios: scope SELECT to empresa relationship
-- ============================================================

-- Drop all existing SELECT policies on miembros_socios
DROP POLICY IF EXISTS "Miembros socios are viewable by authenticated users" ON public.miembros_socios;
DROP POLICY IF EXISTS "miembros_socios_select" ON public.miembros_socios;
DROP POLICY IF EXISTS "Anyone can view miembros_socios" ON public.miembros_socios;

-- Create properly scoped SELECT policy
CREATE POLICY "miembros_socios_select_scoped" ON public.miembros_socios
FOR SELECT USING (
  public.has_role(auth.uid(), 'administrador')
  OR EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion
    WHERE consultor_id = auth.uid()
      AND consultor_empresa_asignacion.empresa_id = miembros_socios.empresa_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND profiles.empresa_id = miembros_socios.empresa_id
  )
);

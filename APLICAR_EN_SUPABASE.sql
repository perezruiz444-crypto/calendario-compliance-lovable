-- ============================================================
-- FIXES DE SEGURIDAD - APLICAR EN SUPABASE SQL EDITOR
-- Pega TODO este archivo en el SQL Editor de Supabase y ejecuta UNA VEZ.
-- URL: https://supabase.com/dashboard/project/svozqrjhwaohfmbkhpig/sql/new
-- ============================================================

-- ============================================================
-- BATCH 1: RLS agentes_aduanales / miembros_socios / rate limit login
-- ============================================================

DROP POLICY IF EXISTS "Users can view miembros of visible empresas" ON public.miembros_socios;

DROP POLICY IF EXISTS "Users can view agentes of visible empresas" ON public.agentes_aduanales;

CREATE POLICY "agentes_aduanales_select_scoped" ON public.agentes_aduanales
FOR SELECT USING (
  public.has_role(auth.uid(), 'administrador')
  OR EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion
    WHERE consultor_id = auth.uid()
      AND consultor_empresa_asignacion.empresa_id = agentes_aduanales.empresa_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND profiles.empresa_id = agentes_aduanales.empresa_id
  )
);

CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email   text,
  p_ip      inet    DEFAULT NULL,
  p_success boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  IF p_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO recent_count
    FROM public.login_attempts
    WHERE ip_address = p_ip
      AND created_at > now() - interval '1 minute';
    IF recent_count >= 20 THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.login_attempts(email, ip_address, success)
  VALUES (p_email, p_ip, p_success);

  DELETE FROM public.login_attempts
  WHERE created_at < now() - interval '24 hours';
END;
$$;

-- ============================================================
-- BATCH 2: RLS obligaciones / realtime / task-attachments
-- ============================================================

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

-- Realtime: solo tu propio topic de notificaciones
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe to own notification topic" ON realtime.messages;

CREATE POLICY "Users can subscribe to own notification topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notificaciones:' || auth.uid()::text
  OR public.has_role(auth.uid(), 'administrador'::app_role)
);

-- Storage: task-attachments INSERT + UPDATE scoped (incluye clientes)
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
            WHERE p.id = auth.uid()
              AND p.empresa_id = t.empresa_id
          )
        )
    )
  )
);

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
              WHERE p.id = auth.uid()
                AND p.empresa_id = t.empresa_id
            )
          )
      )
    )
  )
);

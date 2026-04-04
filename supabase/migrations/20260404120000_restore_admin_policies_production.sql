-- ============================================================
-- RESTORE ALL MISSING ADMIN RLS POLICIES IN PRODUCTION
-- Run this in: https://supabase.com/dashboard/project/svozqrjhwaohfmbkhpig/sql/new
-- ============================================================

-- EMPRESAS
DROP POLICY IF EXISTS "Admins have full access to empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can view all empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can update empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins can delete empresas" ON public.empresas;
DROP POLICY IF EXISTS "Only admins can delete empresas" ON public.empresas;

CREATE POLICY "Admins have full access to empresas"
ON public.empresas FOR ALL
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'administrador'::app_role));

-- PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admins can update all" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'administrador'::app_role));

-- TAREAS
DROP POLICY IF EXISTS "Admins can view all tareas" ON public.tareas;
DROP POLICY IF EXISTS "Admins can manage all tareas" ON public.tareas;
DROP POLICY IF EXISTS "Admins and consultores can delete tareas" ON public.tareas;

CREATE POLICY "Admins can manage all tareas"
ON public.tareas FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- CONSULTOR_EMPRESA_ASIGNACION
DROP POLICY IF EXISTS "Admins can view all asignaciones" ON public.consultor_empresa_asignacion;
DROP POLICY IF EXISTS "Admins can manage asignaciones" ON public.consultor_empresa_asignacion;

CREATE POLICY "Admins can manage asignaciones"
ON public.consultor_empresa_asignacion FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- DOCUMENTOS
DROP POLICY IF EXISTS "Admins can manage all documentos" ON public.documentos;

CREATE POLICY "Admins can manage all documentos"
ON public.documentos FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- CATEGORIAS_TAREAS
DROP POLICY IF EXISTS "Admins and consultores can manage categories" ON public.categorias_tareas;

CREATE POLICY "Admins and consultores can manage categories"
ON public.categorias_tareas FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'consultor'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'consultor'::app_role));

-- SOLICITUDES_SERVICIO (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'solicitudes_servicio') THEN
    DROP POLICY IF EXISTS "Admins can manage all solicitudes" ON public.solicitudes_servicio;
    EXECUTE 'CREATE POLICY "Admins can manage all solicitudes" ON public.solicitudes_servicio FOR ALL
      USING (has_role(auth.uid(), ''administrador''::app_role))
      WITH CHECK (has_role(auth.uid(), ''administrador''::app_role))';
  END IF;
END $$;

-- AUDIT_LOGS
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'administrador'::app_role));

-- OBLIGACIONES (SELECT for admin)
DROP POLICY IF EXISTS "Admins can view all obligaciones" ON public.obligaciones;

CREATE POLICY "Admins can view all obligaciones"
ON public.obligaciones FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role));

-- NOTIFICATION_SETTINGS (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_settings') THEN
    DROP POLICY IF EXISTS "Admins can view notification settings" ON public.notification_settings;
    DROP POLICY IF EXISTS "Admins can update notification settings" ON public.notification_settings;
    EXECUTE 'CREATE POLICY "Admins can manage notification settings" ON public.notification_settings FOR ALL
      USING (has_role(auth.uid(), ''administrador''::app_role))
      WITH CHECK (has_role(auth.uid(), ''administrador''::app_role))';
  END IF;
END $$;

-- VERIFICACIÓN FINAL
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE qual LIKE '%administrador%' OR qual LIKE '%has_role%'
ORDER BY tablename, cmd;

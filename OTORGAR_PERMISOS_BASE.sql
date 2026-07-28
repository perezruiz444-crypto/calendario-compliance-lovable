-- ============================================================
-- SCRIPT DE PERMISOS BASE (GRANTS)
-- ============================================================
-- Incluso si RLS permite el acceso, PostgreSQL requiere que 
-- los roles de base de datos (como 'authenticated' o 'service_role')
-- tengan el permiso fundamental de la tabla (GRANT).
-- Este script otorga esos permisos base sin comprometer la seguridad,
-- ya que RLS seguirá filtrando las filas a las que realmente 
-- se puede acceder.

-- 1. EMPRESAS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;

-- 2. PROFILES
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 3. ASIGNACIONES
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultor_empresa_asignacion TO authenticated;
GRANT ALL ON public.consultor_empresa_asignacion TO service_role;

-- 4. TAREAS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareas TO authenticated;
GRANT ALL ON public.tareas TO service_role;

-- 5. OBLIGACIONES
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligaciones TO authenticated;
GRANT ALL ON public.obligaciones TO service_role;

-- 6. OCURRENCIAS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligacion_ocurrencias TO authenticated;
GRANT ALL ON public.obligacion_ocurrencias TO service_role;

-- 7. CUMPLIMIENTOS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligacion_cumplimientos TO authenticated;
GRANT ALL ON public.obligacion_cumplimientos TO service_role;

-- 8. DOCUMENTOS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;

-- 9. USER ROLES (Solo lectura para usuarios normales)
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

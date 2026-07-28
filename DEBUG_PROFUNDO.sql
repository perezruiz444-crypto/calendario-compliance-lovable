-- ============================================================
-- SCRIPT DE DIAGNÓSTICO PROFUNDO
-- ============================================================
-- Vamos a revisar punto por punto dónde se está rompiendo 
-- la cadena de permisos.

-- 1. Verificar si los permisos GRANT realmente se aplicaron a 'authenticated'
SELECT 
    grantee, 
    privilege_type 
FROM 
    information_schema.role_table_grants 
WHERE 
    table_name = 'empresas' 
    AND grantee IN ('authenticated', 'anon', 'public');

-- 2. Verificar exactamente qué políticas RLS sobrevivieron y están activas en "empresas"
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM 
    pg_policies 
WHERE 
    tablename = 'empresas';

-- 3. Verificar si el RLS sigue activo en user_roles (debería estar en false tras el script de limpieza)
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM 
    pg_class
WHERE 
    relname = 'user_roles';

-- 4. Verificar el contenido exacto de los roles para ver si hay duplicados
SELECT 
    p.email, 
    ur.role, 
    ur.created_at
FROM 
    public.user_roles ur
JOIN 
    public.profiles p ON ur.user_id = p.id;

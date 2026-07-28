-- ============================================================
-- SCRIPT DE DIAGNÓSTICO: OBTENER DETALLES DE ROLES Y POLÍTICAS
-- ============================================================
-- Ejecuta este script en el SQL Editor de Supabase y revisa 
-- los resultados en la parte inferior para descubrir el problema.

-- 1. Ver qué roles están asignados actualmente en la base de datos
SELECT 
    ur.user_id,
    p.email,
    ur.role,
    ur.created_at
FROM 
    public.user_roles ur
LEFT JOIN 
    public.profiles p ON ur.user_id = p.id;

-- 2. Ver el estado exacto de RLS en las tablas problemáticas
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM 
    pg_class
WHERE 
    relname IN ('empresas', 'user_roles', 'profiles', 'tareas');

-- 3. Ver qué políticas están activas actualmente en la tabla "empresas"
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd as operation, 
    qual as using_expression
FROM 
    pg_policies 
WHERE 
    tablename = 'empresas';

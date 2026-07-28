-- ============================================================
-- SCRIPT DE DIAGNÓSTICO DEFINITIVO (CAZADOR DE BLOQUEOS)
-- ============================================================
-- Ya probamos políticas "USING (true)" absolutas y no funcionaron. 
-- Esto significa que hay un bloqueo duro a nivel de base de datos 
-- que no es una política PERMISSIVE. Vamos a cazarlo.

-- 1. BUSCAR POLÍTICAS RESTRICTIVAS
-- Las políticas RESTRICTIVAS sobreescriben a las permisivas. 
-- Si hay una política "RESTRICTIVE" defectuosa, bloquea TODO.
SELECT 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual 
FROM 
    pg_policies 
WHERE 
    permissive = 'RESTRICTIVE';

-- 2. CONFIRMAR PERMISOS REALES DEL ROL 'authenticated' EN 'empresas'
-- Debemos asegurar que el GRANT fue exitoso y el rol autenticado tiene SELECT.
SELECT 
    table_schema, 
    table_name, 
    privilege_type 
FROM 
    information_schema.role_table_grants 
WHERE 
    grantee = 'authenticated' 
    AND table_name = 'empresas';

-- 3. CONFIRMAR QUÉ POLÍTICAS PERMISIVAS EXISTEN AHORA MISMO
-- Para ver si nuestro script RLS_DIRECTO realmente se aplicó
SELECT 
    policyname, 
    roles, 
    qual 
FROM 
    pg_policies 
WHERE 
    tablename = 'empresas' 
    AND permissive = 'PERMISSIVE';

-- 4. PRUEBA DE FUEGO (SIMULADOR DE RLS)
-- Vamos a simular qué pasa si un usuario autenticado cualquiera 
-- intenta leer la tabla empresas. 
-- (Si esto lanza error en el dashboard, sabremos el motivo exacto)
DO $$
BEGIN
    -- Cambiamos el rol simulando una llamada de API
    SET LOCAL ROLE authenticated;
    
    -- Intentamos leer (solo 1 fila)
    PERFORM * FROM public.empresas LIMIT 1;
    
    -- Volvemos a ser postgres
    RESET ROLE;
    RAISE NOTICE '¡La prueba de lectura de authenticated fue EXITOSA!';
EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RAISE NOTICE 'ERROR DURANTE LECTURA: %', SQLERRM;
END $$;

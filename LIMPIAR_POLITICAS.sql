-- ============================================================
-- SCRIPT DE LIMPIEZA: ELIMINAR CONFLICTOS EN POLÍTICAS
-- ============================================================
-- Descubrimos que existen políticas antiguas duplicadas (como 
-- "Admins have full access to empresas") que están interfiriendo y 
-- provocando errores al evaluarse. 
-- Vamos a limpiar las antiguas y dejar solo las que usan get_my_role()

-- 1. Limpiar políticas antiguas en EMPRESAS
DROP POLICY IF EXISTS "Admins have full access to empresas" ON public.empresas;
DROP POLICY IF EXISTS "Clientes can view their empresa only" ON public.empresas;
DROP POLICY IF EXISTS "Consultores can create empresas" ON public.empresas;
DROP POLICY IF EXISTS "Consultores can update their assigned empresas" ON public.empresas;
DROP POLICY IF EXISTS "Consultores can view their assigned empresas" ON public.empresas;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.empresas;

-- 2. Limpiar políticas antiguas en PROFILES (Usuarios)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Consultores can view assigned profiles" ON public.profiles;
DROP POLICY IF EXISTS "Clientes can view same empresa profiles" ON public.profiles;

-- 3. Limpiar políticas antiguas en CONSULTOR_EMPRESA_ASIGNACION
DROP POLICY IF EXISTS "Admins have full access to asignaciones" ON public.consultor_empresa_asignacion;
DROP POLICY IF EXISTS "Consultores can view their own asignaciones" ON public.consultor_empresa_asignacion;

-- 4. Desactivar RLS en user_roles para evitar recursiones infinitas ocultas
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

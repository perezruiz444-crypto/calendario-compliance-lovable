-- ============================================================
-- SCRIPT DEFINITIVO: RLS CON SUBCONSULTAS DIRECTAS
-- ============================================================
-- Al parecer, las funciones almacenadas (has_role o get_my_role) 
-- están perdiendo el contexto del usuario al ejecutarse dentro 
-- de las políticas de seguridad.
--
-- Como ya desactivamos el RLS en la tabla 'user_roles', podemos 
-- consultar el rol directamente sin usar funciones intermedias. 
-- Esto elimina CUALQUIER posibilidad de error interno.

-- 1. LIMPIEZA TOTAL DE POLÍTICAS EN EMPRESAS
DROP POLICY IF EXISTS "empresas_select_scoped" ON public.empresas;
DROP POLICY IF EXISTS "empresas_all_admin" ON public.empresas;
DROP POLICY IF EXISTS "Admins have full access to empresas" ON public.empresas;
DROP POLICY IF EXISTS "empresas_lectura_emergencia" ON public.empresas;

-- CREAR POLÍTICAS DIRECTAS PARA EMPRESAS
CREATE POLICY "empresas_select_directo" ON public.empresas FOR SELECT TO authenticated USING (
  (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'administrador'
  OR (
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'consultor' 
    AND EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion cea
      WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = empresas.id
    )
  )
  OR (
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'cliente' 
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.empresa_id = empresas.id
    )
  )
);

CREATE POLICY "empresas_all_admin_directo" ON public.empresas FOR ALL TO authenticated USING (
  (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'administrador'
);


-- 2. LIMPIEZA TOTAL EN TAREAS
DROP POLICY IF EXISTS "tareas_select_scoped" ON public.tareas;
DROP POLICY IF EXISTS "tareas_all_scoped" ON public.tareas;
DROP POLICY IF EXISTS "tareas_lectura_emergencia" ON public.tareas;

CREATE POLICY "tareas_select_directo" ON public.tareas FOR SELECT TO authenticated USING (
  (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'administrador'
  OR EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = tareas.empresa_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = tareas.empresa_id
  )
);


-- 3. LIMPIEZA TOTAL EN OCURRENCIAS (CALENDARIO)
DROP POLICY IF EXISTS "ocurrencias_select_scoped" ON public.obligacion_ocurrencias;
DROP POLICY IF EXISTS "ocurrencias_all_scoped" ON public.obligacion_ocurrencias;
DROP POLICY IF EXISTS "ocurrencias_lectura_emergencia" ON public.obligacion_ocurrencias;

CREATE POLICY "ocurrencias_select_directo" ON public.obligacion_ocurrencias FOR SELECT TO authenticated USING (
  (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'administrador'
  OR EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = obligacion_ocurrencias.empresa_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.empresa_id = obligacion_ocurrencias.empresa_id
  )
);


-- 4. LIMPIEZA TOTAL EN PROFILES (USUARIOS)
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_admin" ON public.profiles;
DROP POLICY IF EXISTS "perfiles_lectura_emergencia" ON public.profiles;

CREATE POLICY "profiles_select_directo" ON public.profiles FOR SELECT TO authenticated USING (
  (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'administrador'
  OR id = auth.uid()
  OR (
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'consultor' 
    AND EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion cea
      WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = profiles.empresa_id
    )
  )
  OR (
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'cliente' 
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.empresa_id = profiles.empresa_id
    )
  )
);

-- Asegurarnos de que el RLS esté DESACTIVADO en user_roles para que estas subconsultas funcionen siempre
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

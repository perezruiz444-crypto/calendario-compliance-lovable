-- ============================================================
-- SCRIPT FINAL: ERRADICACIÓN DE RECURSIÓN INFINITA
-- ============================================================
-- Hemos descubierto el origen exacto del fallo "Error al cargar": 
-- En PostgreSQL, las políticas con 'OR' no hacen "short-circuit" 
-- de manera predecible. Cuando el motor de base de datos lee la política
-- de 'empresas', también intenta evaluar la política de 'profiles' (para los clientes).
-- La política de 'profiles' a su vez consultaba a 'profiles', provocando
-- un ERROR DE RECURSIÓN INFINITA que tumbaba toda la consulta incluso 
-- si eres administrador.
-- 
-- SOLUCIÓN: Vamos a crear una función segura (SECURITY DEFINER) 
-- que lee tu empresa_id SIN disparar el sistema de RLS, rompiendo
-- así el ciclo infinito.

-- 1. CREAR FUNCIÓN SEGURA PARA LEER EL EMPRESA_ID
CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. DESACTIVAR RLS EN TABLAS DE PUENTE/METADATOS
-- Al igual que user_roles, estas tablas solo sirven para enlazar IDs
-- No necesitan RLS complejo, solo permisos de lectura base.
ALTER TABLE public.consultor_empresa_asignacion DISABLE ROW LEVEL SECURITY;

-- 3. REESCRIBIR POLÍTICAS DE EMPRESAS (SIN RECURSIÓN)
DROP POLICY IF EXISTS "empresas_select_directo" ON public.empresas;
DROP POLICY IF EXISTS "empresas_all_admin_directo" ON public.empresas;

CREATE POLICY "empresas_select_final" ON public.empresas FOR SELECT TO authenticated USING (
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
    AND public.get_my_empresa_id() = empresas.id
  )
);

CREATE POLICY "empresas_all_admin_final" ON public.empresas FOR ALL TO authenticated USING (
  (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'administrador'
);

-- 4. REESCRIBIR POLÍTICAS DE PROFILES (SIN RECURSIÓN)
DROP POLICY IF EXISTS "profiles_select_directo" ON public.profiles;

CREATE POLICY "profiles_select_final" ON public.profiles FOR SELECT TO authenticated USING (
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
    AND public.get_my_empresa_id() = profiles.empresa_id
  )
);

-- 5. REESCRIBIR POLÍTICAS DE TAREAS Y CALENDARIO (SIN RECURSIÓN)
DROP POLICY IF EXISTS "tareas_select_directo" ON public.tareas;
CREATE POLICY "tareas_select_final" ON public.tareas FOR SELECT TO authenticated USING (
  (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'administrador'
  OR EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = tareas.empresa_id
  )
  OR public.get_my_empresa_id() = tareas.empresa_id
);

DROP POLICY IF EXISTS "ocurrencias_select_directo" ON public.obligacion_ocurrencias;
CREATE POLICY "ocurrencias_select_final" ON public.obligacion_ocurrencias FOR SELECT TO authenticated USING (
  (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'administrador'
  OR EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion cea
    WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = obligacion_ocurrencias.empresa_id
  )
  OR public.get_my_empresa_id() = obligacion_ocurrencias.empresa_id
);

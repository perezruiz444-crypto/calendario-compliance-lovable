-- ============================================================
-- PARCHE DE EMERGENCIA: RESTAURAR VISIBILIDAD (LECTURA)
-- ============================================================
-- Este script crea políticas permisivas de SOLO LECTURA para 
-- usuarios autenticados en las tablas clave. 
-- Esto asegurará que puedas volver a ver las empresas y el calendario
-- de inmediato mientras revisamos por qué la función de roles está fallando.

-- 1. EMPRESAS
DROP POLICY IF EXISTS "empresas_lectura_emergencia" ON public.empresas;
CREATE POLICY "empresas_lectura_emergencia" ON public.empresas FOR SELECT TO authenticated USING (true);

-- 2. USUARIOS (PROFILES)
DROP POLICY IF EXISTS "perfiles_lectura_emergencia" ON public.profiles;
CREATE POLICY "perfiles_lectura_emergencia" ON public.profiles FOR SELECT TO authenticated USING (true);

-- 3. ASIGNACIONES
DROP POLICY IF EXISTS "cea_lectura_emergencia" ON public.consultor_empresa_asignacion;
CREATE POLICY "cea_lectura_emergencia" ON public.consultor_empresa_asignacion FOR SELECT TO authenticated USING (true);

-- 4. TAREAS
DROP POLICY IF EXISTS "tareas_lectura_emergencia" ON public.tareas;
CREATE POLICY "tareas_lectura_emergencia" ON public.tareas FOR SELECT TO authenticated USING (true);

-- 5. OCURRENCIAS (CALENDARIO)
DROP POLICY IF EXISTS "ocurrencias_lectura_emergencia" ON public.obligacion_ocurrencias;
CREATE POLICY "ocurrencias_lectura_emergencia" ON public.obligacion_ocurrencias FOR SELECT TO authenticated USING (true);

-- 6. DOCUMENTOS
DROP POLICY IF EXISTS "documentos_lectura_emergencia" ON public.documentos;
CREATE POLICY "documentos_lectura_emergencia" ON public.documentos FOR SELECT TO authenticated USING (true);

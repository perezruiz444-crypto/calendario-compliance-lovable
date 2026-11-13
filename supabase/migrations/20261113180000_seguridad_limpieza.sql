-- Endurecimiento de seguridad y limpieza de políticas.
-- 1. Versiona políticas que existían en producción solo por scripts sueltos de la raíz
--    y reemplaza el `LIMIT 1` sin orden por get_my_role() (rol de mayor jerarquía).
-- 2. Quita políticas duplicadas.
-- 3. Retira el bloqueo de login propio: nunca funcionó (record_login_attempt no es
--    ejecutable sin sesión) y abrirlo permitiría bloquear el correo de terceros.
--    La protección queda en Supabase Auth (rate limit) + hCaptcha.
-- 4. Funciones de trigger ya no se pueden invocar por RPC.
-- 5. Elimina crear_organizacion_inicial: referencia tablas que no existen.

-- 1. Políticas de lectura versionadas
DROP POLICY IF EXISTS tareas_select_final ON public.tareas;
CREATE POLICY tareas_select_final ON public.tareas FOR SELECT TO authenticated USING (
  (SELECT public.get_my_role()) = 'administrador'
  OR EXISTS (SELECT 1 FROM public.consultor_empresa_asignacion cea
             WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = tareas.empresa_id)
  OR public.get_my_empresa_id() = empresa_id
);

DROP POLICY IF EXISTS ocurrencias_select_final ON public.obligacion_ocurrencias;
CREATE POLICY ocurrencias_select_final ON public.obligacion_ocurrencias FOR SELECT TO authenticated USING (
  (SELECT public.get_my_role()) = 'administrador'
  OR EXISTS (SELECT 1 FROM public.consultor_empresa_asignacion cea
             WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = obligacion_ocurrencias.empresa_id)
  OR public.get_my_empresa_id() = empresa_id
);

DROP POLICY IF EXISTS profiles_select_final ON public.profiles;
CREATE POLICY profiles_select_final ON public.profiles FOR SELECT TO authenticated USING (
  (SELECT public.get_my_role()) = 'administrador'
  OR id = auth.uid()
  OR ((SELECT public.get_my_role()) = 'consultor' AND EXISTS (
        SELECT 1 FROM public.consultor_empresa_asignacion cea
        WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = profiles.empresa_id))
  OR ((SELECT public.get_my_role()) = 'cliente' AND public.get_my_empresa_id() = empresa_id)
);

-- 2. Duplicados exactos
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;  -- cubierta por profiles_select_final (id = auth.uid())
DROP POLICY IF EXISTS "Solo admins eliminan del catálogo" ON public.obligaciones_catalogo;

-- 3. Bloqueo de login propio
DROP FUNCTION IF EXISTS public.record_login_attempt(text, inet, boolean);
DROP FUNCTION IF EXISTS public.is_login_blocked(text, inet);
DROP TABLE IF EXISTS public.login_attempts;

-- 4. Funciones de trigger: solo las ejecuta el trigger
REVOKE EXECUTE ON FUNCTION public.trg_asignar_obligaciones_base() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_personas_tarea() FROM PUBLIC, anon, authenticated;

-- 5. Función rota
DROP FUNCTION IF EXISTS public.crear_organizacion_inicial(text, text, text, jsonb);

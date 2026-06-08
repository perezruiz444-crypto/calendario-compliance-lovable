-- FINDING: la política SELECT de comentarios carecía de scoping explícito por empresa.
-- La política original ("Users can view comentarios of visible tareas") solo verificaba
-- que la tarea EXISTIERA (SELECT 1 FROM tareas WHERE id = comentarios.tarea_id), delegando
-- el aislamiento de forma implícita al RLS de la tabla tareas. Esto es frágil: cualquier
-- política SELECT más permisiva o ruta SECURITY DEFINER sobre tareas expondría los
-- comentarios sin tocar esta tabla.
--
-- Fix: declarar el scope por rol, espejo del patrón vigente de tareas:
--   - consultor → consultor_empresa_asignacion (tareas:383-391)
--   - cliente   → profiles.empresa_id (migración 20251026161636)
-- tareas NO se modifica: su rol cliente ya fue corregido en 20251026161636.

DROP POLICY IF EXISTS "Users can view comentarios of visible tareas" ON public.comentarios;

-- Admin: ve todos los comentarios
CREATE POLICY "Admins can view all comentarios"
  ON public.comentarios FOR SELECT
  USING (public.has_role(auth.uid(), 'administrador'));

-- Consultor: solo comentarios de tareas de sus empresas asignadas
CREATE POLICY "Consultores can view comentarios of their empresas"
  ON public.comentarios FOR SELECT
  USING (
    public.has_role(auth.uid(), 'consultor') AND
    EXISTS (
      SELECT 1
      FROM public.tareas t
      JOIN public.consultor_empresa_asignacion a
        ON a.empresa_id = t.empresa_id
      WHERE t.id = comentarios.tarea_id
        AND a.consultor_id = auth.uid()
    )
  );

-- Cliente: solo comentarios de tareas de SU empresa (profiles.empresa_id)
CREATE POLICY "Clientes can view comentarios of their empresa"
  ON public.comentarios FOR SELECT
  USING (
    public.has_role(auth.uid(), 'cliente') AND
    EXISTS (
      SELECT 1
      FROM public.tareas t
      JOIN public.profiles p
        ON p.empresa_id = t.empresa_id
      WHERE t.id = comentarios.tarea_id
        AND p.id = auth.uid()
    )
  );

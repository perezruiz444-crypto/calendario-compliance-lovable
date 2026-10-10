-- Hallazgos de auditoría: políticas FOR ALL que solo revisaban el rol (consultor podía
-- tocar responsables, dependencias y asignaciones de cualquier empresa), INSERT de
-- cumplimientos sin amarrar obligacion_id y corregir_cumplimiento sin validar al llamador.

-- Helper: admin, o consultor asignado a la empresa. Amarrado a auth.uid().
CREATE OR REPLACE FUNCTION public.puede_gestionar_empresa(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'administrador')
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN consultor_empresa_asignacion cea ON cea.consultor_id = ur.user_id
      WHERE ur.user_id = auth.uid() AND ur.role = 'consultor' AND cea.empresa_id = _empresa_id
    )
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.puede_gestionar_empresa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_gestionar_empresa(uuid) TO authenticated;

-- obligacion_responsables
DROP POLICY IF EXISTS "Admins and consultores can manage responsables" ON public.obligacion_responsables;
CREATE POLICY obligacion_responsables_manage_scoped ON public.obligacion_responsables
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM obligaciones o
                 WHERE o.id = obligacion_responsables.obligacion_id
                   AND puede_gestionar_empresa(o.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM obligaciones o
                      WHERE o.id = obligacion_responsables.obligacion_id
                        AND puede_gestionar_empresa(o.empresa_id)));

-- tarea_dependencias: ambas tareas deben ser gestionables
DROP POLICY IF EXISTS "Admins and consultores can manage dependencias" ON public.tarea_dependencias;
CREATE POLICY tarea_dependencias_manage_scoped ON public.tarea_dependencias
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tareas t WHERE t.id = tarea_dependencias.tarea_id AND puede_gestionar_empresa(t.empresa_id))
    AND EXISTS (SELECT 1 FROM tareas t WHERE t.id = tarea_dependencias.depende_de_tarea_id AND puede_gestionar_empresa(t.empresa_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tareas t WHERE t.id = tarea_dependencias.tarea_id AND puede_gestionar_empresa(t.empresa_id))
    AND EXISTS (SELECT 1 FROM tareas t WHERE t.id = tarea_dependencias.depende_de_tarea_id AND puede_gestionar_empresa(t.empresa_id))
  );

-- tarea_asignaciones
DROP POLICY IF EXISTS "Admins and consultores can manage asignaciones" ON public.tarea_asignaciones;
CREATE POLICY tarea_asignaciones_manage_scoped ON public.tarea_asignaciones
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tareas t WHERE t.id = tarea_asignaciones.tarea_id AND puede_gestionar_empresa(t.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tareas t WHERE t.id = tarea_asignaciones.tarea_id AND puede_gestionar_empresa(t.empresa_id)));

-- obligaciones DELETE: acotar (hoy safeupdate lo mitiga, pero la política era solo por rol)
DROP POLICY IF EXISTS "Admins and consultores can delete obligaciones" ON public.obligaciones;
CREATE POLICY obligaciones_delete_scoped ON public.obligaciones
  FOR DELETE TO authenticated
  USING (puede_gestionar_empresa(empresa_id));

-- cumplimientos INSERT: la obligación debe pertenecer a la misma empresa
-- (set_cumplimiento_empresa_id corre BEFORE INSERT, así que empresa_id ya está resuelto aquí)
DROP POLICY IF EXISTS cumplimientos_insert ON public.obligacion_cumplimientos;
CREATE POLICY cumplimientos_insert ON public.obligacion_cumplimientos
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM obligaciones o
            WHERE o.id = obligacion_cumplimientos.obligacion_id
              AND o.empresa_id = obligacion_cumplimientos.empresa_id)
    AND (
      puede_gestionar_empresa(empresa_id)
      OR (has_role(auth.uid(), 'cliente') AND empresa_id = get_my_empresa_id())
    )
  );

-- corregir_cumplimiento: mismo criterio que el INSERT
CREATE OR REPLACE FUNCTION public.corregir_cumplimiento(p_cumplimiento_id uuid, p_completada boolean, p_notas text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old public.obligacion_cumplimientos%ROWTYPE;
  v_new_id uuid;
BEGIN
  SELECT * INTO v_old FROM public.obligacion_cumplimientos WHERE id = p_cumplimiento_id AND vigente = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cumplimiento % no existe o ya fue reemplazado', p_cumplimiento_id;
  END IF;

  IF NOT (
    public.puede_gestionar_empresa(v_old.empresa_id)
    OR (public.has_role(auth.uid(), 'cliente') AND v_old.empresa_id = public.get_my_empresa_id())
  ) THEN
    RAISE EXCEPTION 'Sin permiso para corregir este cumplimiento' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.obligacion_cumplimientos
    (obligacion_id, ocurrencia_id, empresa_id, periodo_key, completada, completada_por, notas, vigente)
  VALUES
    (v_old.obligacion_id, v_old.ocurrencia_id, v_old.empresa_id, v_old.periodo_key,
     p_completada, auth.uid(), coalesce(p_notas, v_old.notas), true)
  RETURNING id INTO v_new_id;

  UPDATE public.obligacion_cumplimientos
    SET vigente = false, reemplazado_por = v_new_id
    WHERE id = p_cumplimiento_id;

  RETURN v_new_id;
END;
$function$;

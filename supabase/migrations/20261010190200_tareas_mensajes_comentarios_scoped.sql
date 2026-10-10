-- Aplicada en producción el 2026-10-10 (vía MCP con ALTER POLICY / CREATE OR REPLACE; mismo estado final).
-- Re-ejecutable: cada DROP IF EXISTS cubre el nombre viejo y el nuevo.
-- Hallazgos de auditoría: tareas.consultor_asignado_id / creado_por sin amarrar (notificaciones
-- y correos a usuarios de otras empresas), mensajes a cualquier usuario (relay de correo
-- corporativo), comentarios y time_entries en tareas de otra empresa.

-- ── tareas: asignado debe atender a la empresa; creado_por = quien crea ──
CREATE OR REPLACE FUNCTION public.validar_personas_tarea()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- service role / cron: sin sesión de usuario, no se valida
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.creado_por := auth.uid();
  ELSIF NEW.creado_por IS DISTINCT FROM OLD.creado_por THEN
    NEW.creado_por := OLD.creado_por;
  END IF;

  IF NEW.consultor_asignado_id IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR NEW.consultor_asignado_id IS DISTINCT FROM OLD.consultor_asignado_id
          OR NEW.empresa_id IS DISTINCT FROM OLD.empresa_id)
     AND NOT EXISTS (
       SELECT 1 FROM user_roles ur
       WHERE ur.user_id = NEW.consultor_asignado_id
         AND (ur.role = 'administrador'
              OR (ur.role = 'consultor' AND EXISTS (
                    SELECT 1 FROM consultor_empresa_asignacion cea
                    WHERE cea.consultor_id = NEW.consultor_asignado_id
                      AND cea.empresa_id = NEW.empresa_id)))
     ) THEN
    RAISE EXCEPTION 'El consultor asignado no atiende a esta empresa' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validar_personas_tarea ON public.tareas;
CREATE TRIGGER trg_validar_personas_tarea
  BEFORE INSERT OR UPDATE OF consultor_asignado_id, creado_por, empresa_id ON public.tareas
  FOR EACH ROW EXECUTE FUNCTION public.validar_personas_tarea();

-- ── comentarios: solo en tareas visibles para quien comenta ──
DROP POLICY IF EXISTS "Authenticated users can create comentarios" ON public.comentarios;
CREATE POLICY "Authenticated users can create comentarios" ON public.comentarios
  FOR INSERT
  WITH CHECK (auth.uid() = user_id
              AND EXISTS (SELECT 1 FROM tareas t WHERE t.id = comentarios.tarea_id));

DROP POLICY IF EXISTS "Users can update their own comentarios" ON public.comentarios;
CREATE POLICY "Users can update their own comentarios" ON public.comentarios
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id
              AND EXISTS (SELECT 1 FROM tareas t WHERE t.id = comentarios.tarea_id));

-- ── time_entries: igual ──
DROP POLICY IF EXISTS "Users can manage their own time entries" ON public.time_entries;
CREATE POLICY "Users can manage their own time entries" ON public.time_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id
              AND EXISTS (SELECT 1 FROM tareas t WHERE t.id = time_entries.tarea_id));

-- ── mensajes: destinatario visible para el remitente (igual que el selector de la UI,
--    que lista perfiles visibles por RLS) o que ya le haya escrito antes (respuesta) ──
DROP POLICY IF EXISTS "Users can send messages" ON public.mensajes;
CREATE POLICY "Users can send messages" ON public.mensajes
  FOR INSERT
  WITH CHECK (
    auth.uid() = remitente_id
    AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = mensajes.destinatario_id)
      OR EXISTS (SELECT 1 FROM mensajes m
                 WHERE m.remitente_id = mensajes.destinatario_id
                   AND m.destinatario_id = auth.uid())
    )
  );

-- El destinatario solo puede cambiar "leido"
CREATE OR REPLACE FUNCTION public.mensajes_solo_leido_destinatario()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.destinatario_id
     AND auth.uid() IS DISTINCT FROM OLD.remitente_id
     AND (NEW.remitente_id, NEW.destinatario_id, NEW.empresa_id, NEW.asunto, NEW.contenido, NEW.created_at)
         IS DISTINCT FROM
         (OLD.remitente_id, OLD.destinatario_id, OLD.empresa_id, OLD.asunto, OLD.contenido, OLD.created_at)
  THEN
    RAISE EXCEPTION 'Solo se puede marcar el mensaje como leído' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_mensajes_solo_leido ON public.mensajes;
CREATE TRIGGER trg_mensajes_solo_leido
  BEFORE UPDATE ON public.mensajes
  FOR EACH ROW EXECUTE FUNCTION public.mensajes_solo_leido_destinatario();

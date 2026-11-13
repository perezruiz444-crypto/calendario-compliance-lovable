-- Retira las tablas de funciones que se quitaron de la app (todas con 0 filas en producción).
-- Falla sin tocar nada si alguna tabla tiene datos.
DO $$
DECLARE t text; n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY['categorias_tareas','tarea_templates','tareas_borradores','custom_fields',
    'tarea_custom_field_values','automation_rules','automation_logs','documentos','solicitudes_servicio',
    'subtareas','comentarios','time_entries','tarea_asignaciones','tarea_dependencias',
    'notification_settings','notification_logs','user_notification_preferences',
    'client_invitations','miembros_socios'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n > 0 THEN RAISE EXCEPTION 'La tabla % tiene % filas; revisar antes de borrar', t, n; END IF;
    END IF;
  END LOOP;
END $$;

-- Triggers y funciones que dependen de esas tablas
DROP TRIGGER IF EXISTS notify_tarea_completed_unblock ON public.tareas;
DROP FUNCTION IF EXISTS public.notify_tarea_unblocked();
DROP FUNCTION IF EXISTS public.get_subtareas_progress(uuid);
DROP FUNCTION IF EXISTS public.get_total_time_spent(uuid);
DROP FUNCTION IF EXISTS public.is_tarea_blocked(uuid);
DROP FUNCTION IF EXISTS public.increment_template_usage(uuid);

-- Categorías: primero la columna de tareas que las referencia
ALTER TABLE public.tareas DROP COLUMN IF EXISTS categoria_id;

DROP TABLE IF EXISTS public.automation_logs, public.automation_rules,
  public.tarea_custom_field_values, public.custom_fields,
  public.tarea_templates, public.tareas_borradores, public.categorias_tareas,
  public.subtareas, public.comentarios, public.time_entries,
  public.tarea_asignaciones, public.tarea_dependencias,
  public.documentos, public.solicitudes_servicio,
  public.notification_settings, public.notification_logs, public.user_notification_preferences,
  public.client_invitations, public.miembros_socios;

-- Sus funciones de trigger quedan huérfanas al borrar las tablas
DROP FUNCTION IF EXISTS public.notify_new_comentario();
DROP FUNCTION IF EXISTS public.notify_new_solicitud();

-- Políticas del bucket `documentos` (el bucket se vacía y borra desde el panel de Storage)
DROP POLICY IF EXISTS "documentos storage: access by empresa membership" ON storage.objects;
DROP POLICY IF EXISTS documentos_insert_scoped ON storage.objects;
DROP POLICY IF EXISTS documentos_update_scoped ON storage.objects;
DROP POLICY IF EXISTS documentos_delete_scoped ON storage.objects;

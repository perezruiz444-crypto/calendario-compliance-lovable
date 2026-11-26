-- Retira las tablas de funciones que se quitaron de la app.
-- Aplicar solo después de publicar en Lovable la versión que ya no usa estas tablas.
-- Se CONSERVAN categorias_tareas y tareas.categoria_id: las 31 tareas tienen categoría.
-- Conteo real (2026-11-26): tarea_templates 3 y custom_fields 3 (datos de ejemplo),
-- notification_settings 18 (configuración que ningún código lee); el resto, 0 filas.
BEGIN;

-- Aborta sin tocar nada si una tabla que debe estar vacía tiene datos.
DO $$
DECLARE t text; n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY['tareas_borradores','tarea_custom_field_values','automation_rules',
    'automation_logs','documentos','solicitudes_servicio','subtareas','comentarios','time_entries',
    'tarea_asignaciones','tarea_dependencias','notification_logs','user_notification_preferences',
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

DROP TABLE IF EXISTS public.automation_logs, public.automation_rules,
  public.tarea_custom_field_values, public.custom_fields,
  public.tarea_templates, public.tareas_borradores,
  public.subtareas, public.comentarios, public.time_entries,
  public.tarea_asignaciones, public.tarea_dependencias,
  public.documentos, public.solicitudes_servicio,
  public.notification_settings, public.notification_logs, public.user_notification_preferences,
  public.client_invitations, public.miembros_socios;

-- Funciones de trigger que quedan huérfanas
DROP FUNCTION IF EXISTS public.notify_new_comentario();
DROP FUNCTION IF EXISTS public.notify_new_solicitud();

-- Políticas del bucket `documentos` (el bucket se vacía y borra desde el panel de Storage)
DROP POLICY IF EXISTS "documentos storage: access by empresa membership" ON storage.objects;
DROP POLICY IF EXISTS documentos_insert_scoped ON storage.objects;
DROP POLICY IF EXISTS documentos_update_scoped ON storage.objects;
DROP POLICY IF EXISTS documentos_delete_scoped ON storage.objects;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261126150000', 'retirar_funciones_sin_uso')
ON CONFLICT (version) DO NOTHING;

COMMIT;

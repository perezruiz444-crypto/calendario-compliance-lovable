
## Problema

Hoy el componente `FileAttachments` sí funciona (sube a Supabase Storage bucket `task-attachments`, valida MIME/tamaño, descarga, elimina), pero **solo se usa en modo edición al crear tareas**. Al abrir una tarea existente (`TareaDetailDialog` y `TareaDetailSheet`), los archivos aparecen **solo lectura**, y si la tarea no tiene adjuntos, la sección ni siquiera se muestra. Resultado: el usuario percibe que "el espacio de evidencias no funciona por tarea".

Además, cuando se suben archivos, no se persisten de vuelta a la columna `tareas.archivos_adjuntos` (falta el `UPDATE` a la tabla en el detalle).

## Cambios

### 1. `src/components/tareas/TareaDetailDialog.tsx`
- Mostrar **siempre** la sección "Evidencias / Archivos adjuntos" (no solo cuando ya hay archivos).
- Reemplazar `readonly={true}` por editable, con permisos:
  - Consultores/administradores: siempre pueden subir/eliminar.
  - Clientes: pueden subir/eliminar solo si la tarea les está asignada o es de su empresa.
- `onAttachmentsChange` debe hacer `UPDATE public.tareas SET archivos_adjuntos = <nuevo array> WHERE id = tarea.id`, refrescar el estado local y mostrar `toast.success`.
- Renombrar el título visible a "Evidencias" para alinear con el lenguaje de la app.

### 2. `src/components/tareas/TareaDetailSheet.tsx`
- Reemplazar el listado inline actual (líneas ~403-409) por el componente `FileAttachments` completo, con la misma lógica de permisos y persistencia que el Dialog.
- Mostrar siempre la sección, aun cuando esté vacía, con un texto guía ("Sube el archivo que respalda el cumplimiento de esta tarea").

### 3. `src/components/tareas/FileAttachments.tsx`
- Bug menor: el `<input id="file-upload">` usa un id fijo; si dos instancias coexisten (dialog + sheet + create), el click abre el input equivocado. Cambiar a un id único por instancia (`useId()`).
- Sin cambios de lógica de subida.

### 4. Verificación
- Ya existen las policies de `storage.objects` para bucket `task-attachments` (migración `20260404000000_fix_storage_and_profiles_rls.sql`) y grants sobre `tareas`. No se requiere migración.
- Verificar en runtime: abrir una tarea existente → subir un PDF → cerrar y reabrir → el archivo persiste y se puede descargar/eliminar.

## Fuera de alcance
- No se toca la lógica de evidencias de **obligaciones** (`EvidenciaCumplimiento.tsx`), que ya funciona con su propio bucket `evidencias-cumplimiento`.
- No se cambia el bucket ni las políticas RLS.

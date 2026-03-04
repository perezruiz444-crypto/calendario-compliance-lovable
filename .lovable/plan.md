

## Plan: Obligaciones como fuente de tareas con asignación de responsable

### Concepto

Actualmente obligaciones y tareas son entidades separadas. La propuesta es que las **obligaciones sean la fuente principal** de los pendientes de compliance, y que cada obligación pueda "activarse" como tarea visible para todos, con un responsable asignado (cliente o consultor).

### Cambios en base de datos

**Nuevas columnas en la tabla `obligaciones`:**
- `activa` (boolean, default false) -- indica si la obligación está "activada" como pendiente visible
- `responsable_tipo` (text, nullable) -- valores: `'cliente'`, `'consultor'`  
- `responsable_id` (uuid, nullable) -- el usuario específico asignado

Esto elimina la necesidad de duplicar datos en la tabla `tareas`. La obligación misma se convierte en el pendiente asignable.

### Cambios en el formulario de obligaciones

**Archivo:** `src/components/obligaciones/ObligacionFormDialog.tsx`
- Agregar un **switch "Activar como pendiente"** que controla el campo `activa`
- Cuando se activa, mostrar:
  - **Selector de responsable**: dropdown con opciones "Cliente (empresa)" o "Consultor", y luego un selector del usuario específico
  - Si se elige "Cliente", listar los usuarios con rol `cliente` de esa empresa
  - Si se elige "Consultor", listar los consultores asignados a esa empresa

### Cambios en la vista del consultor (ObligacionesManager)

**Archivo:** `src/components/obligaciones/ObligacionesManager.tsx`
- En la lista de obligaciones, mostrar un badge indicando el responsable asignado
- Agregar filtro por responsable (Cliente / Consultor / Sin asignar)
- Las obligaciones activas se distinguen visualmente (icono o badge "Activa")

### Cambios en la vista del cliente (MiEmpresa)

**Archivo:** `src/pages/MiEmpresa.tsx`
- En el tab "Obligaciones", mostrar **solo las obligaciones activadas** que le correspondan al cliente (donde `responsable_tipo = 'cliente'` o sin filtro de responsable)
- Mantener los checkboxes de cumplimiento por periodo

### Cambios en el Calendario

**Archivo:** `src/components/dashboard/DashboardCalendar.tsx`
- Mostrar solo obligaciones con `activa = true` en el calendario
- Incluir el nombre del responsable en el tooltip del evento

### Resumen de archivos a modificar

| Archivo | Cambio |
|---|---|
| Migración SQL | 3 columnas nuevas en `obligaciones` |
| `ObligacionFormDialog.tsx` | Switch "Activar", selector de responsable |
| `ObligacionesManager.tsx` | Badge responsable, filtro, visual de "activa" |
| `MiEmpresa.tsx` | Filtrar solo obligaciones activas del cliente |
| `DashboardCalendar.tsx` | Filtrar obligaciones activas en calendario |

### Beneficios
- **Una sola entidad**: las obligaciones son los pendientes, no se duplican como tareas
- **Asignación clara**: cada obligación dice quién es responsable
- **Visibilidad**: el calendario y la vista del cliente solo muestran lo relevante
- **Cumplimiento por periodo**: se mantiene el sistema de checkboxes semanal/mensual/anual


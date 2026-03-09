

## Plan: Tareas para clientes + Fechas de renovación PROSEC

### Dos cambios solicitados

**1. Clientes pueden ver y completar tareas asignadas a su empresa**

La página `MiEmpresa.tsx` actualmente solo muestra obligaciones. Los clientes necesitan ver las tareas de su empresa y poder marcarlas como completadas. Las políticas RLS ya permiten SELECT y UPDATE de tareas para clientes.

Cambios en `src/pages/MiEmpresa.tsx`:
- Agregar un nuevo tab "Tareas" en el TabsList (pasar de 4 a 5 columnas)
- Fetch tareas de la empresa del cliente (filtrar por empresa_id del perfil, estado != 'completada')
- Mostrar cada tarea con Checkbox para marcar como completada (actualizar `estado` a `'completada'` en Supabase)
- Mostrar prioridad, fecha de vencimiento y estado actual de cada tarea
- Agregar contador de tareas pendientes en el tab

**2. Fechas de renovación en formulario PROSEC**

El card `EmpresaPROSECCard` ya muestra última/siguiente renovación correctamente. Pero el formulario de creación `EmpresaFormPROSEC.tsx` solo tiene fecha de autorización — falta agregar los campos de última renovación y siguiente renovación.

Cambios en `src/components/empresas/EmpresaFormPROSEC.tsx`:
- Agregar dos Popover+Calendar adicionales después del de fecha de autorización:
  - `prosec_fecha_ultima_renovacion`
  - `prosec_fecha_siguiente_renovacion`
- Seguir el mismo patrón de date picker con `captionLayout="dropdown-buttons"`

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/MiEmpresa.tsx` | Nuevo tab "Tareas" con fetch, display y toggle completar |
| `src/components/empresas/EmpresaFormPROSEC.tsx` | Agregar 2 date pickers para última/siguiente renovación |

No se requieren cambios de base de datos — las columnas y políticas RLS ya existen.


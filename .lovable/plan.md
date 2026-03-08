

## Plan: Unificación y optimización del sistema Tareas/Obligaciones

### Problema actual

1. **Código duplicado**: `getCurrentPeriodKey` y `getPeriodLabel` están copiadas en 3 archivos (ObligacionesManager, MiEmpresa, y la lógica del calendario).
2. **Dos sistemas paralelos**: La página de Tareas (1300 líneas) y ObligacionesManager (607 líneas) funcionan como sistemas independientes cuando las obligaciones activadas ya son "tareas" para el cliente.
3. **Dashboard del cliente limitado**: MiEmpresa muestra obligaciones en una lista simple sin resumen visual de progreso.
4. **Sin vista unificada**: El consultor tiene que ir a Tareas y luego a cada empresa para ver obligaciones. No hay una vista donde vea "todo lo pendiente" (tareas + obligaciones activas) en un solo lugar.

---

### Cambios planificados

#### 1. Extraer utilidades compartidas a un módulo común

**Crear:** `src/lib/obligaciones.ts`
- Mover `getCurrentPeriodKey`, `getPeriodLabel`, `getVencimientoBadge`, `formatDateShort` y las constantes `CATEGORIA_LABELS` / `CATEGORIA_COLORS`
- Reutilizar desde ObligacionesManager, MiEmpresa y DashboardCalendar
- Elimina ~120 líneas de código duplicado

#### 2. Dashboard del cliente con resumen de progreso

**Modificar:** `src/pages/MiEmpresa.tsx`
- Agregar tarjetas de resumen arriba del tab de obligaciones: "Completadas este periodo", "Pendientes", "Próximas a vencer"
- Barra de progreso visual del cumplimiento del periodo actual
- Agrupar obligaciones por categoría (IMMEX, PROSEC, etc.) con collapse/expand

#### 3. Vista unificada de pendientes para consultores

**Modificar:** `src/pages/Dashboard.tsx`
- Agregar una sección "Pendientes de Obligaciones" que muestre las obligaciones activas asignadas al consultor o a sus empresas, junto con el estado de cumplimiento del periodo actual
- Esto elimina la necesidad de navegar empresa por empresa

#### 4. Tabla de tareas: mostrar obligaciones activas integradas

**Modificar:** `src/pages/Tareas.tsx`
- Agregar un tab o filtro "Obligaciones Activas" que muestre las obligaciones con `activa = true` en el mismo formato de lista/kanban
- Permitir al consultor ver y filtrar por obligaciones activas sin salir de la vista de tareas

---

### Resumen de archivos

| Archivo | Cambio |
|---|---|
| `src/lib/obligaciones.ts` | Nuevo: utilidades compartidas de periodo y badges |
| `src/components/obligaciones/ObligacionesManager.tsx` | Importar de `lib/obligaciones.ts`, eliminar duplicados |
| `src/pages/MiEmpresa.tsx` | Importar de `lib/obligaciones.ts`, agregar resumen de progreso |
| `src/pages/Dashboard.tsx` | Sección de obligaciones activas pendientes para consultores |
| `src/pages/Tareas.tsx` | Tab/filtro para ver obligaciones activas integradas |

### Beneficios
- Menos código duplicado, mantenimiento centralizado
- El cliente ve su progreso de cumplimiento de un vistazo
- El consultor ve obligaciones y tareas en un solo lugar
- Se mantiene la separación lógica (obligaciones = compliance, tareas = operativo) pero se presenta de forma unificada


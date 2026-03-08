

## Revision: Carga de tareas y bugs encontrados

Despues de revisar exhaustivamente el codigo de carga de tareas en los 3 puntos principales (Dashboard/useAnalytics, DashboardCalendar, y Tareas page), el sistema funciona correctamente en general. No hay bugs criticos que impidan la carga de tareas.

### Bugs y problemas identificados

| # | Bug | Archivo | Severidad |
|---|---|---|---|
| 1 | **Tareas page calendar no usa estilos modernos** | `Tareas.tsx` lineas 1179-1241 | Visual |
| 2 | **Stats cards usan filteredTareas en vez de todas** | `Tareas.tsx` lineas 1029, 1047, 1065 | Logico |
| 3 | **DragOverlay crash si tarea no encontrada** | `Tareas.tsx` linea 1271 | Runtime |
| 4 | **Canceladas no se muestran en stats** | `Tareas.tsx` linea 700 | UX |
| 5 | **Calendar en Tareas no tiene popup ni badges** | `Tareas.tsx` lineas 1189-1238 | Inconsistencia |

### Detalle

#### 1. Calendar view en Tareas usa estilos viejos
El calendario dentro de la pagina `/tareas` (viewMode === 'calendar') usa los estilos por defecto de react-big-calendar sin la clase `rbc-calendar-enhanced` ni los estilos modernos que se aplicaron al DashboardCalendar. Se ve inconsistente.

**Fix**: Envolver en `<div className="rbc-calendar-enhanced">` y aplicar el mismo `eventStyleGetter` moderno con bordes izquierdos translucidos.

#### 2. Stats cards muestran conteo filtrado, no total
Las cards de "Pendientes", "En Progreso" y "Completadas" en la pagina de Tareas usan `tareasPendientes.length`, `tareasEnProgreso.length` y `tareasCompletadas.length` que vienen de `filteredTareas`. Cuando el usuario aplica un filtro de empresa o consultor, los numeros cambian — esto puede confundir al usuario ya que parece que "desaparecen" tareas.

**Fix**: Mostrar los conteos totales (sin filtro) y agregar texto como "de X total" para dar contexto. O alternativamente, dejar claro con el label que son datos filtrados.

#### 3. DragOverlay potential crash
Linea 1271: `tareas.find(t => t.id === activeDragId)!` usa el non-null assertion. Si por alguna razon la tarea no esta en el array (race condition, data refresh), esto causa un crash.

**Fix**: Agregar null check antes de renderizar el TareaCard en el DragOverlay.

#### 4. Canceladas no visibles en stats
Las stat cards solo muestran Pendientes, En Progreso y Completadas. Las tareas canceladas no tienen card, asi que un usuario no sabe cuantas hay sin cambiar el filtro manualmente.

**Fix menor**: No es critico, pero se podria agregar un cuarto stat card o mostrar un badge con el conteo de canceladas.

#### 5. Calendar en Tareas no tiene popup ni badges
El calendario en `/tareas` no tiene `popup={true}`, ni los custom date headers con badges de conteo, ni la clase CSS moderna. Inconsistente con el DashboardCalendar.

**Fix**: Aplicar las mismas mejoras: `popup={true}`, clase `rbc-calendar-enhanced`, y eventStyleGetter moderno.

### Plan de correccion

#### Archivo: `src/pages/Tareas.tsx`
1. **Envolver el calendar en `rbc-calendar-enhanced`** y agregar `popup={true}`
2. **Actualizar eventStyleGetter** del calendar view para usar el estilo moderno (fondo translucido + borde izquierdo)
3. **Fix DragOverlay null safety**: Agregar check `const draggedTarea = tareas.find(...)` y solo renderizar si existe
4. **Agregar conteo de canceladas** como cuarto stat card

No se requieren cambios en la base de datos ni en edge functions. Los datos se cargan correctamente desde Supabase.


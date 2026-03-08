

## Plan: Mejorar creacion y edicion de tareas

### Problemas actuales

1. **CreateTareaDialog** (759 lineas): Demasiado complejo, presenta todos los campos de golpe con tabs confusos (Formulario vs Preview). La recurrencia ocupa mucho espacio visual.
2. **No existe edicion de tareas**: TareaDetailSheet y TareaDetailDialog solo permiten cambiar el estado y agregar comentarios. No se puede editar titulo, descripcion, prioridad, fecha, asignado, ni categoria despues de crear la tarea.
3. **QuickCreateTarea**: Buena idea pero desconectada del flujo principal. El toggle compacto/completo es poco intuitivo.
4. **Experiencia rigida**: Formularios estaticos sin feedback visual, sin transiciones, sin indicadores de progreso.

### Cambios propuestos

#### 1. Unificar creacion en un Sheet lateral moderno (reemplazar CreateTareaDialog)
**Archivo nuevo:** `src/components/tareas/CreateTareaSheet.tsx`

Reemplazar el Dialog pesado por un Sheet lateral (patron ya usado en el proyecto) con:
- **Progressive disclosure**: Campos esenciales arriba (titulo, empresa, prioridad) y secciones colapsables para campos avanzados (recurrencia, archivos, campos custom)
- **Chips de prioridad** visuales (rojo/amarillo/verde) en vez de select dropdown
- **Quick date buttons**: "Hoy", "Manana", "Proxima semana", "Elegir fecha" en vez de solo input date
- **Busqueda de empresa** con input filtrable en vez de select con scroll largo
- **Animaciones** de entrada para secciones que se expanden
- **Progress indicator** sutil que muestra % de campos completados
- Eliminar la tab de Preview (innecesaria, agrega friccion)

#### 2. Agregar edicion inline al TareaDetailSheet
**Archivo:** `src/components/tareas/TareaDetailSheet.tsx`

Convertir todos los campos a editables inline (patron ya usado en `InlineEditField`):
- Click en titulo → input editable con auto-save
- Click en descripcion → textarea editable
- Prioridad → chips clickeables que cambian instantaneamente
- Fecha → date picker inline
- Consultor asignado → select inline
- Categoria → selector inline
- Cada cambio se guarda automaticamente con debounce (sin boton guardar)
- Feedback visual: checkmark verde momentaneo al guardar

#### 3. Modernizar QuickCreateTarea
**Archivo:** `src/components/tareas/QuickCreateTarea.tsx`

- Eliminar toggle compacto/completo. Siempre mostrar el form compacto pero con secciones expandibles
- Agregar chips de prioridad visuales
- Quick date buttons
- Animacion de success al crear (confetti sutil o checkmark animado)

#### 4. Actualizar Tareas page para usar nuevos componentes
**Archivo:** `src/pages/Tareas.tsx`

- Reemplazar `CreateTareaDialog` por el nuevo `CreateTareaSheet`
- Asegurar que el detail sheet tenga edicion inline

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/tareas/CreateTareaSheet.tsx` | Nuevo - Sheet lateral con progressive disclosure, chips de prioridad, quick dates |
| `src/components/tareas/TareaDetailSheet.tsx` | Agregar edicion inline en todos los campos con auto-save |
| `src/components/tareas/QuickCreateTarea.tsx` | Modernizar con chips, quick dates, animaciones |
| `src/pages/Tareas.tsx` | Usar CreateTareaSheet en vez de CreateTareaDialog |


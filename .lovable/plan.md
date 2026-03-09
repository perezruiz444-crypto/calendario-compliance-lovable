

## Plan: Mejorar Templates de Tareas

### Problemas actuales
1. **TemplateSelector** es un dropdown simple que no muestra info util (prioridad, recurrencia, categoria)
2. **ManageTemplates** es un dialog con un form largo similar al viejo CreateTareaSheet -- mismo problema de scroll infinito
3. No hay vista previa de lo que genera el template antes de aplicarlo
4. No hay subtareas en los templates -- un template deberia poder incluir checklist predefinido
5. La recurrencia en templates usa el viejo sistema de dropdowns en vez de los presets naturales que ya tiene CreateTareaSheet

### Cambios propuestos

#### 1. TemplateSelector: de dropdown a galeria visual
Reemplazar el `Select` con una **galeria de cards compactas** tipo chips expandibles:
- Cada template muestra nombre, prioridad (con color), categoria y badges de recurrencia/duracion
- Al hacer hover muestra preview del titulo y descripcion que generara
- Al seleccionar, aplica inmediatamente con feedback visual (checkmark animado)
- Si no hay templates, muestra un CTA discreto "Crear tu primer template"

#### 2. ManageTemplates: usar secciones colapsables (como CreateTareaSheet)
Aplicar el mismo patron de secciones colapsables del formulario de creacion:
- **Seccion 1 - Identidad**: Nombre del template, descripcion
- **Seccion 2 - Contenido**: Titulo por defecto, descripcion por defecto, prioridad, categoria
- **Seccion 3 - Programacion**: Duracion en dias, recurrencia con los mismos presets naturales (chips)
- **Seccion 4 - Subtareas**: Lista editable de subtareas que se crearan automaticamente con el template
- Vista previa en vivo del template mientras lo editas
- Cambiar de Dialog a Sheet (consistencia con el patron UI del proyecto)

#### 3. Subtareas en templates (nuevo campo)
Agregar campo `subtareas_template` (jsonb) a la tabla `tarea_templates` para guardar una lista de subtareas predefinidas. Al usar el template, se crean automaticamente las subtareas.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/tareas/TemplateSelector.tsx` | Rediseno completo: galeria de cards con preview |
| `src/components/tareas/ManageTemplates.tsx` | Rediseno: Sheet con secciones colapsables, presets de recurrencia, editor de subtareas |
| `src/components/tareas/CreateTareaSheet.tsx` | Actualizar `handleTemplateSelect` para incluir subtareas y recurrencia del template |
| Migration | Agregar columna `subtareas_template jsonb` a `tarea_templates` |

### Migracion de base de datos
```sql
ALTER TABLE public.tarea_templates
ADD COLUMN subtareas_template jsonb DEFAULT '[]'::jsonb;
```
El campo almacenara un array de objetos: `[{ titulo: string, descripcion?: string }]`


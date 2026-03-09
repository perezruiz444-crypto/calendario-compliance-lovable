

## Plan: Rediseño de la creación de tareas y recurrencia

### Problemas actuales
1. El formulario `CreateTareaSheet` es un scroll largo con ~15 campos visibles, se siente abrumador
2. La sección de recurrencia aunque funcional, se ve como un bloque técnico con muchos inputs juntos
3. Hay dos componentes separados (`QuickCreateTarea` y `CreateTareaSheet`) con código duplicado
4. Los campos de frecuencia e intervalo son confusos — "Cada 1 mes(es)" no es natural
5. No hay guía visual del flujo: todo está al mismo nivel de importancia

### Solución: Formulario con pasos visuales + recurrencia simplificada

#### 1. Formulario por secciones con stepper visual (no wizard)
En vez de un scroll infinito o un wizard con páginas, usar **secciones colapsables con indicadores visuales** tipo acordeón inteligente:

- **Sección 1 - Esencial** (siempre abierta): Título, Empresa, Prioridad
- **Sección 2 - Programación**: Fecha vencimiento + Recurrencia (colapsada pero visible)
- **Sección 3 - Detalles** (colapsada): Descripción, Consultor, Categoría, Archivos

Cada sección muestra un **resumen inline** cuando está colapsada (ej: "📅 Vence 15 Mar · 🔄 Cada mes").

#### 2. Recurrencia con presets naturales
Reemplazar los dropdowns de frecuencia+intervalo con **chips de presets comunes** + opción personalizada:

- Chips: `Cada día` · `Cada semana` · `Cada 15 días` · `Cada mes` · `Cada trimestre` · `Cada año` · `Personalizado...`
- Solo al seleccionar "Personalizado" se muestran los inputs de frecuencia + intervalo
- Preview de próximas fechas se mantiene pero con mejor diseño (timeline vertical mini)

#### 3. Unificar QuickCreate y CreateTareaSheet
Eliminar `QuickCreateTarea` como componente separado. En su lugar, `CreateTareaSheet` arranca mostrando solo la sección esencial (funciona como quick create). El usuario expande más secciones si necesita más opciones.

#### 4. Mejoras visuales
- Iconos y colores más claros por sección
- Preview de recurrencia como mini-timeline vertical en vez de badges horizontales
- Transiciones suaves al expandir/colapsar secciones
- Footer sticky con el botón "Crear" siempre visible

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/tareas/CreateTareaSheet.tsx` | Rediseño completo: secciones colapsables, presets de recurrencia, resúmenes inline, mini-timeline |
| `src/components/tareas/QuickCreateTarea.tsx` | Eliminar — su funcionalidad se absorbe en CreateTareaSheet |
| Archivos que importan QuickCreateTarea | Actualizar imports para usar CreateTareaSheet |

No se necesitan cambios de base de datos.

### Detalle técnico
- Secciones usan `Collapsible` de Radix con estado controlado
- Presets de recurrencia son un array de objetos `{ label, frecuencia, intervalo }` que setean ambos valores con un click
- Mini-timeline usa divs con `border-l` y dots para las fechas preview
- Se buscan todos los imports de `QuickCreateTarea` para reemplazarlos




## Plan: Mejorar Reportes PDF + Corregir Obligaciones PDF + Mejorar Date Pickers

### 3 problemas identificados

**1. Reporte PDF de gestión muy pobre en contenido**
El PDF actual (`generateReportPDF`) solo muestra conteos agregados (totales por estado/prioridad). No incluye el detalle de las tareas individuales (titulo, empresa, consultor, vencimiento, prioridad, estado). Es un resumen vacío.

**2. Obligaciones PDF: columnas se solapan**
Las posiciones fijas `cols = [15, 55, 120, 165, 200, 230, 260]` no dan suficiente espacio. La columna "Nombre" (55-120 = 65pts) es demasiado ancha y "Presentación" (165-200 = 35pts) choca con "Período" (200-230).

**3. Date pickers sin dropdown de mes/año**
El componente `Calendar` ya tiene `captionLayout="dropdown-buttons"` por defecto, pero en `CreateTareaSheet.tsx` los 3 calendarios no pasan `fromYear`/`toYear` explícitamente. El componente ya tiene defaults de 1900-2100, así que los dropdowns deberían funcionar. El problema real puede ser que los dropdowns se ven feos/poco usables dentro del popover pequeño. Necesito mejorar el styling del caption dropdown en `calendar.tsx` para que se vea moderno y usable.

---

### Cambios propuestos

#### 1. `src/lib/pdfGenerator.ts` - Reporte de gestión completo

Reescribir `generateReportPDF` para aceptar datos detallados y generar un PDF profesional:

- **Nueva interfaz**: Recibir el array de tareas con titulo, empresa, consultor, prioridad, estado, fecha_vencimiento, fecha_creacion, descripcion
- **Sección Resumen**: Mantener los KPIs actuales + agregar horas trabajadas, tareas vencidas
- **Sección Detalle de Tareas**: Tabla con columnas (Titulo, Empresa, Consultor, Prioridad, Estado, Vencimiento, Creada)
- **Sección Por Consultor**: Si hay datos, listar rendimiento individual (completadas/pendientes/tasa)
- **Sección Por Empresa**: Desglose de tareas por empresa
- **Sección Certificaciones**: Mantener la existente mejorada
- **Tabla landscape** para el detalle de tareas (más espacio)

#### 2. `src/pages/Reportes.tsx` - Pasar datos detallados al PDF

Modificar el `fetchReportData` para guardar el array crudo de tareas con joins a empresa/consultor/categoria. Pasar esos datos enriquecidos a `generateReportPDF`.

#### 3. `src/lib/pdfGenerator.ts` - Obligaciones: redistribuir columnas

Ajustar las posiciones de columnas:
```
// Antes: [15, 55, 120, 165, 200, 230, 260]
// Después: [15, 50, 100, 155, 195, 230, 260]
```
- Reducir "Nombre" de 65pts a 50pts (truncar a 25 chars)
- Dar más espacio a "Artículos" y "Presentación"
- Truncar presentación a max chars para evitar overlap

#### 4. `src/components/ui/calendar.tsx` - Mejorar estilo de dropdowns

Agregar classNames para los dropdowns de mes y año:
- `caption_dropdowns`: flex con gap para alinear bien
- `dropdown_month` / `dropdown_year`: estilo de select más compacto y bonito
- `dropdown`: estilo base con bordes redondeados, cursor pointer
- Ajustar el `caption` para dar más espacio cuando hay dropdowns

---

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/lib/pdfGenerator.ts` | Reescribir `generateReportPDF` con detalle de tareas; ajustar columnas de obligaciones |
| `src/pages/Reportes.tsx` | Guardar tareas detalladas y pasarlas al PDF |
| `src/components/ui/calendar.tsx` | Mejorar classNames de dropdowns para mes/año |

No se necesita migración de base de datos.


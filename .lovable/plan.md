

## Plan: Agregar Obligaciones Activas con gestión completa en la vista de Empresa

### Problema
En la vista de detalle de empresa (`EmpresaDetail.tsx`), el tab "Resumen" muestra el `EmpresaObligacionesCard` (fechas de certificaciones) y tareas recientes, pero **no muestra las obligaciones activas** de esa empresa con su estado de cumplimiento. El componente `ObligacionesActivasTab` existe pero se usa globalmente sin filtrar por empresa.

### Solución
Agregar en el tab "Resumen" de EmpresaDetail, debajo de las tareas recientes, una sección de **Obligaciones Activas de la empresa** que muestre:
- Lista de obligaciones con `activa=true` filtradas por `empresa_id`
- Checkbox para marcar/desmarcar cumplimiento del periodo actual
- Badges de estado (vencido, urgente, próximo, vigente)
- Botón para editar cada obligación (abre el form existente)
- Botón para activar/desactivar obligaciones rápidamente
- Resumen con contadores (activas, completadas, pendientes)

### Cambios

#### 1. Nuevo componente `src/components/empresas/EmpresaObligacionesActivasCard.tsx`
Componente dedicado que:
- Recibe `empresaId` y `canEdit` como props
- Fetches obligaciones con `activa=true` y `empresa_id=empresaId`
- Fetches cumplimientos del periodo actual
- Muestra cada obligación con checkbox, nombre, categoría, presentación, vencimiento, estado
- Botón de editar que abre `ObligacionFormDialog`
- Botón de toggle activa/inactiva
- Resumen visual con badges de contadores

#### 2. `src/pages/EmpresaDetail.tsx`
- Importar el nuevo `EmpresaObligacionesActivasCard`
- Agregarlo en el tab "Resumen" después de la card de tareas recientes
- También agregarlo en el tab "Obligaciones" antes del `ObligacionesManager` para dar visibilidad

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/empresas/EmpresaObligacionesActivasCard.tsx` | Nuevo componente |
| `src/pages/EmpresaDetail.tsx` | Integrar el nuevo componente en tabs Resumen y Obligaciones |

No se necesita migración de base de datos.


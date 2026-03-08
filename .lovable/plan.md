

## Plan: Mejoras, simplificaciones y conexiones

Despues de revisar todo el codebase, identifico estas oportunidades organizadas por impacto:

### A. Conexiones rotas / desconectadas

| Problema | Detalle |
|---|---|
| **EmpresaDetail usa CreateTareaDialog viejo** | `EmpresaDetail.tsx` (linea 11) importa `CreateTareaDialog` en vez del nuevo `CreateTareaSheet`. El boton "Nueva Tarea" en el detalle de empresa abre el dialog legacy. |
| **EmpresaDetail usa TareaDetailDialog viejo** | Linea 12 importa `TareaDetailDialog` en vez de `TareaDetailSheet`. Al hacer click en una tarea desde empresa, se abre el dialog viejo sin edicion inline. |
| **Dashboard "Nueva Tarea" solo navega** | El boton "Nueva Tarea" en el dashboard navega a `/tareas` en vez de abrir directamente el `CreateTareaSheet`. No hay accion directa. |
| **Dashboard tareas no abren detalle** | Al hacer click en una tarea proxima en el dashboard, solo navega a `/tareas` generico — no abre el detalle de esa tarea especifica. |
| **Mensajes no se conectan a tareas** | No hay forma de crear una tarea desde un mensaje ni vincular mensajes a tareas. |

### B. Simplificaciones

| Problema | Propuesta |
|---|---|
| **Reportes.tsx tiene 1118 lineas** | Extraer cada tab de reporte en su propio componente (`ReporteGeneral`, `ReporteTiempo`, etc.) |
| **Tareas.tsx tiene 1373 lineas** | Ya es grande pero fue refactorizado recientemente. Se puede extraer la seccion de filtros y stats en componentes separados en una fase posterior. |

### C. Mejoras de UX

| Mejora | Detalle |
|---|---|
| **Breadcrumbs en EmpresaDetail** | Solo hay un boton "Atras". Agregar breadcrumb: Empresas > [Nombre Empresa] |
| **Acciones rapidas contextuales** | En el dashboard, las tareas proximas deberian tener acciones rapidas (marcar completada, cambiar prioridad) sin navegar. |
| **Contador de tareas en cards de empresas** | La lista de empresas no muestra cuantas tareas pendientes tiene cada una. Agregar badge con conteo. |

### Plan de implementacion (priorizado por impacto)

#### 1. Conectar EmpresaDetail con componentes modernos (`EmpresaDetail.tsx`)
- Reemplazar `CreateTareaDialog` por `CreateTareaSheet`
- Reemplazar `TareaDetailDialog` por `TareaDetailSheet`
- Pre-seleccionar la empresa al crear tarea desde su detalle

#### 2. Dashboard: acciones directas (`Dashboard.tsx`)
- Boton "Nueva Tarea" abre `CreateTareaSheet` directamente (con state local)
- Click en tarea proxima abre `TareaDetailSheet` con el ID de la tarea
- Agregar accion rapida "completar" en cada tarea proxima (icono check)

#### 3. Breadcrumbs en EmpresaDetail (`EmpresaDetail.tsx`)
- Agregar breadcrumb navegable usando el componente `breadcrumb.tsx` existente

#### 4. Badge de tareas pendientes en lista de empresas (`Empresas.tsx`)
- Hacer un query adicional para contar tareas pendientes por empresa
- Mostrar badge con conteo al lado de cada empresa

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/EmpresaDetail.tsx` | Migrar a CreateTareaSheet + TareaDetailSheet, agregar breadcrumbs |
| `src/pages/Dashboard.tsx` | Agregar CreateTareaSheet inline, TareaDetailSheet para tareas proximas, accion rapida completar |
| `src/pages/Empresas.tsx` | Agregar conteo de tareas pendientes por empresa |


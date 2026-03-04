

## Plan: Permisos de cliente, PROSEC renovación, y simplificación tareas-obligaciones

### Problema actual
1. **Clientes no pueden marcar cumplimientos**: La RLS de `obligacion_cumplimientos` solo permite a `administrador` y `consultor`. Los clientes no ven ni pueden interactuar con obligaciones.
2. **PROSEC sin fechas de renovación**: La card solo muestra número, modalidad, autorización y sectores. Faltan "última renovación" y "siguiente renovación".
3. **Duplicidad tareas/obligaciones**: Las obligaciones recurrentes auto-generan tareas, lo que confunde. Para empresas (clientes), las obligaciones con sus checkboxes de periodo ya son suficientes como "pendientes".

---

### Cambios planificados

#### 1. Base de datos — Nuevas columnas PROSEC + RLS clientes

**Migración SQL:**
- Agregar `prosec_fecha_ultima_renovacion DATE` y `prosec_fecha_siguiente_renovacion DATE` a la tabla `empresas`
- Actualizar la política RLS de `obligacion_cumplimientos` para incluir rol `cliente` en INSERT/UPDATE/DELETE (limitado a obligaciones de su empresa)

#### 2. PROSEC Card — Fechas de renovación

**Archivo:** `src/components/empresas/EmpresaPROSECCard.tsx`
- Agregar campos de edición y visualización para "Fecha de última renovación" y "Fecha de siguiente renovación"
- Incluir ambas fechas en el `handleSave` 

#### 3. Vista de cliente — Obligaciones con cumplimiento

**Archivo:** `src/pages/MiEmpresa.tsx`
- Agregar un nuevo tab "Obligaciones" que muestre las obligaciones de la empresa del cliente
- Incluir checkboxes de cumplimiento por periodo (reutilizando la lógica de `getCurrentPeriodKey` y `getPeriodLabel`)
- El cliente podrá marcar/desmarcar obligaciones como completadas para el periodo actual

#### 4. Simplificación del modelo para clientes

**Enfoque:** Las obligaciones son los "pendientes" del cliente. Las tareas son herramientas internas del consultor.
- En `MiEmpresa.tsx`: mostrar obligaciones como la lista principal de "Qué debo hacer", con badges de periodo y estado
- Eliminar la auto-generación de tareas desde obligaciones recurrentes en `ObligacionesManager.tsx` (función `createTaskForObligation`) — esto evita la duplicidad
- Si el consultor necesita crear una tarea específica a partir de una obligación, lo hará manualmente

**Archivo:** `src/components/obligaciones/ObligacionesManager.tsx`
- Remover la llamada a `createTaskForObligation` en `handleCreate`
- Remover las funciones auxiliares `presentacionToFrecuencia`, `presentacionToIntervalo`, `isRecurring`, `createTaskForObligation`

---

### Resumen de archivos a modificar
| Archivo | Cambio |
|---|---|
| Migración SQL | 2 columnas PROSEC + RLS cliente en cumplimientos |
| `EmpresaPROSECCard.tsx` | Campos última/siguiente renovación |
| `MiEmpresa.tsx` | Tab "Obligaciones" con checkboxes de cumplimiento |
| `ObligacionesManager.tsx` | Eliminar auto-generación de tareas |


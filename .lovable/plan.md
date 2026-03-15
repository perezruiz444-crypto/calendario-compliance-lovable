

# Plan: Incluir obligaciones activas en reportes y analytics

## Problema
Cuando se agrega una obligacion a una empresa y se marca como activa (`activa = true`), no aparece en los reportes ni en el conteo de pendientes del dashboard. El sistema solo consulta la tabla `tareas`, pero las obligaciones activadas son la fuente de verdad para pendientes operativos.

## Solucion
Agregar una consulta paralela a `obligaciones` (donde `activa = true`) en dos lugares clave, y combinar los resultados con las tareas existentes para que los conteos reflejen la realidad.

### 1. `src/pages/Reportes.tsx` — fetchReportData

- Agregar una tercera query paralela: obligaciones activas con sus cumplimientos del periodo actual
- Calcular cuales estan pendientes (sin cumplimiento para el periodo actual usando `getCurrentPeriodKey`)
- Sumar al resumen:
  - `tareasPendientes` += obligaciones pendientes de cumplimiento
  - `totalTareas` += obligaciones activas
- Agregar seccion de "Obligaciones Pendientes" al detalle del reporte (nombre, empresa, categoria, fecha vencimiento)
- Incluir obligaciones en el PDF y CSV de exportacion

### 2. `src/hooks/useAnalytics.tsx` — fetchAdminAnalytics / fetchConsultorAnalytics / fetchClienteAnalytics

- Agregar query de obligaciones activas y sus cumplimientos
- Sumar obligaciones pendientes a `tareasPendientes` y `totalTareas`
- Incluir obligaciones proximas a vencer en `proximasTareas`

### 3. `src/lib/pdfGenerator.ts`

- Agregar seccion opcional "Obligaciones Pendientes" al PDF con columnas: Nombre, Empresa, Categoria, Vencimiento

### Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| `src/pages/Reportes.tsx` | Query obligaciones + merge con conteos |
| `src/hooks/useAnalytics.tsx` | Query obligaciones + merge con KPIs |
| `src/lib/pdfGenerator.ts` | Seccion de obligaciones en PDF |

### Detalle tecnico
Se reutiliza `getCurrentPeriodKey` de `src/lib/obligaciones.ts` para determinar si una obligacion tiene cumplimiento en el periodo actual. Una obligacion activa sin cumplimiento en el periodo = pendiente.


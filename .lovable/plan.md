

# Plan: Mejorar visualizaciones en Reportes y Dashboard del Cliente

## Problema
Las graficas en Reportes son basicas (bar/pie charts sin estilo pulido) y el ClienteAnalytics solo muestra una barra de progreso y listas de vencimientos. El cliente no tiene una vista clara de que esta pendiente, que ya se hizo y que esta vencido.

## Cambios

### 1. `src/pages/Reportes.tsx` — Mejorar visualizaciones de tareas/obligaciones

**Tab "Estado":**
- Reemplazar el BarChart de "Tareas por Estado" por un layout con tarjetas de resumen por estado (Pendiente, En Progreso, Completada, Cancelada) con iconos, conteo y barra de proporcion visual, mas un donut chart central
- Mejorar el PieChart de prioridad con un donut (innerRadius) y leyenda integrada con conteos
- Agregar una mini-tabla debajo con las obligaciones pendientes de cumplimiento (nombre, empresa, categoria, dias restantes) si hay datos

**Tab "Rendimiento":**
- Agregar barra de progreso con gradiente y color segun porcentaje (rojo < 50%, amarillo < 80%, verde >= 80%)

**General:**
- Usar colores mas consistentes y tooltips con formato custom usando ChartTooltipContent del componente chart.tsx existente

### 2. `src/components/dashboard/ClienteAnalytics.tsx` — Rediseño completo

Reemplazar el componente actual con un layout mas informativo:

- **Seccion 1: Resumen visual** — Tres tarjetas grandes con iconos y colores claros:
  - Pendientes (amarillo/warning) con conteo y lista colapsable de las tareas pendientes
  - Completadas (verde/success) con conteo
  - Vencidas (rojo/destructive) con conteo y alerta visual si hay > 0

- **Seccion 2: Barra de progreso mejorada** — Donut chart (usando PieChart de recharts) mostrando visualmente Completadas vs Pendientes vs Vencidas, con leyenda al lado

- **Seccion 3: Obligaciones activas** — Lista de obligaciones pendientes de cumplimiento con badge de urgencia (dias), nombre y categoria. Si no hay, mostrar empty state con checkmark

- **Seccion 4: Programas/Certificaciones y Documentos** — Mantener las secciones actuales pero con mejor diseño visual (iconos de urgencia, colores mas claros)

### 3. `src/components/dashboard/ConsultorAnalytics.tsx` — Ajustes menores

- Mejorar el PieChart con donut style (innerRadius)
- Agregar etiqueta central con total de tareas

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Reportes.tsx` | Tab "Estado": tarjetas de resumen + donut chart + tabla obligaciones pendientes |
| `src/components/dashboard/ClienteAnalytics.tsx` | Rediseño completo con donut, tarjetas por estado, lista de obligaciones |
| `src/components/dashboard/ConsultorAnalytics.tsx` | Donut style en PieChart |




# Plan: Corregir conteo de tareas pendientes en reportes

## Problema
La consulta de tareas filtra por `created_at` dentro del periodo seleccionado (lineas 170-174). Si una tarea fue creada en un mes anterior pero sigue pendiente, no aparece en el reporte. Por eso el reporte muestra 0 tareas pendientes cuando en realidad hay 1 activa.

## Solucion
Cambiar la logica de filtrado para que las tareas pendientes/en progreso se incluyan **sin importar su fecha de creacion**, mientras que las completadas/canceladas se filtren por el periodo. Esto refleja la realidad operativa: las tareas pendientes son relevantes siempre.

### Cambios en `src/pages/Reportes.tsx`

**Opcion propuesta**: Hacer dos consultas separadas:

1. **Tareas del periodo** (por `created_at`): para graficas de timeline, creadas vs completadas, etc.
2. **Tareas pendientes/en progreso actuales**: sin filtro de fecha, para el conteo correcto de pendientes.

O, mas simple: cambiar el filtro para que incluya tareas que esten pendientes/en progreso (sin importar fecha) **O** que hayan sido creadas en el periodo. Esto se logra asi:

- Remover el filtro `.gte('created_at')` y `.lte('created_at')` de la consulta principal
- Hacer la consulta sin filtro de fecha y luego filtrar en el cliente:
  - Para el resumen: contar todas las pendientes/en progreso + las completadas/canceladas del periodo
  - Para las graficas de timeline: usar solo las del periodo

### Implementacion concreta

1. La consulta principal de tareas se hara **sin filtro de fechas**
2. En el procesamiento del lado del cliente:
   - `totalTareas`: tareas creadas en el periodo + tareas pendientes/en_progreso fuera del periodo
   - `tareasPendientes`: todas las pendientes/en_progreso (sin filtro de fecha)
   - `tareasCompletadas`: solo las completadas dentro del periodo
   - Timeline y otras graficas: siguen usando `created_at` del periodo
3. El `resumen` que se envia por email usara estos numeros corregidos

### Archivos a modificar
- `src/pages/Reportes.tsx` — logica de consulta y procesamiento de datos


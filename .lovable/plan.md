

## Analisis: Estado actual del Dashboard

### Lo que ya esta resuelto
La implementacion anterior **ya corrigio** los dos problemas principales:
1. **`fetchDashboardData` eliminado** -- no existe en el codigo, Dashboard.tsx usa solo `useAnalytics()`
2. **`limit(5)` en tareas** -- la query de tareas (linea 176 de useAnalytics) ya es `select('*')` sin limite, los stats se calculan sobre todas las tareas

Los `limit(5)` que quedan en useAnalytics son correctos: son para mensajes recientes (mostrar 5) y documentos proximos a vencer (mostrar 5 en la lista).

### Bugs encontrados que SI necesitan correccion

| Bug | Archivo | Descripcion |
|---|---|---|
| 1. Obligaciones "Ver todas" navega a `/tareas` | `DashboardObligaciones.tsx` linea 85 | Deberia ir a la seccion de obligaciones de la empresa, no a tareas |
| 2. DashboardObligaciones hace su propio fetch | `DashboardObligaciones.tsx` | Hace una query separada a `obligaciones` + `obligacion_cumplimientos` que podria estar en useAnalytics para evitar queries redundantes |
| 3. DashboardCalendar hace fetch pesado independiente | `DashboardCalendar.tsx` | Carga TODAS las tareas, documentos, empresas y obligaciones por separado -- 4 queries adicionales al cargar el dashboard |
| 4. useEffect sin dependencias correctas | `useAnalytics.tsx` linea 74-78 | `fetchAnalytics` no esta en el array de dependencias (React warning potencial) |
| 5. Admin consultor query N+1 | `useAnalytics.tsx` linea 224-233 | Hace una query individual de tareas POR CADA consultor (hasta 5 queries), cuando ya tiene todas las tareas cargadas y puede filtrarlas en memoria |

### Plan de correccion

#### 1. Fix navegacion obligaciones
**Archivo:** `DashboardObligaciones.tsx` linea 85
- Cambiar `navigate('/tareas')` → la ruta correcta para obligaciones (necesita verificar si hay una ruta dedicada o si las obligaciones se ven en EmpresaDetail)

#### 2. Fix N+1 query de consultores
**Archivo:** `useAnalytics.tsx` lineas 224-233
- Ya tenemos `tareas` (todas) cargadas. En vez de hacer `supabase.from('tareas').select('estado').eq('consultor_asignado_id', consultor.id)` por cada consultor, filtrar `tareas` en memoria:
```
tareasPorConsultor = consultores.slice(0, 5).map(c => ({
  nombre: c.nombre_completo,
  total: tareas.filter(t => t.consultor_asignado_id === c.id).length,
  completadas: tareas.filter(t => t.consultor_asignado_id === c.id && t.estado === 'completada').length
})).filter(t => t.total > 0);
```

#### 3. Fix useEffect dependency
**Archivo:** `useAnalytics.tsx`
- Wrap `fetchAnalytics` en useCallback o mover la logica del efecto correctamente

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/hooks/useAnalytics.tsx` | Fix N+1 query consultores (usar tareas en memoria), fix useEffect deps |
| `src/components/dashboard/DashboardObligaciones.tsx` | Fix ruta "Ver todas" |

Los items 2 y 3 (DashboardObligaciones y DashboardCalendar haciendo fetches independientes) son mejoras de performance que requieren un refactor mas grande -- los dejo fuera de este scope para mantener el cambio pequeño y seguro.


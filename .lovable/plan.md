

## Plan: Auto-asignar consultores a las 30 tareas existentes

### Situación actual

Las **30 tareas** tienen `consultor_asignado_id = NULL`. Las asignaciones consultor-empresa son:

| Empresa | Consultores asignados |
|---|---|
| ITW AUTOMOTIVE | fgarduno@russellbedford.mx |
| JOHNSON ELECTRIC | eechave@russellbedford.mx, fgarduno@russellbedford.mx, Caty Garduño |
| TOKAIKOGYO | **Ninguno** |
| XINQUAN | **Ninguno** |

### Lo que haré

Ejecutar UPDATEs directos en la tabla `tareas` para asignar el `consultor_asignado_id`:

1. **ITW** (8 tareas) → asignar a **fgarduno** (único consultor)
2. **JOHNSON ELECTRIC** (8 tareas) → asignar a **eechave** (consultor principal, primer asignado)
3. **TOKAIKOGYO** (7 tareas) → no hay consultor asignado a esta empresa, no se pueden auto-asignar
4. **XINQUAN** (7 tareas) → no hay consultor asignado a esta empresa, no se pueden auto-asignar

### Problema: TOKAIKOGYO y XINQUAN

Estas 2 empresas no tienen consultores en `consultor_empresa_asignacion`. Las opciones son:
- Asignar primero un consultor a esas empresas desde la UI, y luego auto-asignar las tareas
- Asignarlas a fgarduno o eechave directamente

### Ejecución

Usaré el insert tool de Supabase para ejecutar los UPDATE en las tareas de ITW y JOHNSON ELECTRIC. Para las otras 2 empresas necesito tu decisión.

### Archivos afectados
Ninguno — solo datos en la base de datos.


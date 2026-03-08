

## Plan: Mejorar el Dashboard de Inicio

### Problemas detectados

1. **Dos vistas separadas (Analytics vs Simple)** con toggle confuso -- el usuario tiene que elegir entre ver graficas o ver tareas/calendario, cuando deberia ser una sola vista integrada
2. **Stats inexactos** -- `fetchDashboardData` usa `limit(5)` en tareas, asi que los conteos de pendientes/completadas solo cuentan maximo 5 tareas
3. **Datos duplicados** -- Dashboard.tsx hace su propio fetch de stats Y useAnalytics hace otro fetch separado; doble carga innecesaria
4. **Sin saludo personalizado** -- dice "Bienvenido Administrador" en vez del nombre del usuario
5. **Sin acciones rapidas** -- no hay botones para crear tarea, agregar empresa, ir a mensajes, etc.
6. **Sin resumen de mensajes** -- no se ven mensajes no leidos ni actividad reciente
7. **Proximas tareas limitadas** -- solo muestra 7 dias y con el limit(5) del query

### Cambios propuestos

#### 1. Unificar en una sola vista
**Archivo:** `src/pages/Dashboard.tsx`
- Eliminar el toggle Analytics/Vista Simple
- Mostrar siempre: KPI cards arriba, luego una seccion de contenido principal
- Layout: KPI cards (4) → Fila de graficas (2 cols) → Fila de contenido (obligaciones + tareas proximas + calendario)
- Reusar los componentes de Analytics existentes pero integrados, no como vista alternativa

#### 2. Corregir el fetch de stats
**Archivo:** `src/pages/Dashboard.tsx`
- Eliminar `fetchDashboardData` duplicado -- usar exclusivamente `useAnalytics` como fuente de datos
- Eliminar estados redundantes: `stats`, `loadingData`, `proximasTareas`, `empresaCliente`
- Para "proximas tareas", agregar un campo `proximasTareas` al hook `useAnalytics`

#### 3. Agregar datos faltantes al hook useAnalytics
**Archivo:** `src/hooks/useAnalytics.tsx`
- Agregar `proximasTareas` (proximas 10 tareas por vencer, con nombre de empresa)
- Agregar `mensajesNoLeidos` (count de mensajes sin leer)
- Agregar `nombreUsuario` desde profiles
- Para admin: agregar `empresaCliente` data cuando aplique

#### 4. Agregar barra de acciones rapidas
**Archivo:** `src/pages/Dashboard.tsx`
- Debajo del saludo, botones: "Nueva Tarea", "Nueva Empresa" (admin/consultor), "Ver Calendario"
- Cada boton navega a la pagina correspondiente o abre un dialog

#### 5. Agregar widget de mensajes no leidos
**Archivo nuevo:** `src/components/dashboard/DashboardMensajes.tsx`
- Card compacta mostrando los ultimos 3-5 mensajes no leidos
- Boton "Ver todos" que navega a /mensajes

#### 6. Saludo personalizado
- Obtener `nombre_completo` del perfil
- Mostrar "Buenos dias, [Nombre]" con hora del dia (mañana/tarde/noche)

### Layout final del dashboard

```text
┌─────────────────────────────────────────────┐
│ Buenos dias, Juan        [+ Tarea] [+ Emp]  │
├──────────┬──────────┬──────────┬────────────┤
│ KPI 1    │ KPI 2    │ KPI 3    │ KPI 4      │
├──────────┴──────────┼──────────┴────────────┤
│ Grafica Performance │ Grafica Estado/Pie    │
├─────────────────────┼───────────────────────┤
│ Obligaciones Pend.  │ Proximas Tareas       │
├─────────────────────┼───────────────────────┤
│ Mensajes No Leidos  │ Calendario Mini       │
└─────────────────────┴───────────────────────┘
```

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/Dashboard.tsx` | Refactor completo: eliminar vista dual, usar solo useAnalytics, layout unificado, acciones rapidas, saludo personalizado |
| `src/hooks/useAnalytics.tsx` | Agregar proximasTareas, mensajesNoLeidos, nombreUsuario |
| `src/components/dashboard/DashboardMensajes.tsx` | Nuevo: widget de mensajes no leidos |
| `src/components/dashboard/AdminAnalytics.tsx` | Ajustar para integrarse en layout unificado (quitar KPI cards duplicadas) |
| `src/components/dashboard/ConsultorAnalytics.tsx` | Mismo ajuste |
| `src/components/dashboard/ClienteAnalytics.tsx` | Mismo ajuste |


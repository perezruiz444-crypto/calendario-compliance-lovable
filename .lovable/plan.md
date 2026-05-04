# Plan: Mejoras Dashboard Obligaciones Mensuales (Fases A → B → C)

## Fase A — Estabilidad y UX crítica

### A1. Migración SQL: desnormalizar `empresa_id` en `obligacion_cumplimientos`
- Agregar columna `empresa_id uuid` (nullable inicialmente).
- Backfill: `UPDATE obligacion_cumplimientos oc SET empresa_id = o.empresa_id FROM obligaciones o WHERE oc.obligacion_id = o.id`.
- `ALTER COLUMN empresa_id SET NOT NULL`.
- Índice: `CREATE INDEX idx_oc_empresa_periodo ON obligacion_cumplimientos(empresa_id, periodo_key)`.
- Trigger `BEFORE INSERT`: autocompletar `empresa_id` desde `obligaciones` si viene NULL (para no romper inserts actuales).
- RLS: añadir política simplificada usando `empresa_id` directamente (sin JOIN a `obligaciones`).

### A2. Realtime con filtro por empresa
En `DashboardObligacionesMensuales.tsx` y `EmpresaObligacionesActivasCard.tsx`:
- Suscripción: `filter: 'empresa_id=eq.' + empresaId` (en lugar de listar IDs).
- Cleanup explícito: `return () => supabase.removeChannel(channel)` dentro del `useEffect`.
- Agregar `empresaId` al array de dependencias para recrear el canal al cambiar empresa.

### A3. Filtro temporal preciso del mes
- Helper `getObligacionesDelMes(obls, year, month)` que combine `fecha_vencimiento` + `presentacion` (semanal/mensual/bimestral pueden caer dentro del mes aunque su `fecha_vencimiento` original no).
- Mostrar `periodLabel` (de `getPeriodLabel`) debajo del nombre.

### A4. Orden por urgencia
Sort: `vencido (días asc) → urgente → proximo → vigente → cumplidas al final`.

### A5. Mobile + A11y + tokens
- `flex-wrap` en filas, ocultar fecha completa con `hidden sm:inline` (mostrar solo badge de días).
- `aria-label="Marcar {nombre} como cumplida"` en checkboxes.
- Definir token `--urgent` en `index.css` y reemplazar colores hardcodeados.

---

## Fase B — Refactor y limpieza

### B1. Hook `useObligacionCumplimientos`
`src/hooks/useObligacionCumplimientos.ts`:
- Inputs: `empresaId`, `obligaciones[]`.
- Devuelve: `{ cumplimientos, toggle, loading }`.
- Maneja fetch, optimistic update, realtime, y rollback en error.
- Aplicarlo en `DashboardObligacionesMensuales` y `EmpresaObligacionesActivasCard` (elimina ~80 líneas duplicadas).

### B2. Performance
- `select('id, nombre, categoria, presentacion, fecha_vencimiento, activa, estado, responsable_id')` (no `select *`) en `EmpresaObligacionesActivasCard`.
- Mantener `select *` solo cuando el usuario abra el editor.

### B3. UX consultor: empty state con selector
Si `!empresaId` y rol = admin/consultor → mostrar botón "Elegir empresa" que abre el `EmpresaSelectorDropdown` existente.

### B4. Toggle "Ocultar cumplidas"
Switch en el header del widget; estado local; persistir en `localStorage` (`dashboard.obls.hideCompleted`).

---

## Fase C — Producto y layout

### C1. Click en fila → `ObligacionDetailSheet`
- Importar `ObligacionDetailSheet`.
- Click en la fila (excluyendo el checkbox y botones) abre el sheet en modo lectura/edición.

### C2. Rediseño Dashboard
- Colapsar KPIs en una sola fila compacta (cards 90px alto).
- Reordenar secciones: **Obligaciones del mes → Tareas pendientes → Calendario → Mensajes/feedback**.
- `AgendaHoy` ya fue reemplazado; no se restaura.

### C3. Retirar `DashboardObligaciones` viejo
- Eliminar `src/components/dashboard/DashboardObligaciones.tsx` y sus imports.
- Verificar que no se referencie en otras pantallas.

---

## Detalle técnico

**Archivos a modificar:**
- `src/components/dashboard/DashboardObligacionesMensuales.tsx`
- `src/components/empresas/EmpresaObligacionesActivasCard.tsx`
- `src/pages/Dashboard.tsx`
- `src/lib/obligaciones.ts` (helper `getObligacionesDelMes`, sort por urgencia)
- `src/index.css` (token `--urgent`)

**Archivos a crear:**
- `src/hooks/useObligacionCumplimientos.ts`

**Archivos a eliminar:**
- `src/components/dashboard/DashboardObligaciones.tsx`

**Migración SQL** (Fase A1) — vía migration tool al inicio de la implementación.

**Validación post-implementación:**
- Cambiar empresa en sidebar → lista refresca sin canales colgados.
- Marcar/desmarcar cumplimiento → optimistic update, sin refetch completo.
- Cliente ve sus obligaciones del mes y puede marcar (RLS permite).
- Sin warnings de a11y en checkboxes; layout no se rompe a 360px.

---

¿Apruebas este plan para ejecutarlo en este orden (A → B → C en commits separados)?

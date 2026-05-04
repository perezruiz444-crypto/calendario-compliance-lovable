# Spec: Dashboard Obligaciones — Estabilidad, Refactor y UX
**Fecha:** 2026-05-04  
**Scope:** Fases A, B y C aprobadas por el usuario

---

## Contexto

El widget `DashboardObligacionesMensuales` y `EmpresaObligacionesActivasCard` comparten lógica de cumplimiento con divergencias peligrosas: distinto modelo de actualización (optimistic vs. esperando respuesta), sin realtime en la card, y sin rollback consistente. Además hay bugs de realtime, un color hardcodeado, `select *` innecesario, y el viejo `DashboardObligaciones` que convive con el nuevo widget sin propósito claro.

---

## Fase A — Estabilidad y UX Crítica

### A1 · Migración SQL: desnormalizar `empresa_id` en `obligacion_cumplimientos`

**Qué:** Añadir columna `empresa_id uuid NOT NULL REFERENCES empresas(id)` en la tabla `obligacion_cumplimientos` y poblarla via join con `obligaciones`.

**Por qué:** La suscripción de Realtime actual filtra por `obligacion_id=in.(id1,id2,...)`. Con >100 obligaciones la URL del filtro se vuelve demasiado larga y Supabase la rechaza. Filtrando por `empresa_id=eq.${id}` se elimina ese límite y el canal es más simple. Además mejora RLS: la policy puede validar `empresa_id` directamente sin join.

**Migración:**
```sql
-- 1. Agregar columna nullable primero
ALTER TABLE obligacion_cumplimientos
  ADD COLUMN empresa_id uuid REFERENCES empresas(id);

-- 2. Backfill desde obligaciones
UPDATE obligacion_cumplimientos oc
SET empresa_id = o.empresa_id
FROM obligaciones o
WHERE oc.obligacion_id = o.id;

-- 3. Hacer NOT NULL y agregar índice
ALTER TABLE obligacion_cumplimientos
  ALTER COLUMN empresa_id SET NOT NULL;

CREATE INDEX idx_cumplimientos_empresa_id
  ON obligacion_cumplimientos(empresa_id);
```

**RLS a revisar:** La policy de INSERT para cliente debe validar que `empresa_id` coincida con el `empresa_id` del perfil del usuario. Si no existe esa policy, crearla.

**Cambio en el canal Realtime** (`DashboardObligacionesMensuales`):
```ts
// Antes (frágil con >100 obligaciones):
const filter = `obligacion_id=in.(${oblIds.join(',')})`;

// Después (robusto):
const filter = `empresa_id=eq.${empresaId}`;
```

---

### A2 · Fix cleanup de Realtime al cambiar empresa

**Problema:** El efecto de Realtime en `DashboardObligacionesMensuales` (línea 200-215) depende de `obligaciones` pero no de `empresaId`. Si el usuario cambia de empresa rápido, el canal previo sigue activo unos segundos y puede entregar eventos de la empresa anterior.

**Fix:** Añadir `empresaId` a las dependencias del efecto y garantizar que el cleanup sea explícito:

```ts
useEffect(() => {
  if (!empresaId || obligaciones.length === 0) return;

  const channel = supabase
    .channel(`obligaciones-mes-${empresaId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'obligacion_cumplimientos',
        filter: `empresa_id=eq.${empresaId}` },
      () => fetchCumplimientos(obligaciones),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [empresaId, obligaciones]);
```

---

### A3 · Mostrar `periodLabel` bajo cada obligación

**Problema:** Al marcar cumplimiento en mayo para una bimestral, el usuario no sabe qué periodo está confirmando (¿mayo–junio? ¿abril–mayo?). `getCurrentPeriodKey` devuelve el bimestre completo pero nunca se muestra.

**Fix:** En el bloque de la lista (`DashboardObligacionesMensuales`), calcular y mostrar `getPeriodLabel`:

```tsx
const periodLabel = getPeriodLabel(obl.presentacion, getCurrentPeriodKey(obl.presentacion));
// Mostrar debajo del badge de categoría:
{obl.presentacion && (
  <span className="text-xs text-muted-foreground">{periodLabel}</span>
)}
```

`getPeriodLabel` ya existe en `src/lib/obligaciones` — no hay que crearlo.

---

### A4 · Ordenar la lista por urgencia

**Orden:** vencidas → urgentes → próximas → cumplidas (al final).

**Implementación:** Derivar la lista ordenada con un `useMemo` antes del render:

```ts
const URGENCY_ORDER = { vencido: 0, urgente: 1, proximo: 2, vigente: 3 };

const obligacionesOrdenadas = useMemo(() => {
  return [...obligaciones].sort((a, b) => {
    const aCumplida = !!cumplimientos[a.id];
    const bCumplida = !!cumplimientos[b.id];
    if (aCumplida !== bCumplida) return aCumplida ? 1 : -1;
    const aOrder = URGENCY_ORDER[getVencimientoInfo(a.fecha_vencimiento)?.status ?? 'vigente'] ?? 3;
    const bOrder = URGENCY_ORDER[getVencimientoInfo(b.fecha_vencimiento)?.status ?? 'vigente'] ?? 3;
    return aOrder - bOrder;
  });
}, [obligaciones, cumplimientos]);
```

Iterar sobre `obligacionesOrdenadas` en lugar de `obligaciones`.

---

### A5 · Mobile & Accesibilidad

**aria-labels:** Cada `Checkbox` debe incluir `aria-label`:
```tsx
<Checkbox
  aria-label={`Marcar ${obl.nombre} como cumplida`}
  ...
/>
```
Aplica a ambos componentes: `DashboardObligacionesMensuales` y `EmpresaObligacionesActivasCard`.

**Token CSS urgente:** En `src/index.css`, bajo `:root`:
```css
--urgent: 25 95% 53%;
```
En el componente, reemplazar `hsl(25, 95%, 53%)` por `hsl(var(--urgent))`.

**Mobile:** En la fila de meta-datos de cada obligación (badge + fecha + semáforo), la fecha puede ocultarse en pantallas pequeñas:
```tsx
{obl.fecha_vencimiento && (
  <span className="hidden sm:inline text-xs text-muted-foreground">
    {formatDateShort(obl.fecha_vencimiento)}
  </span>
)}
```
El container ya tiene `flex-wrap` — verificar que esté presente en `DashboardObligacionesMensuales` (línea 351 tiene `flex-wrap`, OK). Confirmar en `EmpresaObligacionesActivasCard` línea 222 también lo tiene.

---

## Fase B — Refactorización y Limpieza

### B1 · Hook `useObligacionCumplimientos`

**Archivo:** `src/hooks/useObligacionCumplimientos.ts`

**Firma:**
```ts
function useObligacionCumplimientos(
  obligaciones: Obligacion[],
  empresaId: string | null,
  opts?: { realtime?: boolean }
): {
  cumplimientos: Record<string, boolean>;
  toggling: string | null;
  toggleCumplimiento: (obl: Obligacion) => Promise<void>;
  refetch: () => Promise<void>;
}
```

**Responsabilidades:**
- Fetch inicial de cumplimientos para el periodo actual de cada obligación.
- Toggle con optimistic update + rollback explícito en catch.
- Suscripción Realtime opcional (activada por `opts.realtime`, filtrando por `empresa_id`).
- Cleanup del canal al desmontar o cuando cambie `empresaId`.

**Adopción:**
- `DashboardObligacionesMensuales`: sustituir los states `cumplimientos` / `toggling` y las funciones `fetchCumplimientos` / `toggleCumplimiento` / el efecto de Realtime por el hook con `realtime: true`.
- `EmpresaObligacionesActivasCard`: sustituir los states equivalentes por el hook con `realtime: false` (el Realtime aquí no es necesario porque la card vive en la página de detalle que ya tiene su propio mecanismo de refresh).

**Rollback consistente:** El hook implementa optimistic update + revert en ambos componentes, eliminando la divergencia actual (la card esperaba respuesta antes de actualizar la UI).

---

### B2 · Reducir `select *` en `EmpresaObligacionesActivasCard`

**Columnas necesarias** (las que usa la UI):
```ts
.select('id, nombre, categoria, presentacion, articulos, fecha_vencimiento, activa, estado, descripcion, notas, numero_oficio, fecha_autorizacion, fecha_inicio, fecha_fin, fecha_renovacion, responsable_id, responsable_tipo')
```
Todas las columnas del interface `Obligacion` (17 campos) son utilizadas por el formulario de edición inline, por lo que la reducción de payload es marginal. El valor principal es hacer explícito el contrato del query y no traer columnas nuevas que se añadan a la tabla en el futuro. Si en el futuro se separa la vista de lista del formulario de edición, se podrá reducir a ~8 columnas.

---

### B3 · Botón "Elegir empresa" en empty state del Dashboard

**Problema:** Consultor sin empresa seleccionada ve texto "Selecciona una empresa en la barra lateral" pero si el sidebar está colapsado no hay forma directa.

**Fix:** En el empty state de `DashboardObligacionesMensuales` (línea 243-262), para role `consultor` o `administrador`, mostrar el `EmpresaSelectorDropdown` inline:

```tsx
{role !== 'cliente' && (
  <div className="w-full max-w-xs">
    <EmpresaSelectorDropdown />
  </div>
)}
```

`EmpresaSelectorDropdown` ya está en `src/components/empresas/EmpresaSelectorDropdown.tsx` y maneja su propio estado via `useEmpresaContext`.

---

### B4 · Toggle "Ocultar cumplidas"

**Ubicación:** Header del card en `DashboardObligacionesMensuales`, junto a los badges de completadas/pendientes.

**Estado local:**
```ts
const [ocultarCumplidas, setOcultarCumplidas] = useState(false);
```

**Filtro aplicado sobre `obligacionesOrdenadas`:**
```ts
const obligacionesFiltradas = ocultarCumplidas
  ? obligacionesOrdenadas.filter(o => !cumplimientos[o.id])
  : obligacionesOrdenadas;
```

**UI:** Botón pequeño con ícono `EyeOff` / `Eye` en el header, `variant="ghost"`, `size="sm"`.

---

## Fase C — Decisiones de Producto y Layout

### C1 · Click en fila abre `ObligacionDetailSheet`

**Requisito previo:** `ObligacionDetailSheet` espera `obligacionId: string` como prop. Verificar que el Sheet no requiera contexto adicional que no esté disponible en el Dashboard.

**Implementación en `DashboardObligacionesMensuales`:**
- Añadir estado `detailObligacionId: string | null`.
- La fila completa es clickeable (`cursor-pointer`, `onClick`), excepto el área del `Checkbox` (detener propagación).
- Renderizar `<ObligacionDetailSheet>` al final del componente, controlado por `detailObligacionId`.

**Consideración:** El Sheet es de solo lectura desde el Dashboard para el cliente. Para admin/consultor puede incluir edición si el Sheet ya la soporta.

---

### C2 · Retirar `DashboardObligaciones` (componente viejo)

**Situación actual:** El componente viejo se carga para `administrador` y `consultor` en `Dashboard.tsx` línea 204, junto al nuevo widget `DashboardObligacionesMensuales`. Hay redundancia visual.

**Acción:** Eliminar la importación y el bloque condicional de `DashboardObligaciones` en `Dashboard.tsx`. Verificar que `RenovacionesWidget` y `EmpresaComplianceSemaforo` no dependan de él.

**Riesgo:** Bajo. El nuevo widget cubre el mismo propósito con mejor UX.

---

### C3 · Rediseño del layout del Dashboard

**Objetivo:** Flujo narrativo coherente para todos los roles:
1. Greeting + acciones rápidas
2. Obligaciones del mes (widget principal)
3. KPI cards (colapsables o en fila compacta)
4. Próximas Tareas + Mensajes
5. Calendario

**Cambio concreto:** Los KPI cards actualmente aparecen entre Obligaciones y Charts/Tareas, rompiendo la narrativa. Moverlos debajo del calendario o comprimirlos en una sola fila de métricas pequeñas (`text-sm`, sin card completo).

**Nota:** Este es el cambio de mayor impacto visual. Requiere validar con el usuario cómo quiere ver los KPI antes de implementar.

---

## Archivos afectados por fase

| Fase | Archivos |
|------|----------|
| A1   | Migración SQL en Supabase (nueva migración), `DashboardObligacionesMensuales.tsx` |
| A2   | `DashboardObligacionesMensuales.tsx` |
| A3   | `DashboardObligacionesMensuales.tsx` |
| A4   | `DashboardObligacionesMensuales.tsx` |
| A5   | `DashboardObligacionesMensuales.tsx`, `EmpresaObligacionesActivasCard.tsx`, `src/index.css` |
| B1   | `src/hooks/useObligacionCumplimientos.ts` (nuevo), `DashboardObligacionesMensuales.tsx`, `EmpresaObligacionesActivasCard.tsx` |
| B2   | `EmpresaObligacionesActivasCard.tsx` |
| B3   | `DashboardObligacionesMensuales.tsx` |
| B4   | `DashboardObligacionesMensuales.tsx` |
| C1   | `DashboardObligacionesMensuales.tsx` |
| C2   | `Dashboard.tsx` |
| C3   | `Dashboard.tsx` |

---

## Orden de implementación recomendado

1. **A1 primero** — la migración SQL es prerequisito del nuevo filtro de Realtime (A2). Sin la columna `empresa_id` en `obligacion_cumplimientos`, el filtro `empresa_id=eq.${id}` no funciona.
2. **A2–A5** — fixes y UX, orden flexible entre ellos.
3. **B1** — crear el hook antes de refactorizar los componentes que lo usan.
4. **B2–B4** — orden flexible.
5. **C1–C3** — después de que A y B estén estables.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Migración SQL rompe RLS existente | Revisar policies de `obligacion_cumplimientos` antes de hacer NOT NULL; backfill primero |
| `useObligacionCumplimientos` introduce regresión en `EmpresaObligacionesActivasCard` | Probar la card después de adoptar el hook; el comportamiento de toggle debe ser idéntico al actual |
| Retirar `DashboardObligaciones` elimina algo que aún se usa | Confirmar con git grep que no hay otras importaciones del componente |
| C3 (rediseño de layout) afecta todos los roles | Implementar en un PR separado, validar en staging |

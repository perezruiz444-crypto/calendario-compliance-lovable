# Spec: Widget DashboardObligacionesMensuales

**Fecha:** 2026-05-01  
**Estado:** Aprobado

---

## Objetivo

Sustituir el bloque **AgendaHoy** del Dashboard por un nuevo widget **"Obligaciones del Mes"**: lista deslizable de las obligaciones activas del mes en curso para la empresa seleccionada, con posibilidad de marcar cumplimiento inline.

---

## Visibilidad por rol

| Rol | Empresa resuelta |
|---|---|
| `cliente` | `profiles.empresa_id` donde `profiles.id = user.id` |
| `administrador` / `consultor` | `selectedEmpresaId` de `useEmpresaContext()` |

- Si el cliente no tiene `empresa_id` en su perfil → estado vacío "Sin empresa asignada".
- Si admin/consultor no ha seleccionado empresa (null o 'all') → estado vacío "Selecciona una empresa en la barra lateral".

---

## Diseño visual

```
┌──────────────────────────────────────────────┐
│ 📋 Obligaciones de Mayo 2026                 │
│ ACME S.A. · 8 activas                        │
│                    [✓ 3 cumplidas] [⏳ 5 pend]│
├──────────────────────────────────────────────┤
│ ☐ DIOT Mensual          [IVA]  17 may  ⏱ 5d │
│ ☑ Pago provisional ISR  [ISR]  17 may       │  ← scroll
│ ☐ Reporte INEGI         [EST]  25 may  ⏱13d │
│ ☐ Declaración mensual…  [SAT]  31 may       │
│ ...                                          │
└──────────────────────────────────────────────┘
```

- Card con altura máxima fija (~420px); el header es estático, la lista tiene `overflow-y-auto` con `max-h` interna.
- Cada fila: Checkbox · nombre truncado · Badge categoría · fecha corta · semáforo días restantes.
- Header: título con mes/año, subtítulo (empresa + total activas), badges cumplidas/pendientes.
- Fila cumplida: fondo `bg-success/5`, texto con `line-through text-muted-foreground`, borde `border-success/20`.
- Borde izquierdo coloreado por urgencia (destructive / orange / warning / border).

---

## Componente nuevo: `src/components/dashboard/DashboardObligacionesMensuales.tsx`

### Estados posibles

1. **Loading** — skeleton de 4 filas.
2. **Sin empresa resuelta** — icono + mensaje contextual por rol.
3. **Sin obligaciones en el mes** — icono + mensaje + CTA:
   - Admin/Consultor → `/empresas/{empresaId}`
   - Cliente → `/mi-empresa`
4. **Lista normal** — filas con checkbox de cumplimiento.

### Resolución de empresa

```typescript
// Para cliente:
const { data: profile } = await supabase
  .from('profiles')
  .select('empresa_id')
  .eq('id', user.id)
  .maybeSingle();
const empresaId = profile?.empresa_id ?? null;

// Para admin/consultor:
const { selectedEmpresaId } = useEmpresaContext();
const empresaId = selectedEmpresaId && selectedEmpresaId !== 'all'
  ? selectedEmpresaId
  : null;
```

### Query principal

```typescript
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const firstDay = `${year}-${month}-01T12:00:00`;
const lastDay = `${year}-${month}-${lastDayOfMonth}T12:00:00`;

supabase
  .from('obligaciones')
  .select('id, nombre, categoria, presentacion, fecha_vencimiento')
  .eq('empresa_id', empresaId)
  .eq('activa', true)
  .gte('fecha_vencimiento', firstDay)
  .lte('fecha_vencimiento', lastDay)
  .order('fecha_vencimiento', { ascending: true, nullsFirst: false });
```

### Query cumplimientos

```typescript
// Fetch all cumplimientos for the obligation IDs
const { data: cumpData } = await supabase
  .from('obligacion_cumplimientos')
  .select('obligacion_id, periodo_key, completada')
  .in('obligacion_id', oblIds);

// Map: obligacion_id → boolean, matching current period key per obligation
const map: Record<string, boolean> = {};
cumpData?.forEach(c => {
  const obl = obligaciones.find(o => o.id === c.obligacion_id);
  if (obl && c.periodo_key === getCurrentPeriodKey(obl.presentacion)) {
    map[c.obligacion_id] = c.completada;
  }
});
```

### Toggle cumplimiento inline

```typescript
// Marcar:
await supabase.from('obligacion_cumplimientos').insert({
  obligacion_id: obl.id,
  periodo_key: getCurrentPeriodKey(obl.presentacion),
  completada: true,
  completada_por: user.id,
});

// Desmarcar:
await supabase.from('obligacion_cumplimientos')
  .delete()
  .eq('obligacion_id', obl.id)
  .eq('periodo_key', getCurrentPeriodKey(obl.presentacion));
```

Optimistic update: actualizar el mapa local inmediatamente, revertir si la query falla.

### Realtime

Suscribirse a `postgres_changes` en `obligacion_cumplimientos` filtrando por `empresa_id` no es directo (la tabla no tiene `empresa_id`). En su lugar: re-fetch solo los cumplimientos al recibir cualquier cambio, lo cual es idéntico al patrón de otros componentes del proyecto.

```typescript
const channel = supabase
  .channel(`obligaciones-mes-${empresaId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'obligacion_cumplimientos',
  }, () => fetchCumplimientos())
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

---

## Modificación: `src/pages/Dashboard.tsx`

- **Quitar**: `{(role === 'administrador' || role === 'consultor') && <AgendaHoy />}` (línea 173)
- **Agregar**: `<DashboardObligacionesMensuales />` en el mismo lugar, **sin condicional de rol** (el widget maneja internamente los 3 roles).
- **Mantener**: import de `AgendaHoy` puede eliminarse si no se usa en ningún otro lugar; el archivo `AgendaHoy.tsx` no se borra.

---

## Helpers reutilizados de `@/lib/obligaciones`

- `getCurrentPeriodKey(presentacion)` — periodo_key del mes actual según frecuencia
- `getVencimientoInfo(fecha_vencimiento)` — devuelve `{ status, days }` para el semáforo
- `formatDateShort(fecha)` — `dd/MM/yyyy` con sufijo T12:00:00 ya incorporado
- `CATEGORIA_LABELS` — etiqueta legible por categoría
- `CATEGORIA_COLORS` — clases CSS por categoría

---

## Archivos afectados

| Acción | Archivo |
|---|---|
| ➕ Crear | `src/components/dashboard/DashboardObligacionesMensuales.tsx` |
| ✏️ Modificar | `src/pages/Dashboard.tsx` |
| 🔒 Conservar | `src/components/dashboard/AgendaHoy.tsx` (sin cambios) |

---

## No se requiere

- Migraciones de base de datos (tablas y RLS ya soportan los 3 roles)
- Nuevos hooks o contextos
- Cambios en el sistema de routing

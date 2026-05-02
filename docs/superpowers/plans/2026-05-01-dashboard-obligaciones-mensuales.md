# Dashboard Obligaciones Mensuales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el widget AgendaHoy del Dashboard por DashboardObligacionesMensuales — lista deslizable de obligaciones activas del mes en curso con toggle de cumplimiento inline, visible para los 3 roles.

**Architecture:** Un componente nuevo `DashboardObligacionesMensuales` resuelve el `empresaId` según rol (cliente → `profiles.empresa_id`; admin/consultor → `useEmpresaContext`), consulta las obligaciones activas cuyo `fecha_vencimiento` cae en el mes actual, carga cumplimientos del periodo actual de cada una, y permite marcar/desmarcar con optimistic update. Se suscribe a cambios en `obligacion_cumplimientos` filtrando por los IDs de las obligaciones cargadas. En `Dashboard.tsx` se sustituye `<AgendaHoy />` por `<DashboardObligacionesMensuales />` sin condicional de rol.

**Tech Stack:** React, TypeScript, Supabase JS v2, date-fns, shadcn/ui (Card, Badge, Checkbox, Skeleton, Button), sonner (toast), helpers de `@/lib/obligaciones`.

---

## File Map

| Acción | Archivo | Responsabilidad |
|---|---|---|
| ➕ Crear | `src/components/dashboard/DashboardObligacionesMensuales.tsx` | Widget completo: resolución de empresa, queries, toggle, realtime, UI |
| ✏️ Modificar | `src/pages/Dashboard.tsx` | Sustituir `<AgendaHoy />` por el widget nuevo |

`AgendaHoy.tsx` no se toca.

---

## Task 1: Crear el componente DashboardObligacionesMensuales — esqueleto y tipos

**Files:**
- Create: `src/components/dashboard/DashboardObligacionesMensuales.tsx`

- [ ] **Step 1: Crear el archivo con tipos, imports y estados**

```tsx
import { useEffect, useState } from 'react';
import { format, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import {
  CATEGORIA_LABELS, CATEGORIA_COLORS,
  getCurrentPeriodKey, formatDateShort, getVencimientoInfo,
} from '@/lib/obligaciones';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ClipboardList, CheckCircle2, Clock, AlertTriangle,
  ShieldAlert, Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Obligacion {
  id: string;
  nombre: string;
  categoria: string;
  presentacion: string | null;
  fecha_vencimiento: string | null;
}

export default function DashboardObligacionesMensuales() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { selectedEmpresaId } = useEmpresaContext();

  const [empresaId, setEmpresaId]         = useState<string | null>(null);
  const [empresaNombre, setEmpresaNombre] = useState<string>('');
  const [obligaciones, setObligaciones]   = useState<Obligacion[]>([]);
  const [cumplimientos, setCumplimientos] = useState<Record<string, boolean>>({});
  const [loading, setLoading]             = useState(true);
  const [toggling, setToggling]           = useState<string | null>(null);

  // --- resolve empresaId ---
  useEffect(() => {
    if (!user) return;
    if (role === 'cliente') {
      resolveClienteEmpresa();
    } else {
      // admin / consultor
      const id = selectedEmpresaId && selectedEmpresaId !== 'all'
        ? selectedEmpresaId : null;
      setEmpresaId(id);
    }
  }, [user, role, selectedEmpresaId]);

  const resolveClienteEmpresa = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user!.id)
      .maybeSingle();
    setEmpresaId(data?.empresa_id ?? null);
  };

  // placeholder render — se completa en tasks siguientes
  return <div />;
}
```

- [ ] **Step 2: Verificar que TypeScript no reporta errores**

```bash
cd /Users/canseco/Desktop/lovable/calendario-compliance-lovable
npx tsc --noEmit 2>&1 | grep DashboardObligacionesMensuales
```

Resultado esperado: sin output (sin errores en el archivo nuevo).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardObligacionesMensuales.tsx
git commit -m "feat(dashboard): scaffold DashboardObligacionesMensuales — tipos e imports"
```

---

## Task 2: Queries — cargar obligaciones del mes y cumplimientos

**Files:**
- Modify: `src/components/dashboard/DashboardObligacionesMensuales.tsx`

- [ ] **Step 1: Añadir función `fetchObligaciones` y `fetchCumplimientos`**

Reemplazar el bloque que empieza con `// --- resolve empresaId ---` hasta el final del componente (antes del `return`) con:

```tsx
  // --- resolve empresaId + nombre empresa ---
  useEffect(() => {
    if (!user) return;
    if (role === 'cliente') {
      resolveClienteEmpresa();
    } else {
      const id = selectedEmpresaId && selectedEmpresaId !== 'all'
        ? selectedEmpresaId : null;
      setEmpresaId(id);
      if (!id) { setEmpresaNombre(''); setObligaciones([]); setCumplimientos({}); setLoading(false); }
    }
  }, [user, role, selectedEmpresaId]);

  const resolveClienteEmpresa = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user!.id)
      .maybeSingle();
    setEmpresaId(data?.empresa_id ?? null);
    if (!data?.empresa_id) setLoading(false);
  };

  // --- fetch cuando empresaId cambia ---
  useEffect(() => {
    if (!empresaId) return;
    fetchObligaciones();
  }, [empresaId]);

  const fetchObligaciones = async () => {
    if (!empresaId) return;
    setLoading(true);

    const now = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const days  = getDaysInMonth(now);
    const firstDay = `${year}-${month}-01T12:00:00`;
    const lastDay  = `${year}-${month}-${String(days).padStart(2, '0')}T12:00:00`;

    const [{ data: oblData }, { data: empData }] = await Promise.all([
      supabase
        .from('obligaciones')
        .select('id, nombre, categoria, presentacion, fecha_vencimiento')
        .eq('empresa_id', empresaId)
        .eq('activa', true)
        .gte('fecha_vencimiento', firstDay)
        .lte('fecha_vencimiento', lastDay)
        .order('fecha_vencimiento', { ascending: true, nullsFirst: false }),
      supabase
        .from('empresas')
        .select('razon_social')
        .eq('id', empresaId)
        .maybeSingle(),
    ]);

    const obls = (oblData || []) as Obligacion[];
    setObligaciones(obls);
    setEmpresaNombre(empData?.razon_social || '');
    await fetchCumplimientos(obls);
    setLoading(false);
  };

  const fetchCumplimientos = async (obls: Obligacion[]) => {
    if (obls.length === 0) { setCumplimientos({}); return; }
    const oblIds = obls.map(o => o.id);
    const { data: cumpData } = await supabase
      .from('obligacion_cumplimientos')
      .select('obligacion_id, periodo_key, completada')
      .in('obligacion_id', oblIds);

    const map: Record<string, boolean> = {};
    (cumpData || []).forEach((c: any) => {
      const obl = obls.find(o => o.id === c.obligacion_id);
      if (obl && c.periodo_key === getCurrentPeriodKey(obl.presentacion)) {
        map[c.obligacion_id] = c.completada;
      }
    });
    setCumplimientos(map);
  };
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep DashboardObligacionesMensuales
```

Resultado esperado: sin output.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardObligacionesMensuales.tsx
git commit -m "feat(dashboard): queries obligaciones del mes + cumplimientos"
```

---

## Task 3: Toggle de cumplimiento con optimistic update

**Files:**
- Modify: `src/components/dashboard/DashboardObligacionesMensuales.tsx`

- [ ] **Step 1: Añadir `toggleCumplimiento` justo después de `fetchCumplimientos`**

```tsx
  const toggleCumplimiento = async (obl: Obligacion) => {
    if (!user) return;
    const periodKey   = getCurrentPeriodKey(obl.presentacion);
    const wasComplete = !!cumplimientos[obl.id];

    // Optimistic update
    setCumplimientos(prev => ({ ...prev, [obl.id]: !wasComplete }));
    setToggling(obl.id);

    try {
      if (wasComplete) {
        const { error } = await supabase
          .from('obligacion_cumplimientos')
          .delete()
          .eq('obligacion_id', obl.id)
          .eq('periodo_key', periodKey);
        if (error) throw error;
        toast.success('Cumplimiento desmarcado');
      } else {
        const { error } = await supabase
          .from('obligacion_cumplimientos')
          .insert({
            obligacion_id: obl.id,
            periodo_key:   periodKey,
            completada:    true,
            completada_por: user.id,
          });
        if (error) throw error;
        toast.success('Cumplimiento marcado');
      }
    } catch {
      // Revert on failure
      setCumplimientos(prev => ({ ...prev, [obl.id]: wasComplete }));
      toast.error('Error al actualizar cumplimiento');
    } finally {
      setToggling(null);
    }
  };
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep DashboardObligacionesMensuales
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardObligacionesMensuales.tsx
git commit -m "feat(dashboard): toggle cumplimiento inline con optimistic update"
```

---

## Task 4: Realtime — suscripción filtrada por obligacion_id

**Files:**
- Modify: `src/components/dashboard/DashboardObligacionesMensuales.tsx`

- [ ] **Step 1: Añadir useEffect de realtime después de `toggleCumplimiento`**

```tsx
  // Realtime: re-fetch cumplimientos al detectar cambios en las obligaciones del mes
  useEffect(() => {
    if (obligaciones.length === 0) return;
    const oblIds = obligaciones.map(o => o.id);
    const filter = `obligacion_id=in.(${oblIds.join(',')})`;

    const channel = supabase
      .channel(`obligaciones-mes-${empresaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'obligacion_cumplimientos', filter },
        () => fetchCumplimientos(obligaciones),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [obligaciones]);
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep DashboardObligacionesMensuales
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardObligacionesMensuales.tsx
git commit -m "feat(dashboard): realtime suscripción filtrada por obligacion_id"
```

---

## Task 5: Helper visual — semáforo de días restantes

**Files:**
- Modify: `src/components/dashboard/DashboardObligacionesMensuales.tsx`

- [ ] **Step 1: Añadir función `SemaforoBadge` antes del componente principal**

```tsx
function SemaforoBadge({ fecha, cumplida }: { fecha: string | null; cumplida: boolean }) {
  if (cumplida) return null;
  const info = getVencimientoInfo(fecha);
  if (!info) return null;

  if (info.status === 'vencido') {
    return (
      <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30 gap-1 shrink-0">
        <ShieldAlert className="w-3 h-3" /> Vencida
      </Badge>
    );
  }
  if (info.status === 'urgente') {
    return (
      <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30 gap-1 shrink-0">
        <AlertTriangle className="w-3 h-3" /> {info.days}d
      </Badge>
    );
  }
  if (info.status === 'proximo') {
    return (
      <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30 gap-1 shrink-0">
        <Clock className="w-3 h-3" /> {info.days}d
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30 gap-1 shrink-0">
      <CheckCircle2 className="w-3 h-3" /> {info.days}d
    </Badge>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep DashboardObligacionesMensuales
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardObligacionesMensuales.tsx
git commit -m "feat(dashboard): SemaforoBadge — semáforo de días restantes"
```

---

## Task 6: Render — estados vacíos, loading skeleton y lista de obligaciones

**Files:**
- Modify: `src/components/dashboard/DashboardObligacionesMensuales.tsx`

- [ ] **Step 1: Reemplazar `return <div />` con el render completo**

```tsx
  // ── Derivados ──────────────────────────────────────────────────────
  const now       = new Date();
  const mesLabel  = format(now, 'MMMM yyyy', { locale: es });
  // Capitalizar primera letra
  const mesTitulo = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  const completadas = Object.values(cumplimientos).filter(Boolean).length;
  const pendientes  = obligaciones.length - completadas;

  // ── Loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="gradient-card shadow-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-36 mt-1" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // ── Sin empresa resuelta ───────────────────────────────────────────
  if (!empresaId) {
    const msg = role === 'cliente'
      ? 'Sin empresa asignada. Contacta al administrador.'
      : 'Selecciona una empresa en la barra lateral para ver sus obligaciones.';
    return (
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> Obligaciones del Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <Building2 className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-xs">{msg}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Sin obligaciones en el mes ─────────────────────────────────────
  if (obligaciones.length === 0) {
    const ctaPath  = role === 'cliente' ? '/mi-empresa' : `/empresas/${empresaId}`;
    const ctaLabel = role === 'cliente' ? 'Ver mi empresa' : 'Gestionar obligaciones';
    return (
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> Obligaciones de {mesTitulo}
          </CardTitle>
          {empresaNombre && (
            <CardDescription>{empresaNombre}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <CheckCircle2 className="w-8 h-8 text-success/50" />
            <p className="text-sm text-muted-foreground">Sin obligaciones activas este mes</p>
            <Button variant="outline" size="sm" onClick={() => navigate(ctaPath)}>
              {ctaLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Lista normal ───────────────────────────────────────────────────
  return (
    <Card className="gradient-card shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Obligaciones de {mesTitulo}
            </CardTitle>
            {empresaNombre && (
              <CardDescription className="mt-0.5">
                {empresaNombre} · {obligaciones.length} activa{obligaciones.length !== 1 ? 's' : ''}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
              <CheckCircle2 className="w-3 h-3" /> {completadas}
            </Badge>
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
              <Clock className="w-3 h-3" /> {pendientes}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
          {obligaciones.map((obl) => {
            const isCompleted = !!cumplimientos[obl.id];
            const info        = getVencimientoInfo(obl.fecha_vencimiento);
            const accentColor =
              isCompleted                   ? 'hsl(var(--success))'     :
              info?.status === 'vencido'    ? 'hsl(var(--destructive))' :
              info?.status === 'urgente'    ? 'hsl(25, 95%, 53%)'       :
              info?.status === 'proximo'    ? 'hsl(var(--warning))'     :
              'hsl(var(--border))';

            return (
              <div
                key={obl.id}
                className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                  isCompleted ? 'bg-success/5 border-success/20' : 'hover:bg-accent/10'
                }`}
                style={{ borderLeft: `3px solid ${accentColor}` }}
              >
                <Checkbox
                  checked={isCompleted}
                  disabled={toggling === obl.id}
                  onCheckedChange={() => toggleCumplimiento(obl)}
                  className="shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm truncate font-heading ${
                    isCompleted ? 'line-through text-muted-foreground' : ''
                  }`}>
                    {obl.nombre}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    <Badge className={`text-xs ${CATEGORIA_COLORS[obl.categoria] || CATEGORIA_COLORS.otro}`}>
                      {CATEGORIA_LABELS[obl.categoria] || obl.categoria}
                    </Badge>
                    {obl.fecha_vencimiento && (
                      <span>{formatDateShort(obl.fecha_vencimiento)}</span>
                    )}
                  </div>
                </div>

                <SemaforoBadge fecha={obl.fecha_vencimiento} cumplida={isCompleted} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep DashboardObligacionesMensuales
```

Resultado esperado: sin output.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardObligacionesMensuales.tsx
git commit -m "feat(dashboard): render completo — loading, vacío, lista con toggle"
```

---

## Task 7: Integrar en Dashboard.tsx — sustituir AgendaHoy

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Añadir el import del nuevo componente**

En `src/pages/Dashboard.tsx`, añadir después de la línea que importa `AgendaHoy`:

```tsx
import DashboardObligacionesMensuales from '@/components/dashboard/DashboardObligacionesMensuales';
```

- [ ] **Step 2: Sustituir el render de AgendaHoy**

Localizar (línea ~173):

```tsx
        {/* Agenda del día */}
        {(role === 'administrador' || role === 'consultor') && <AgendaHoy />}
```

Reemplazar con:

```tsx
        {/* Obligaciones del mes */}
        <DashboardObligacionesMensuales />
```

El import de `AgendaHoy` puede eliminarse ya que no se usa en ningún otro lugar de `Dashboard.tsx`. Eliminar la línea:

```tsx
import AgendaHoy from '@/components/dashboard/AgendaHoy';
```

- [ ] **Step 3: Verificar TypeScript global**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Resultado esperado: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(dashboard): sustituir AgendaHoy por DashboardObligacionesMensuales"
```

---

## Task 8: Verificación manual en el navegador

- [ ] **Step 1: Arrancar el servidor de desarrollo**

```bash
npm run dev
```

- [ ] **Step 2: Verificar como admin/consultor sin empresa seleccionada**

Ir a `http://localhost:5173/dashboard` con un usuario admin o consultor.
- El widget debe mostrar el estado vacío "Selecciona una empresa en la barra lateral".

- [ ] **Step 3: Verificar como admin/consultor con empresa seleccionada**

Seleccionar una empresa en el selector de la barra lateral izquierda.
- El widget debe cargar las obligaciones del mes actual.
- Deben mostrarse con nombre truncado, badge de categoría, fecha corta y semáforo de días.
- Al marcar un checkbox, el texto debe tacharse inmediatamente (optimistic update) y debe aparecer un toast "Cumplimiento marcado".
- Al desmarcar, debe revertirse y aparecer "Cumplimiento desmarcado".

- [ ] **Step 4: Verificar como cliente**

Iniciar sesión con un usuario de rol `cliente`.
- El widget debe mostrar las obligaciones de su empresa automáticamente, sin selector.
- Si el cliente no tiene `empresa_id` en su perfil, debe aparecer "Sin empresa asignada".

- [ ] **Step 5: Verificar estado vacío sin obligaciones en el mes**

Con una empresa que no tenga obligaciones con `fecha_vencimiento` en el mes actual:
- Debe aparecer el estado vacío con el botón CTA correspondiente.
- Para cliente, el botón dice "Ver mi empresa" y navega a `/mi-empresa`.
- Para admin/consultor, dice "Gestionar obligaciones" y navega a `/empresas/{id}`.

- [ ] **Step 6: Commit final de verificación (si se hicieron ajustes)**

```bash
git add -p
git commit -m "fix(dashboard): ajustes post-verificación visual"
```

Si no hubo ajustes, omitir este step.

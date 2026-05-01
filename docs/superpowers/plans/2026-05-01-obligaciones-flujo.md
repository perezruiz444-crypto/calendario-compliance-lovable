# Obligaciones Flujo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar el flujo de creación de obligaciones para guiar al usuario hacia el catálogo, mostrar sugerencias fuzzy en el form manual, y hacer visibles las obligaciones huérfanas con badge + filtro.

**Architecture:** Opción A mínima — 3 archivos modificados, 1 archivo nuevo. Sin cambios a BD, sin hooks extraídos. `CrearObligacionChooser` intercepta el botón "Nueva"; `ObligacionFormDialog` carga el catálogo en memoria y hace match al escribir; `ObligacionesManager` recibe los nuevos callbacks y agrega estado de filtro + badges.

**Tech Stack:** React 18, TypeScript, Supabase JS client, shadcn/ui (Dialog, Badge, Button, Select), Tailwind CSS, lucide-react

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/components/obligaciones/CrearObligacionChooser.tsx` | Crear | Dialog pequeño con 2 opciones al crear obligación |
| `src/components/obligaciones/ObligacionFormDialog.tsx` | Modificar | Cargar catálogo en memoria + sugerencia fuzzy + prop `onSugerirCatalogo` |
| `src/components/obligaciones/ObligacionesManager.tsx` | Modificar | Chooser + handlers sugerencia + badge Manual + filtro origen + contador clickeable |

---

## Task 1: Crear `CrearObligacionChooser.tsx`

**Files:**
- Create: `src/components/obligaciones/CrearObligacionChooser.tsx`

- [ ] **Step 1: Crear el archivo**

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Pencil } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDesdeCatalogo: () => void;
  onPersonalizada: () => void;
}

export function CrearObligacionChooser({ open, onOpenChange, onDesdeCatalogo, onPersonalizada }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">¿Qué tipo de obligación?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            className="flex items-start gap-3 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-left hover:border-primary/60 hover:bg-primary/10 transition-colors"
            onClick={() => { onOpenChange(false); onDesdeCatalogo(); }}
          >
            <BookOpen className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Desde el catálogo</p>
              <p className="text-xs text-muted-foreground mt-0.5">Recurrencia automática · 50+ obligaciones precargadas</p>
            </div>
          </button>
          <button
            type="button"
            className="flex items-start gap-3 rounded-lg border border-border p-4 text-left hover:bg-muted/50 transition-colors"
            onClick={() => { onOpenChange(false); onPersonalizada(); }}
          >
            <Pencil className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Personalizada</p>
              <p className="text-xs text-muted-foreground mt-0.5">Solo para casos no contemplados en el catálogo. Sin recurrencia automática.</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar que el archivo compila**

```bash
cd /Users/canseco/Desktop/lovable/calendario-compliance-lovable
npx tsc --noEmit 2>&1 | head -30
```
Expected: sin errores en el archivo nuevo. Si hay errores de imports, verificar que las rutas de shadcn/ui coincidan con el resto del proyecto.

- [ ] **Step 3: Commit**

```bash
git add src/components/obligaciones/CrearObligacionChooser.tsx
git commit -m "feat(obligaciones): agregar CrearObligacionChooser dialog"
```

---

## Task 2: Conectar `CrearObligacionChooser` en `ObligacionesManager`

**Files:**
- Modify: `src/components/obligaciones/ObligacionesManager.tsx`

- [ ] **Step 1: Agregar import del chooser**

En `ObligacionesManager.tsx`, después de la línea de import de `ObligacionFormDialog`:

```tsx
import { CrearObligacionChooser } from './CrearObligacionChooser';
```

- [ ] **Step 2: Agregar estado `chooserOpen`**

Dentro del componente `ObligacionesManager`, después de la línea `const [detailSheetOpen, setDetailSheetOpen] = useState(false);`:

```tsx
const [chooserOpen, setChooserOpen] = useState(false);
```

- [ ] **Step 3: Cambiar el botón "Nueva" para abrir el chooser**

Buscar (línea ~409):
```tsx
{canEdit && (
  <Button size="sm" onClick={() => { setEditData(null); setFormOpen(true); }}>
    <Plus className="w-4 h-4 mr-1" />Nueva
  </Button>
)}
```

Reemplazar con:
```tsx
{canEdit && (
  <Button size="sm" onClick={() => setChooserOpen(true)}>
    <Plus className="w-4 h-4 mr-1" />Nueva
  </Button>
)}
```

- [ ] **Step 4: Agregar handler para "Desde catálogo"**

Justo antes del `return (` del componente, agregar:

```tsx
const handleDesdeCatalogo = () => {
  const el = document.getElementById('catalogo-activacion-section');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
```

- [ ] **Step 5: Montar `CrearObligacionChooser` en el JSX**

Justo antes del cierre `</Card>` (última línea antes de `}`), agregar después del `<AlertDialog>`:

```tsx
<CrearObligacionChooser
  open={chooserOpen}
  onOpenChange={setChooserOpen}
  onDesdeCatalogo={handleDesdeCatalogo}
  onPersonalizada={() => { setEditData(null); setFormOpen(true); }}
/>
```

- [ ] **Step 6: Agregar `id` a `CatalogoActivacionSection` en el padre**

Buscar en el archivo que renderiza `ObligacionesManager` y `CatalogoActivacionSection` juntos. Ejecutar:

```bash
grep -r "CatalogoActivacionSection" /Users/canseco/Desktop/lovable/calendario-compliance-lovable/src --include="*.tsx" -l
```

En ese archivo, agregar `id="catalogo-activacion-section"` al wrapper `<div>` o `<Card>` que envuelve `<CatalogoActivacionSection>`. Si el componente es directo sin wrapper, envolverlo:

```tsx
<div id="catalogo-activacion-section">
  <CatalogoActivacionSection ... />
</div>
```

- [ ] **Step 7: Verificar que compila**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: sin errores nuevos.

- [ ] **Step 8: Commit**

```bash
git add src/components/obligaciones/ObligacionesManager.tsx
# Agregar también el archivo padre si se modificó en step 6
git commit -m "feat(obligaciones): botón Nueva abre chooser antes del form"
```

---

## Task 3: Sugerencia fuzzy en `ObligacionFormDialog`

**Files:**
- Modify: `src/components/obligaciones/ObligacionFormDialog.tsx`

- [ ] **Step 1: Agregar import de `useMemo` y `Lightbulb`**

En la línea 1, cambiar:
```tsx
import { useState, useEffect } from 'react';
```
Por:
```tsx
import { useState, useEffect, useMemo } from 'react';
```

En la línea del import de lucide-react, agregar `Lightbulb`:
```tsx
import { ChevronDown, Calendar, User, Users, RefreshCw, Lightbulb } from 'lucide-react';
```

- [ ] **Step 2: Definir tipo `CatalogoMinItem`**

Después de la definición de `CATEGORIAS` (línea ~22), agregar:

```tsx
interface CatalogoMinItem {
  id: string;
  nombre: string;
  programa: string;
  presentacion: string | null;
}
```

- [ ] **Step 3: Agregar prop `onSugerirCatalogo` a la interfaz Props**

En la interfaz `Props` (línea ~53), agregar:
```tsx
onSugerirCatalogo?: (item: CatalogoMinItem) => void;
```

- [ ] **Step 4: Actualizar la firma del componente**

En la línea de la función del componente (línea ~62), agregar el nuevo prop:
```tsx
export function ObligacionFormDialog({ open, onOpenChange, onSubmit, initialData, loading, empresaId, onSugerirCatalogo }: Props) {
```

- [ ] **Step 5: Agregar estados para catálogo y sugerencia**

Después de `const [datesOpen, setDatesOpen] = useState(false);` (línea ~66), agregar:
```tsx
const [catalogo, setCatalogo] = useState<CatalogoMinItem[]>([]);
const [sugerenciaDescartada, setSugerenciaDescartada] = useState(false);
```

- [ ] **Step 6: Cargar catálogo al abrir el form (solo en creación)**

Después del último `useEffect` existente (línea ~87), agregar:
```tsx
useEffect(() => {
  if (open && !initialData?.id) {
    supabase
      .from('obligaciones_catalogo')
      .select('id, nombre, programa, presentacion')
      .eq('activo', true)
      .then(({ data }) => setCatalogo((data as CatalogoMinItem[]) || []));
  }
  if (!open) {
    setSugerenciaDescartada(false);
  }
}, [open, initialData?.id]);
```

- [ ] **Step 7: Calcular sugerencia en memoria**

Después del bloque `useEffect` anterior, agregar:
```tsx
const sugerencia = useMemo<CatalogoMinItem | null>(() => {
  if (form.nombre.length < 3 || catalogo.length === 0) return null;
  const q = form.nombre.toLowerCase();
  return catalogo.find(item => item.nombre.toLowerCase().includes(q)) ?? null;
}, [form.nombre, catalogo]);
```

- [ ] **Step 8: Resetear `sugerenciaDescartada` cuando cambia el nombre**

En la función `update`, agregar el reset condicional. Reemplazar:
```tsx
const update = (field: keyof ObligacionFormData, value: string | boolean | string[]) => {
  setForm(prev => ({ ...prev, [field]: value }));
};
```
Por:
```tsx
const update = (field: keyof ObligacionFormData, value: string | boolean | string[]) => {
  if (field === 'nombre') setSugerenciaDescartada(false);
  setForm(prev => ({ ...prev, [field]: value }));
};
```

- [ ] **Step 9: Renderizar el banner de sugerencia en el JSX**

En el JSX, justo después del cierre del `<div>` que contiene el `Input` de nombre (buscar `placeholder="Ej: Renovación Certificación IVA"`), agregar:

```tsx
{sugerencia && !sugerenciaDescartada && (
  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-2.5 mt-1.5">
    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-xs text-amber-800 dark:text-amber-300">
        <span className="font-semibold">"{sugerencia.nombre}"</span> existe en el catálogo
        ({sugerencia.programa}{sugerencia.presentacion ? ` · ${sugerencia.presentacion}` : ''})
      </p>
      <div className="flex gap-2 mt-1.5">
        <button
          type="button"
          className="text-xs font-medium text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900"
          onClick={() => onSugerirCatalogo?.(sugerencia)}
        >
          Activar desde catálogo
        </button>
        <span className="text-amber-400">·</span>
        <button
          type="button"
          className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800"
          onClick={() => setSugerenciaDescartada(true)}
        >
          Continuar personalizada
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 10: Verificar que compila**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: sin errores.

- [ ] **Step 11: Commit**

```bash
git add src/components/obligaciones/ObligacionFormDialog.tsx
git commit -m "feat(obligaciones): sugerencia fuzzy contra catálogo en form manual"
```

---

## Task 4: Conectar sugerencia en `ObligacionesManager` + abrir `ActivarObligacionDialog`

**Files:**
- Modify: `src/components/obligaciones/ObligacionesManager.tsx`

- [ ] **Step 1: Importar `ActivarObligacionDialog`**

Verificar si ya está importado:
```bash
grep "ActivarObligacionDialog" /Users/canseco/Desktop/lovable/calendario-compliance-lovable/src/components/obligaciones/ObligacionesManager.tsx
```

Si no está, agregar después de los imports existentes de obligaciones:
```tsx
import { ActivarObligacionDialog } from './ActivarObligacionDialog';
```

- [ ] **Step 2: Definir tipo `CatalogoMinItem` en el manager**

Después de la interfaz `Props` del componente (línea ~34), agregar:
```tsx
interface CatalogoMinItem {
  id: string;
  nombre: string;
  programa: string;
  presentacion: string | null;
}
```

- [ ] **Step 3: Agregar estado para la sugerencia de catálogo**

Después de `const [chooserOpen, setChooserOpen] = useState(false);`, agregar:
```tsx
const [sugerenciaCatalogoItem, setSugerenciaCatalogoItem] = useState<CatalogoMinItem | null>(null);
const [sugerenciaDialogOpen, setSugerenciaDialogOpen] = useState(false);
```

- [ ] **Step 4: Agregar handler `handleSugerirCatalogo`**

Después de `handleDesdeCatalogo`, agregar:
```tsx
const handleSugerirCatalogo = (item: CatalogoMinItem) => {
  setFormOpen(false);
  setEditData(null);
  setSugerenciaCatalogoItem(item as any);
  setSugerenciaDialogOpen(true);
};
```

- [ ] **Step 5: Pasar `onSugerirCatalogo` al `ObligacionFormDialog`**

Buscar el montaje de `<ObligacionFormDialog` en el JSX (línea ~557). Agregar la nueva prop:
```tsx
<ObligacionFormDialog
  open={formOpen}
  onOpenChange={(v) => { setFormOpen(v); if (!v) setEditData(null); }}
  onSubmit={editData?.id ? handleUpdate : handleCreate}
  initialData={editData}
  loading={saving}
  empresaId={empresaId}
  onSugerirCatalogo={handleSugerirCatalogo}
/>
```

- [ ] **Step 6: Montar `ActivarObligacionDialog` para la sugerencia**

Después del `<CrearObligacionChooser>` montado en Task 2, agregar:
```tsx
<ActivarObligacionDialog
  open={sugerenciaDialogOpen}
  onOpenChange={setSugerenciaDialogOpen}
  item={sugerenciaCatalogoItem}
  empresaId={empresaId}
  onActivated={() => { setSugerenciaCatalogoItem(null); fetchObligaciones(); }}
/>
```

- [ ] **Step 7: Verificar que compila**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/components/obligaciones/ObligacionesManager.tsx
git commit -m "feat(obligaciones): conectar sugerencia catálogo con ActivarObligacionDialog"
```

---

## Task 5: Badge "Manual" + filtro de origen + contador clickeable

**Files:**
- Modify: `src/components/obligaciones/ObligacionesManager.tsx`

- [ ] **Step 1: Agregar estado `filterOrigen`**

Después de `const [filterResponsable, setFilterResponsable] = useState('all');`, agregar:
```tsx
const [filterOrigen, setFilterOrigen] = useState<'all' | 'manual' | 'catalogo'>('all');
```

- [ ] **Step 2: Agregar lógica de filtro en `filtered`**

En el bloque `const filtered = obligaciones.filter(ob => {` (línea ~334), agregar antes del `return true`:
```tsx
if (filterOrigen === 'manual' && ob.catalogo_id) return false;
if (filterOrigen === 'catalogo' && !ob.catalogo_id) return false;
```

- [ ] **Step 3: Calcular `huerfanasCount`**

Después de `const porVencerCount = ...` (línea ~349), agregar:
```tsx
const huerfanasCount = obligaciones.filter(ob => !ob.catalogo_id).length;
```

- [ ] **Step 4: Agregar Select de origen en los filtros**

En el JSX, dentro del bloque `<div className="flex flex-col sm:flex-row gap-2 mt-3">`, después del `Select` de `filterResponsable` y antes del bloque de exportar, agregar:

```tsx
<Select value={filterOrigen} onValueChange={(v) => setFilterOrigen(v as 'all' | 'manual' | 'catalogo')}>
  <SelectTrigger className="w-[160px]">
    <BookOpen className="w-4 h-4 mr-1" /><SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todos</SelectItem>
    <SelectItem value="manual">Solo manuales</SelectItem>
    <SelectItem value="catalogo">Solo catálogo</SelectItem>
  </SelectContent>
</Select>
```

Agregar `BookOpen` al import de lucide-react si no está ya:
```tsx
import {
  Plus, Trash2, Pencil, Search,
  Calendar, AlertCircle, CheckCircle2, ClipboardList, Filter, FileDown,
  Zap, User, Users, ToggleLeft, ToggleRight, RefreshCw, BookOpen
} from 'lucide-react';
```

- [ ] **Step 5: Agregar contador clickeable en el header**

En el JSX, en el bloque de badges del header (donde están `vencidosCount` y `porVencerCount`, línea ~361), agregar:

```tsx
{huerfanasCount >= 3 && (
  <Badge
    className="bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80 gap-1"
    title="Obligaciones sin vínculo al catálogo maestro"
    onClick={() => setFilterOrigen('manual')}
  >
    {huerfanasCount} manuales · revisar
  </Badge>
)}
```

- [ ] **Step 6: Agregar badge "Manual" en la celda del nombre de la tabla**

En la tabla, en la celda `<td className="p-2">` que contiene el nombre (línea ~471), después del `<button>` con el nombre (`{ob.nombre}`), agregar:

```tsx
{!ob.catalogo_id && (
  <Badge variant="outline" className="text-[10px] text-muted-foreground ml-1 align-middle">
    Manual
  </Badge>
)}
```

El bloque completo quedará así:
```tsx
<button
  className={`font-medium text-left hover:text-primary transition-colors ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
  onClick={() => { setSelectedObId(ob.id); setDetailSheetOpen(true); }}
>
  {ob.nombre}
</button>
{!ob.catalogo_id && (
  <Badge variant="outline" className="text-[10px] text-muted-foreground ml-1 align-middle">
    Manual
  </Badge>
)}
```

- [ ] **Step 7: Verificar que compila**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/components/obligaciones/ObligacionesManager.tsx
git commit -m "feat(obligaciones): badge Manual, filtro origen y contador huérfanas"
```

---

## Task 6: Verificación final

- [ ] **Step 1: Correr verificación de tipos completa**

```bash
cd /Users/canseco/Desktop/lovable/calendario-compliance-lovable
npx tsc --noEmit 2>&1
```
Expected: 0 errores.

- [ ] **Step 2: Arrancar el servidor de desarrollo**

```bash
npm run dev
```

- [ ] **Step 3: Verificar criterio 1 — chooser al crear**

Navegar a la vista de una empresa con obligaciones. Hacer click en "Nueva". Verificar que aparece el dialog con 2 opciones y NO salta directo al form.

- [ ] **Step 4: Verificar criterio 2 — sugerencia fuzzy**

Click en "Nueva" → "Personalizada". En el campo nombre escribir al menos 3 caracteres de una obligación que exista en el catálogo (ej. "PROSEC", "IMMEX", "Renovación"). Verificar que aparece el banner amber con la sugerencia y los dos botones.

- [ ] **Step 5: Verificar criterio 3 — badge Manual**

En la tabla de obligaciones, verificar que las filas sin vínculo al catálogo muestran el badge "Manual" discreto al lado del nombre.

- [ ] **Step 6: Verificar criterio 4 — contador y filtro**

Si hay ≥3 obligaciones manuales, verificar que el header muestra el badge "X manuales · revisar". Hacer click en él y verificar que la tabla filtra mostrando solo las manuales.

- [ ] **Step 7: Verificar criterio 5 — no regresiones en catálogo**

Activar una obligación desde el catálogo usando el flujo normal (botón "Activar" en `CatalogoActivacionSection`). Verificar que funciona igual que antes.

- [ ] **Step 8: Commit final si hay ajustes menores**

```bash
git add -p
git commit -m "fix(obligaciones): ajustes menores post-verificación"
```

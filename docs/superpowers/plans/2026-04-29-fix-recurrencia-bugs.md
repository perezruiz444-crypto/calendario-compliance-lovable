# Fix Bugs de Recurrencia y Panel de Salud del Catálogo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir 3 bugs de recurrencia en el calendario (duplicados por mes, catálogos mal configurados, constraint preventivo) y agregar un tab "Salud" en CatalogoAdmin con warning al guardar.

**Architecture:** Una migración SQL consolidada que arregla datos existentes y agrega el unique index. Un único archivo React modificado (CatalogoAdmin.tsx) que añade el warning en `handleSave` y un tab "Salud" con query directa a Supabase.

**Tech Stack:** PostgreSQL (Supabase), React, TypeScript, Tailwind, shadcn/ui (Tabs, Badge, Card, Alert)

---

## Archivos a modificar / crear

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `supabase/migrations/20260429000000_fix_recurrencia_bugs.sql` | Crear | Dedup + constraint + corrección catálogos |
| `src/components/configuraciones/CatalogoAdmin.tsx` | Modificar | Warning en save + tab Salud |

---

## Task 1: Migración SQL — Dedup duplicados + unique index por mes (Bug 1)

**Files:**
- Create: `supabase/migrations/20260429000000_fix_recurrencia_bugs.sql`

- [ ] **Step 1: Crear el archivo de migración con el dedup**

```sql
-- supabase/migrations/20260429000000_fix_recurrencia_bugs.sql

-- ============================================================
-- BUG 1: Dedup duplicados mismo mes + constraint preventivo
-- ============================================================

-- 1a. Borrar duplicados: por cada grupo empresa+catalogo+mes,
--     conservar la fila con cumplimiento, o si no hay, la más reciente.
DELETE FROM public.obligaciones
WHERE id IN (
  SELECT id FROM (
    SELECT
      o.id,
      ROW_NUMBER() OVER (
        PARTITION BY o.empresa_id, o.catalogo_id, date_trunc('month', o.fecha_vencimiento)
        ORDER BY
          (SELECT COUNT(*) FROM public.obligacion_cumplimientos oc WHERE oc.obligacion_id = o.id) DESC,
          o.created_at DESC
      ) AS rn
    FROM public.obligaciones o
    WHERE o.catalogo_id IS NOT NULL
      AND o.fecha_vencimiento IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- 1b. Unique index: mismo empresa+catalogo no puede tener dos fechas en el mismo año-mes
CREATE UNIQUE INDEX IF NOT EXISTS idx_obligaciones_unique_mes
  ON public.obligaciones (empresa_id, catalogo_id, date_trunc('month', fecha_vencimiento))
  WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL;
```

- [ ] **Step 2: Verificar que el archivo existe**

```bash
ls supabase/migrations/20260429000000_fix_recurrencia_bugs.sql
```
Expected: el archivo listado.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260429000000_fix_recurrencia_bugs.sql
git commit -m "fix(db): dedup duplicados por mes + unique index empresa+catalogo+mes"
```

---

## Task 2: Migración SQL — Corregir catálogos mal configurados (Bug 2A)

**Files:**
- Modify: `supabase/migrations/20260429000000_fix_recurrencia_bugs.sql` (agregar al final)

- [ ] **Step 1: Agregar la corrección de datos al final del archivo de migración**

Abrir `supabase/migrations/20260429000000_fix_recurrencia_bugs.sql` y añadir al final:

```sql
-- ============================================================
-- BUG 2A: Corregir catálogos ULTIMO_DIA_MES que son realmente ANUAL
-- ============================================================

-- 2a. Catálogos cuyo texto dice "de <mes>" pero frecuencia_tipo = 'ULTIMO_DIA_MES'
--     → cambiar a ANUAL con el mes correcto
UPDATE public.obligaciones_catalogo
SET
  frecuencia_tipo = 'ANUAL',
  mes_vencimiento = CASE
    WHEN presentacion ILIKE '%de enero%'      THEN 1
    WHEN presentacion ILIKE '%de febrero%'    THEN 2
    WHEN presentacion ILIKE '%de marzo%'      THEN 3
    WHEN presentacion ILIKE '%de abril%'      THEN 4
    WHEN presentacion ILIKE '%de mayo%'       THEN 5
    WHEN presentacion ILIKE '%de junio%'      THEN 6
    WHEN presentacion ILIKE '%de julio%'      THEN 7
    WHEN presentacion ILIKE '%de agosto%'     THEN 8
    WHEN presentacion ILIKE '%de septiembre%' THEN 9
    WHEN presentacion ILIKE '%de octubre%'    THEN 10
    WHEN presentacion ILIKE '%de noviembre%'  THEN 11
    WHEN presentacion ILIKE '%de diciembre%'  THEN 12
    ELSE mes_vencimiento
  END
WHERE frecuencia_tipo = 'ULTIMO_DIA_MES'
  AND (
    presentacion ILIKE '%de enero%'      OR presentacion ILIKE '%de febrero%'    OR
    presentacion ILIKE '%de marzo%'      OR presentacion ILIKE '%de abril%'      OR
    presentacion ILIKE '%de mayo%'       OR presentacion ILIKE '%de junio%'      OR
    presentacion ILIKE '%de julio%'      OR presentacion ILIKE '%de agosto%'     OR
    presentacion ILIKE '%de septiembre%' OR presentacion ILIKE '%de octubre%'    OR
    presentacion ILIKE '%de noviembre%'  OR presentacion ILIKE '%de diciembre%'
  );

-- 2b. Borrar ocurrencias extra de esos catálogos (meses que no son el mes_vencimiento)
--     Solo borra si NO tienen cumplimiento registrado.
DELETE FROM public.obligaciones o
USING public.obligaciones_catalogo c
WHERE o.catalogo_id = c.id
  AND c.frecuencia_tipo = 'ANUAL'
  AND c.mes_vencimiento IS NOT NULL
  AND EXTRACT(MONTH FROM o.fecha_vencimiento) <> c.mes_vencimiento
  AND o.activa = true
  AND NOT EXISTS (
    SELECT 1 FROM public.obligacion_cumplimientos oc WHERE oc.obligacion_id = o.id
  );
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260429000000_fix_recurrencia_bugs.sql
git commit -m "fix(db): corregir catalogos ULTIMO_DIA_MES → ANUAL y borrar ocurrencias extra"
```

---

## Task 3: Warning en UI al guardar catálogo con frecuencia incorrecta (Bug 2B)

**Files:**
- Modify: `src/components/configuraciones/CatalogoAdmin.tsx`

Este task modifica `handleSave` para detectar la inconsistencia y mostrar un `toast.warning` antes de guardar (no bloquea).

- [ ] **Step 1: Agregar helper de detección de mes en presentación**

En `CatalogoAdmin.tsx`, justo antes de `export function CatalogoAdmin()`, agregar:

```typescript
const MESES_NOMBRES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

function presentacionMencionaMes(presentacion: string): boolean {
  const lower = presentacion.toLowerCase();
  return MESES_NOMBRES.some(m => lower.includes(`de ${m}`));
}
```

- [ ] **Step 2: Agregar el warning en handleSave**

En `handleSave`, justo después de la validación de `dia` y antes de construir `payload`, agregar:

```typescript
// Warning: ULTIMO_DIA_MES con mes específico en presentación → debería ser ANUAL
if (
  form.frecuencia_tipo === 'ULTIMO_DIA_MES' &&
  form.presentacion &&
  presentacionMencionaMes(form.presentacion)
) {
  toast.warning(
    'El texto de presentación menciona un mes específico. Considera cambiar la frecuencia a "Anual" para que solo genere una fecha al año.'
  );
}
```

- [ ] **Step 3: Actualizar el tipo FrecuenciaTipo para incluir SEMANAL y ULTIMO_DIA_MES**

Buscar en `CatalogoAdmin.tsx`:
```typescript
type FrecuenciaTipo = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | 'EVENTUAL';
```
Reemplazar con:
```typescript
type FrecuenciaTipo = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | 'EVENTUAL' | 'SEMANAL' | 'ULTIMO_DIA_MES';
```

Y actualizar `FRECUENCIA_OPTIONS` para incluirlos:
```typescript
const FRECUENCIA_OPTIONS: { value: FrecuenciaTipo; label: string; ocurrencias: number }[] = [
  { value: 'MENSUAL',       label: 'Mensual',                ocurrencias: 12 },
  { value: 'BIMESTRAL',     label: 'Bimestral',              ocurrencias: 6  },
  { value: 'TRIMESTRAL',    label: 'Trimestral',             ocurrencias: 4  },
  { value: 'SEMESTRAL',     label: 'Semestral',              ocurrencias: 2  },
  { value: 'ANUAL',         label: 'Anual',                  ocurrencias: 1  },
  { value: 'SEMANAL',       label: 'Semanal',                ocurrencias: 52 },
  { value: 'ULTIMO_DIA_MES',label: 'Último día de cada mes', ocurrencias: 12 },
  { value: 'EVENTUAL',      label: 'Eventual / sin recurrencia', ocurrencias: 0 },
];
```

- [ ] **Step 4: Commit**

```bash
git add src/components/configuraciones/CatalogoAdmin.tsx
git commit -m "feat(ui): warning al guardar catalogo con ULTIMO_DIA_MES y mes en presentacion"
```

---

## Task 4: Tab "Salud" en CatalogoAdmin (Bug 4)

**Files:**
- Modify: `src/components/configuraciones/CatalogoAdmin.tsx`

Este task agrega un tab "Salud" usando el componente `Tabs` de shadcn/ui. El tab existente (lista de catálogos) se convierte en tab "Catálogo".

- [ ] **Step 1: Agregar tipos para los datos de salud**

En `CatalogoAdmin.tsx`, después de la interfaz `FormData`, agregar:

```typescript
interface CatalogoCoverage {
  id: string;
  nombre: string;
  programa: string;
  frecuencia_tipo: FrecuenciaTipo | null;
  presentacion: string | null;
  empresas_activas: number;
  ocurrencias_anio: number;
}

interface BanderaRoja {
  id: string;
  nombre: string;
  tipo: 'frecuencia_inconsistente' | 'sin_empresas' | 'sin_frecuencia';
  mensaje: string;
}
```

- [ ] **Step 2: Agregar imports necesarios**

En la sección de imports de `CatalogoAdmin.tsx`, agregar:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Activity } from 'lucide-react';
```

- [ ] **Step 3: Agregar estado y función de fetch para datos de salud**

Dentro de `export function CatalogoAdmin()`, después de los estados existentes (`items`, `loading`, etc.), agregar:

```typescript
const [coverage, setCoverage]         = useState<CatalogoCoverage[]>([]);
const [loadingHealth, setLoadingHealth] = useState(false);

const fetchHealth = async () => {
  setLoadingHealth(true);
  const anio = new Date().getFullYear();

  const { data: cats } = await supabase
    .from('obligaciones_catalogo')
    .select('id, nombre, programa, frecuencia_tipo, presentacion, activo')
    .eq('activo', true);

  if (!cats) { setLoadingHealth(false); return; }

  const { data: obligs } = await supabase
    .from('obligaciones')
    .select('catalogo_id, empresa_id, fecha_vencimiento')
    .not('catalogo_id', 'is', null)
    .eq('activa', true)
    .gte('fecha_vencimiento', `${anio}-01-01`)
    .lte('fecha_vencimiento', `${anio}-12-31`);

  const coverageData: CatalogoCoverage[] = cats.map((cat: any) => {
    const filas = (obligs || []).filter((o: any) => o.catalogo_id === cat.id);
    const empresasSet = new Set(filas.map((o: any) => o.empresa_id));
    return {
      id: cat.id,
      nombre: cat.nombre,
      programa: cat.programa,
      frecuencia_tipo: cat.frecuencia_tipo,
      presentacion: cat.presentacion,
      empresas_activas: empresasSet.size,
      ocurrencias_anio: filas.length,
    };
  });

  setCoverage(coverageData);
  setLoadingHealth(false);
};
```

- [ ] **Step 4: Calcular banderas rojas**

Después de `fetchHealth`, agregar la función que calcula las banderas:

```typescript
const banderasRojas = (coverage: CatalogoCoverage[]): BanderaRoja[] => {
  const banderas: BanderaRoja[] = [];
  for (const cat of coverage) {
    if (
      cat.frecuencia_tipo === 'ULTIMO_DIA_MES' &&
      cat.presentacion &&
      presentacionMencionaMes(cat.presentacion)
    ) {
      banderas.push({
        id: cat.id,
        nombre: cat.nombre,
        tipo: 'frecuencia_inconsistente',
        mensaje: `"${cat.nombre}" genera fechas todo el año pero su descripción menciona un mes específico. Considera cambiar la frecuencia a Anual.`,
      });
    }
    if (cat.empresas_activas === 0) {
      banderas.push({
        id: cat.id,
        nombre: cat.nombre,
        tipo: 'sin_empresas',
        mensaje: `"${cat.nombre}" está activa en el catálogo pero ninguna empresa la tiene asignada.`,
      });
    }
    if (!cat.frecuencia_tipo || cat.frecuencia_tipo === 'EVENTUAL') {
      if (cat.ocurrencias_anio > 0) {
        banderas.push({
          id: cat.id,
          nombre: cat.nombre,
          tipo: 'sin_frecuencia',
          mensaje: `"${cat.nombre}" no tiene recurrencia configurada — sus obligaciones solo aparecen una vez en el calendario.`,
        });
      }
    }
  }
  return banderas;
};
```

- [ ] **Step 5: Reemplazar el contenido del CardContent con Tabs**

En el JSX de `CatalogoAdmin`, el `<CardContent>` actualmente contiene directamente el formulario y la lista. Envolverlo en `<Tabs>`:

Buscar:
```tsx
<CardContent className="space-y-4">

        {/* Formulario */}
```

Reemplazar con:
```tsx
<CardContent className="space-y-4">
        <Tabs defaultValue="catalogo" onValueChange={(v) => { if (v === 'salud') fetchHealth(); }}>
          <TabsList className="mb-4">
            <TabsTrigger value="catalogo" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Catálogo
            </TabsTrigger>
            <TabsTrigger value="salud" className="gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Salud
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalogo" className="space-y-4">
        {/* Formulario */}
```

- [ ] **Step 6: Cerrar el TabsContent de "catalogo" y agregar el TabsContent de "salud"**

Buscar el cierre del `CardContent` al final del JSX (última línea antes de `</Card>`):
```tsx
      </CardContent>
```

Reemplazar con:
```tsx
          </TabsContent>

          <TabsContent value="salud" className="space-y-6">
            {loadingHealth ? (
              <p className="text-sm text-muted-foreground">Cargando diagnóstico...</p>
            ) : (
              <>
                {/* Banderas rojas */}
                {banderasRojas(coverage).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Puntos a revisar
                    </p>
                    {banderasRojas(coverage).map((b) => (
                      <div key={`${b.id}-${b.tipo}`} className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                        <p className="text-sm text-amber-800 dark:text-amber-300">{b.mensaje}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 text-xs"
                          onClick={() => {
                            const item = items.find(i => i.id === b.id);
                            if (item) handleEdit(item);
                          }}
                        >
                          Revisar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tabla de cobertura */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Cobertura {new Date().getFullYear()}</p>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Obligación</th>
                          <th className="text-center px-3 py-2 font-medium text-muted-foreground">Empresas</th>
                          <th className="text-center px-3 py-2 font-medium text-muted-foreground">Fechas {new Date().getFullYear()}</th>
                          <th className="text-center px-3 py-2 font-medium text-muted-foreground">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {coverage.map((cat) => (
                          <tr key={cat.id} className="hover:bg-muted/30">
                            <td className="px-3 py-2">
                              <p className="font-medium">{cat.nombre}</p>
                              <p className="text-xs text-muted-foreground">{cat.frecuencia_tipo ?? 'Sin frecuencia'}</p>
                            </td>
                            <td className="px-3 py-2 text-center">{cat.empresas_activas}</td>
                            <td className="px-3 py-2 text-center">{cat.ocurrencias_anio}</td>
                            <td className="px-3 py-2 text-center">
                              {cat.empresas_activas === 0
                                ? <Badge variant="outline" className="text-amber-600 border-amber-300">⚠️ Sin uso</Badge>
                                : <Badge variant="outline" className="text-green-600 border-green-300">✅ Activa</Badge>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
```

- [ ] **Step 7: Commit**

```bash
git add src/components/configuraciones/CatalogoAdmin.tsx
git commit -m "feat(ui): tab Salud en CatalogoAdmin con cobertura y banderas rojas"
```

---

## Task 5: Verificación final

- [ ] **Step 1: Verificar TypeScript sin errores**

```bash
npx tsc --noEmit
```
Expected: sin errores de tipos.

- [ ] **Step 2: Verificar que la migración está lista para aplicar**

```bash
cat supabase/migrations/20260429000000_fix_recurrencia_bugs.sql
```
Expected: archivo completo con los 4 bloques SQL (dedup, unique index, UPDATE catálogos, DELETE ocurrencias extra).

- [ ] **Step 3: Commit final si hay cambios pendientes**

```bash
git status
git add -A
git commit -m "chore: verificacion final bugs recurrencia"
```

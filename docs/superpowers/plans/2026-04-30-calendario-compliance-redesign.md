# Calendario Compliance — Rediseño Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar generación automática de obligaciones por empresa basada en programas activos, corregir el catálogo IMMEX/PROSEC, eliminar OEA, y mover el filtrado del calendario a la query SQL.

**Architecture:** Nueva tabla `empresa_programas` como fuente de verdad de qué programas tiene cada empresa. Un trigger SQL genera automáticamente las obligaciones del año al activar un programa. Un cron pg_cron las regenera cada 1 de enero. El frontend expone una UI de gestión en EmpresaDetail y corrige las queries del calendario.

**Tech Stack:** PostgreSQL (Supabase), pg_cron, React 18, TypeScript, Tailwind CSS, shadcn/ui, date-fns, FullCalendar

---

## Mapa de archivos

### Nuevos
- `supabase/migrations/20260430000000_empresa_programas.sql` — tabla, trigger, función de generación, flag catálogo, correcciones, eliminación OEA, RLS, cron
- `src/components/empresas/EmpresaProgramasTab.tsx` — UI de gestión de programas por empresa
- `src/components/empresas/ProgramaRow.tsx` — fila individual con botón activar/desactivar

### Modificados
- `src/pages/EmpresaDetail.tsx` — agregar tab "Programas"
- `src/components/dashboard/DashboardCalendar.tsx` — mover filtro a query SQL, eliminar bloque `programa` independiente, eliminar OEA
- `src/lib/obligaciones.ts` — eliminar referencias OEA de `programaToCategoria`
- `src/components/empresas/OnboardingEmpresaWizard.tsx` — insertar en `empresa_programas` en lugar de campos sueltos

---

## Task 1: Migración SQL principal

**Files:**
- Create: `supabase/migrations/20260430000000_empresa_programas.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/20260430000000_empresa_programas.sql

-- ============================================================
-- 1. Flag usar_ultimo_dia_habil en catálogo
-- ============================================================
ALTER TABLE public.obligaciones_catalogo
  ADD COLUMN IF NOT EXISTS usar_ultimo_dia_habil boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.obligaciones_catalogo.usar_ultimo_dia_habil IS
  'Si true, ignora dia_vencimiento y calcula el último día hábil (lun-vie) del mes de vencimiento';

-- ============================================================
-- 2. Correcciones al catálogo: IMMEX y PROSEC
-- ============================================================
UPDATE public.obligaciones_catalogo
SET
  frecuencia_tipo       = 'ANUAL',
  mes_vencimiento       = 5,
  dia_vencimiento       = NULL,
  usar_ultimo_dia_habil = true,
  presentacion          = 'anual',
  notas_internas        = 'Período: 1 abr – último día hábil mayo (VUCEM/RAOCE). Con IMMEX+PROSEC cumplir antes del 30 abr. Suspensión si no se presenta en mayo; cancelación definitiva antes del último día hábil de agosto.'
WHERE programa = 'immex'
  AND nombre   = 'Renovación Anual Programa IMMEX';

UPDATE public.obligaciones_catalogo
SET
  frecuencia_tipo       = 'ANUAL',
  mes_vencimiento       = 4,
  dia_vencimiento       = NULL,
  usar_ultimo_dia_habil = true,
  presentacion          = 'anual',
  notas_internas        = 'Fecha límite: último día hábil de abril (VUCEM/RAOCE). Suspensión automática el 1 de mayo. Cancelación definitiva el 1 de julio si no se subsana.'
WHERE programa = 'prosec'
  AND nombre   = 'Renovación Anual Programa PROSEC';

-- ============================================================
-- 3. Eliminación OEA
-- ============================================================
DELETE FROM public.obligaciones
WHERE catalogo_id IN (SELECT id FROM public.obligaciones_catalogo WHERE programa = 'oea')
  AND NOT EXISTS (
    SELECT 1 FROM public.obligacion_cumplimientos oc
    WHERE oc.obligacion_id = public.obligaciones.id
  );

DELETE FROM public.obligaciones_catalogo WHERE programa = 'oea';

-- ============================================================
-- 4. Tabla empresa_programas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.empresa_programas (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   uuid        NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  programa     text        NOT NULL
    CHECK (programa IN ('immex', 'prosec', 'padron', 'cert_iva_ieps', 'general')),
  activo       boolean     NOT NULL DEFAULT true,
  fecha_inicio date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, programa)
);

COMMENT ON TABLE  public.empresa_programas IS 'Fuente de verdad de qué programas tiene activos cada empresa.';
COMMENT ON COLUMN public.empresa_programas.fecha_inicio IS 'Fecha de autorización del programa (informativa).';

CREATE INDEX IF NOT EXISTS idx_empresa_programas_empresa
  ON public.empresa_programas (empresa_id, activo);

-- ============================================================
-- 5. RLS para empresa_programas
-- ============================================================
ALTER TABLE public.empresa_programas ENABLE ROW LEVEL SECURITY;

-- SELECT: usuarios autenticados ven los programas de empresas a las que tienen acceso
CREATE POLICY "Usuarios autenticados ven empresa_programas"
  ON public.empresa_programas FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: solo administradores y consultores
CREATE POLICY "Admins y consultores gestionan empresa_programas"
  ON public.empresa_programas FOR ALL
  TO authenticated
  USING  (public.has_role(auth.uid(), 'administrador'::app_role)
       OR public.has_role(auth.uid(), 'consultor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'::app_role)
           OR public.has_role(auth.uid(), 'consultor'::app_role));

-- ============================================================
-- 6. Función: calcular último día hábil del mes
-- ============================================================
CREATE OR REPLACE FUNCTION public.ultimo_dia_habil(p_year int, p_mes int)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_fecha date;
BEGIN
  -- Empieza en el último día del mes
  v_fecha := (make_date(p_year, p_mes, 1) + INTERVAL '1 month - 1 day')::date;
  -- Retrocede hasta encontrar lunes-viernes (ISODOW 1-5)
  WHILE EXTRACT(ISODOW FROM v_fecha) IN (6, 7) LOOP
    v_fecha := v_fecha - 1;
  END LOOP;
  RETURN v_fecha;
END;
$$;

-- ============================================================
-- 7. Función: generar obligaciones de un catálogo para una empresa y año
-- ============================================================
CREATE OR REPLACE FUNCTION public.generar_obligaciones_empresa_programa(
  p_empresa_id uuid,
  p_programa   text,
  p_year       int DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year    int := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::int);
  v_cat     public.obligaciones_catalogo%ROWTYPE;
  v_empresa public.empresas%ROWTYPE;
  v_fecha   date;
  v_step    int;
  v_count   int;
  v_dia     int;
  v_mes     int;
  v_last_day int;
  v_new_id  uuid;
  v_total   int := 0;
  v_jan1    date;
  v_dow     int;
  v_offset  int;
BEGIN
  SELECT * INTO v_empresa FROM public.empresas WHERE id = p_empresa_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR v_cat IN
    SELECT * FROM public.obligaciones_catalogo
    WHERE programa = p_programa
      AND activo   = true
      AND frecuencia_tipo IS NOT NULL
      AND frecuencia_tipo <> 'EVENTUAL'
  LOOP
    -- Calcular fecha(s) según frecuencia
    CASE v_cat.frecuencia_tipo
      WHEN 'MENSUAL'    THEN v_step := 1;  v_count := 12;
      WHEN 'BIMESTRAL'  THEN v_step := 2;  v_count := 6;
      WHEN 'TRIMESTRAL' THEN v_step := 3;  v_count := 4;
      WHEN 'SEMESTRAL'  THEN v_step := 6;  v_count := 2;
      WHEN 'ANUAL'      THEN v_step := 12; v_count := 1;
      ELSE v_step := 0; v_count := 0;
    END CASE;

    IF v_cat.frecuencia_tipo = 'SEMANAL' THEN
      v_dia    := COALESCE(v_cat.dia_vencimiento, 5);
      v_jan1   := make_date(v_year, 1, 1);
      v_dow    := EXTRACT(ISODOW FROM v_jan1)::int;
      v_offset := (v_dia - v_dow + 7) % 7;
      v_fecha  := v_jan1 + v_offset;
      WHILE EXTRACT(YEAR FROM v_fecha)::int = v_year LOOP
        INSERT INTO public.obligaciones (
          empresa_id, catalogo_id, categoria, nombre, descripcion,
          articulos, presentacion, fecha_vencimiento, estado, activa
        ) VALUES (
          p_empresa_id, v_cat.id, v_cat.categoria, v_cat.nombre, v_cat.descripcion,
          v_cat.articulos, v_cat.presentacion, v_fecha, 'vigente', true
        )
        ON CONFLICT (empresa_id, catalogo_id, EXTRACT(YEAR FROM fecha_vencimiento), EXTRACT(MONTH FROM fecha_vencimiento))
        DO NOTHING
        RETURNING id INTO v_new_id;
        IF v_new_id IS NOT NULL THEN v_total := v_total + 1; END IF;
        v_fecha := v_fecha + 7;
      END LOOP;

    ELSIF v_cat.frecuencia_tipo = 'ULTIMO_DIA_MES' THEN
      FOR v_mes IN 1..12 LOOP
        v_fecha := (make_date(v_year, v_mes, 1) + INTERVAL '1 month - 1 day')::date;
        INSERT INTO public.obligaciones (
          empresa_id, catalogo_id, categoria, nombre, descripcion,
          articulos, presentacion, fecha_vencimiento, estado, activa
        ) VALUES (
          p_empresa_id, v_cat.id, v_cat.categoria, v_cat.nombre, v_cat.descripcion,
          v_cat.articulos, v_cat.presentacion, v_fecha, 'vigente', true
        )
        ON CONFLICT (empresa_id, catalogo_id, EXTRACT(YEAR FROM fecha_vencimiento), EXTRACT(MONTH FROM fecha_vencimiento))
        DO NOTHING
        RETURNING id INTO v_new_id;
        IF v_new_id IS NOT NULL THEN v_total := v_total + 1; END IF;
      END LOOP;

    ELSE
      -- MENSUAL, BIMESTRAL, TRIMESTRAL, SEMESTRAL, ANUAL
      FOR v_i IN 0..(v_count - 1) LOOP
        IF v_cat.frecuencia_tipo = 'ANUAL' THEN
          v_mes := COALESCE(v_cat.mes_vencimiento, 1);
        ELSE
          v_mes := ((v_i * v_step) % 12) + 1;
        END IF;

        IF v_cat.usar_ultimo_dia_habil THEN
          v_fecha := public.ultimo_dia_habil(v_year, v_mes);
        ELSE
          v_dia      := COALESCE(v_cat.dia_vencimiento, 1);
          v_last_day := EXTRACT(DAY FROM (make_date(v_year, v_mes, 1) + INTERVAL '1 month - 1 day'))::int;
          v_fecha    := make_date(v_year, v_mes, LEAST(v_dia, v_last_day));
        END IF;

        INSERT INTO public.obligaciones (
          empresa_id, catalogo_id, categoria, nombre, descripcion,
          articulos, presentacion, fecha_vencimiento, estado, activa
        ) VALUES (
          p_empresa_id, v_cat.id, v_cat.categoria, v_cat.nombre, v_cat.descripcion,
          v_cat.articulos, v_cat.presentacion, v_fecha, 'vigente', true
        )
        ON CONFLICT (empresa_id, catalogo_id, EXTRACT(YEAR FROM fecha_vencimiento), EXTRACT(MONTH FROM fecha_vencimiento))
        DO NOTHING
        RETURNING id INTO v_new_id;
        IF v_new_id IS NOT NULL THEN v_total := v_total + 1; END IF;
      END LOOP;
    END IF;

  END LOOP;

  RETURN v_total;
END;
$$;

-- ============================================================
-- 8. Función: generar obligaciones para TODOS los programas activos (cron)
-- ============================================================
CREATE OR REPLACE FUNCTION public.generar_obligaciones_todos_programas_activos(p_year int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r       RECORD;
  v_total int := 0;
BEGIN
  FOR r IN
    SELECT empresa_id, programa
    FROM public.empresa_programas
    WHERE activo = true
  LOOP
    v_total := v_total + public.generar_obligaciones_empresa_programa(r.empresa_id, r.programa, p_year);
  END LOOP;
  RETURN v_total;
END;
$$;

-- ============================================================
-- 9. Trigger: al activar un programa, generar obligaciones automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_empresa_programa_activado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
BEGIN
  -- Solo actuar en INSERT o cuando activo cambia de false → true
  IF (TG_OP = 'INSERT' AND NEW.activo = true)
  OR (TG_OP = 'UPDATE' AND OLD.activo = false AND NEW.activo = true) THEN
    PERFORM public.generar_obligaciones_empresa_programa(NEW.empresa_id, NEW.programa, v_year);
    -- Si estamos en diciembre, generar también el año siguiente
    IF EXTRACT(MONTH FROM CURRENT_DATE) = 12 THEN
      PERFORM public.generar_obligaciones_empresa_programa(NEW.empresa_id, NEW.programa, v_year + 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresa_programa_activado ON public.empresa_programas;
CREATE TRIGGER trg_empresa_programa_activado
  AFTER INSERT OR UPDATE OF activo ON public.empresa_programas
  FOR EACH ROW EXECUTE FUNCTION public.trg_empresa_programa_activado();

-- ============================================================
-- 10. Cron anual: 1 de enero a las 06:00 UTC
-- ============================================================
SELECT cron.schedule(
  'generar-obligaciones-anual',
  '0 6 1 1 *',
  $$SELECT public.generar_obligaciones_todos_programas_activos(EXTRACT(YEAR FROM NOW())::int)$$
);

-- ============================================================
-- 11. Backfill: migrar programas existentes de empresas a empresa_programas
-- ============================================================
INSERT INTO public.empresa_programas (empresa_id, programa, activo, fecha_inicio)
SELECT id, 'immex', true, immex_fecha_autorizacion
FROM public.empresas
WHERE immex_fecha_autorizacion IS NOT NULL
   OR EXISTS (
     SELECT 1 FROM public.obligaciones o
     JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
     WHERE o.empresa_id = empresas.id AND c.programa = 'immex' AND o.activa = true
   )
ON CONFLICT (empresa_id, programa) DO NOTHING;

INSERT INTO public.empresa_programas (empresa_id, programa, activo, fecha_inicio)
SELECT id, 'prosec', true, prosec_fecha_autorizacion
FROM public.empresas
WHERE prosec_fecha_autorizacion IS NOT NULL
   OR EXISTS (
     SELECT 1 FROM public.obligaciones o
     JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
     WHERE o.empresa_id = empresas.id AND c.programa = 'prosec' AND o.activa = true
   )
ON CONFLICT (empresa_id, programa) DO NOTHING;

INSERT INTO public.empresa_programas (empresa_id, programa, activo, fecha_inicio)
SELECT id, 'cert_iva_ieps', true, cert_iva_ieps_fecha_autorizacion
FROM public.empresas
WHERE cert_iva_ieps_fecha_autorizacion IS NOT NULL
   OR EXISTS (
     SELECT 1 FROM public.obligaciones o
     JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
     WHERE o.empresa_id = empresas.id AND c.programa = 'cert_iva_ieps' AND o.activa = true
   )
ON CONFLICT (empresa_id, programa) DO NOTHING;

INSERT INTO public.empresa_programas (empresa_id, programa, activo, fecha_inicio)
SELECT DISTINCT o.empresa_id, 'padron', true, NULL
FROM public.obligaciones o
JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
WHERE c.programa = 'padron' AND o.activa = true
ON CONFLICT (empresa_id, programa) DO NOTHING;

INSERT INTO public.empresa_programas (empresa_id, programa, activo, fecha_inicio)
SELECT DISTINCT o.empresa_id, 'general', true, NULL
FROM public.obligaciones o
JOIN public.obligaciones_catalogo c ON c.id = o.catalogo_id
WHERE c.programa = 'general' AND o.activa = true
ON CONFLICT (empresa_id, programa) DO NOTHING;
```

- [ ] **Step 2: Aplicar la migración localmente**

```bash
supabase db push
```

Resultado esperado: sin errores. Si hay error en `cron.schedule`, verificar que `pg_cron` esté habilitado en Supabase Dashboard → Database → Extensions.

- [ ] **Step 3: Verificar en psql/Supabase SQL editor**

```sql
-- Verificar que la tabla existe
SELECT * FROM empresa_programas LIMIT 5;

-- Verificar función
SELECT generar_obligaciones_empresa_programa('<uuid-empresa-real>', 'immex', 2026);

-- Verificar backfill
SELECT programa, COUNT(*) FROM empresa_programas GROUP BY programa;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260430000000_empresa_programas.sql
git commit -m "feat(db): tabla empresa_programas + trigger + cron + correcciones catálogo + eliminar OEA"
```

---

## Task 2: Componente ProgramaRow

**Files:**
- Create: `src/components/empresas/ProgramaRow.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// src/components/empresas/ProgramaRow.tsx
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, Circle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const PROGRAMA_LABELS: Record<string, string> = {
  immex:         'IMMEX',
  prosec:        'PROSEC',
  padron:        'Padrón de Importadores',
  cert_iva_ieps: 'Certificación IVA/IEPS',
  general:       'General',
};

export const PROGRAMA_DESCRIPTIONS: Record<string, string> = {
  immex:         'Industria Manufacturera, Maquiladora y de Servicios de Exportación',
  prosec:        'Programa de Promoción Sectorial',
  padron:        'Padrón General de Importadores SAT',
  cert_iva_ieps: 'Certificación de IVA e IEPS ante el SAT',
  general:       'Obligaciones generales de comercio exterior',
};

interface EmpresaPrograma {
  id: string;
  programa: string;
  activo: boolean;
  fecha_inicio: string | null;
}

interface ProgramaRowProps {
  programa: string;
  registro: EmpresaPrograma | null;
  empresaId: string;
  canEdit: boolean;
  onUpdate: () => void;
}

export function ProgramaRow({ programa, registro, empresaId, canEdit, onUpdate }: ProgramaRowProps) {
  const [loading, setLoading] = useState(false);
  const activo = registro?.activo ?? false;

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (!registro) {
        const { error } = await supabase
          .from('empresa_programas')
          .insert({ empresa_id: empresaId, programa, activo: true });
        if (error) throw error;
        toast.success(`Programa ${PROGRAMA_LABELS[programa]} activado — obligaciones generadas para ${new Date().getFullYear()}`);
      } else if (activo) {
        const { error } = await supabase
          .from('empresa_programas')
          .update({ activo: false })
          .eq('id', registro.id);
        if (error) throw error;
        toast.success(`Programa ${PROGRAMA_LABELS[programa]} desactivado`);
      } else {
        const { error } = await supabase
          .from('empresa_programas')
          .update({ activo: true })
          .eq('id', registro.id);
        if (error) throw error;
        toast.success(`Programa ${PROGRAMA_LABELS[programa]} reactivado — obligaciones generadas`);
      }
      onUpdate();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        {activo
          ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
        }
        <div>
          <p className="text-sm font-medium">{PROGRAMA_LABELS[programa]}</p>
          <p className="text-xs text-muted-foreground">{PROGRAMA_DESCRIPTIONS[programa]}</p>
          {registro?.fecha_inicio && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              Desde {format(new Date(registro.fecha_inicio + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={activo ? 'default' : 'outline'} className="text-xs">
          {activo ? 'Activo' : 'Inactivo'}
        </Badge>
        {canEdit && (
          <Button
            size="sm"
            variant={activo ? 'outline' : 'default'}
            disabled={loading}
            onClick={handleToggle}
          >
            {loading ? '...' : activo ? 'Desactivar' : 'Activar'}
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/empresas/ProgramaRow.tsx
git commit -m "feat(ui): componente ProgramaRow para gestión de programas por empresa"
```

---

## Task 3: Componente EmpresaProgramasTab

**Files:**
- Create: `src/components/empresas/EmpresaProgramasTab.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// src/components/empresas/EmpresaProgramasTab.tsx
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import { ProgramaRow } from './ProgramaRow';

const PROGRAMAS_ORDEN = ['immex', 'prosec', 'padron', 'cert_iva_ieps', 'general'] as const;

interface EmpresaPrograma {
  id: string;
  programa: string;
  activo: boolean;
  fecha_inicio: string | null;
}

interface EmpresaProgramasTabProps {
  empresaId: string;
  canEdit: boolean;
}

export function EmpresaProgramasTab({ empresaId, canEdit }: EmpresaProgramasTabProps) {
  const [registros, setRegistros] = useState<EmpresaPrograma[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('empresa_programas')
      .select('id, programa, activo, fecha_inicio')
      .eq('empresa_id', empresaId);
    setRegistros(data || []);
    setLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  const getRegistro = (programa: string) =>
    registros.find(r => r.programa === programa) ?? null;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> Programas Activos
        </CardTitle>
        <CardDescription className="text-xs">
          Al activar un programa se generan automáticamente las obligaciones del año en el calendario.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <div>
            {PROGRAMAS_ORDEN.map(programa => (
              <ProgramaRow
                key={programa}
                programa={programa}
                registro={getRegistro(programa)}
                empresaId={empresaId}
                canEdit={canEdit}
                onUpdate={fetchRegistros}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/empresas/EmpresaProgramasTab.tsx
git commit -m "feat(ui): tab EmpresaProgramasTab con lista de programas y activación automática"
```

---

## Task 4: Agregar tab "Programas" en EmpresaDetail

**Files:**
- Modify: `src/pages/EmpresaDetail.tsx`

- [ ] **Step 1: Agregar import**

En `src/pages/EmpresaDetail.tsx`, localizar el bloque de imports de componentes de empresas y agregar:

```tsx
import { EmpresaProgramasTab } from '@/components/empresas/EmpresaProgramasTab';
```

- [ ] **Step 2: Agregar el trigger del tab en TabsList**

Localizar el bloque `<TabsList>` que tiene los triggers existentes (obligaciones, historial, etc.) y agregar:

```tsx
<TabsTrigger value="programas" className="gap-1.5">
  <Layers className="w-4 h-4 hidden sm:block" /> Programas
</TabsTrigger>
```

Asegurarse de que `Layers` esté importado de `lucide-react` junto con los otros iconos.

- [ ] **Step 3: Agregar el TabsContent**

Justo después del último `</TabsContent>` existente y antes del cierre de `</Tabs>`, agregar:

```tsx
<TabsContent value="programas" className="space-y-5">
  <EmpresaProgramasTab empresaId={id!} canEdit={canEdit} />
</TabsContent>
```

- [ ] **Step 4: Verificar en navegador**

Abrir una empresa en `/empresas/:id`. Debe aparecer el tab "Programas" con la lista de los 5 programas y sus estados. Los botones deben funcionar (activar/desactivar).

- [ ] **Step 5: Commit**

```bash
git add src/pages/EmpresaDetail.tsx
git commit -m "feat(ui): agregar tab Programas en EmpresaDetail"
```

---

## Task 5: Corregir queries del calendario

**Files:**
- Modify: `src/components/dashboard/DashboardCalendar.tsx`

- [ ] **Step 1: Mover filtro de obligaciones a la query SQL**

Localizar la query de `obligaciones` en `fetchEvents` (alrededor de línea 144) y agregar el filtro condicional antes de `.then()` o del `await`:

```tsx
// Reemplazar:
const { data: obs } = await supabase
  .from('obligaciones')
  .select('id, nombre, empresa_id, categoria, fecha_vencimiento, catalogo_id, estado, empresas(razon_social)')
  .eq('activa', true)
  .gte('fecha_vencimiento', startStr)
  .lte('fecha_vencimiento', endStr);

// Por:
let obsQuery = supabase
  .from('obligaciones')
  .select('id, nombre, empresa_id, categoria, fecha_vencimiento, catalogo_id, estado, empresas(razon_social)')
  .eq('activa', true)
  .gte('fecha_vencimiento', startStr)
  .lte('fecha_vencimiento', endStr);
if (filterEmpresaId && filterEmpresaId !== 'all') {
  obsQuery = obsQuery.eq('empresa_id', filterEmpresaId);
}
const { data: obs } = await obsQuery;
```

- [ ] **Step 2: Mover filtro de tareas a la query SQL**

Localizar la query de `tareas` (alrededor de línea 166) y aplicar el mismo patrón:

```tsx
// Reemplazar:
const { data: tareas } = await supabase
  .from('tareas')
  .select('id, titulo, prioridad, estado, fecha_vencimiento, empresa_id, empresas(razon_social)')
  .not('estado', 'in', '(completada,cancelada)')
  .gte('fecha_vencimiento', startStr)
  .lte('fecha_vencimiento', endStr);

// Por:
let tareasQuery = supabase
  .from('tareas')
  .select('id, titulo, prioridad, estado, fecha_vencimiento, empresa_id, empresas(razon_social)')
  .not('estado', 'in', '(completada,cancelada)')
  .gte('fecha_vencimiento', startStr)
  .lte('fecha_vencimiento', endStr);
if (filterEmpresaId && filterEmpresaId !== 'all') {
  tareasQuery = tareasQuery.eq('empresa_id', filterEmpresaId);
}
const { data: tareas } = await tareasQuery;
```

- [ ] **Step 3: Mover filtro de documentos a la query SQL**

Localizar la query de `documentos` y aplicar el mismo patrón:

```tsx
let docsQuery = supabase
  .from('documentos')
  .select('id, nombre, empresa_id, fecha_vencimiento, empresas(razon_social)')
  .not('fecha_vencimiento', 'is', null)
  .gte('fecha_vencimiento', startStr)
  .lte('fecha_vencimiento', endStr);
if (filterEmpresaId && filterEmpresaId !== 'all') {
  docsQuery = docsQuery.eq('empresa_id', filterEmpresaId);
}
const { data: docs } = await docsQuery;
```

- [ ] **Step 4: Eliminar bloque `programa` como tipo de evento separado**

Localizar y eliminar todo el bloque que hace `supabase.from('empresas').select(...)` y construye eventos de tipo `programa` (las fechas `immex_fecha_fin`, `prosec_fecha_fin`, etc.). Ese bloque inicia con `const { data: empresas } = await supabase` y termina después del forEach de `progs`.

Las renovaciones IMMEX/PROSEC ahora son obligaciones regulares en el calendario — no necesitan bloque separado.

- [ ] **Step 5: Eliminar tipo 'programa' de los types y constantes**

```tsx
// Cambiar:
type EventType = 'tarea' | 'documento' | 'programa' | 'obligacion';

// Por:
type EventType = 'tarea' | 'documento' | 'obligacion';
```

Eliminar también las entradas `programa` de `TYPE_LABELS`, `TYPE_HELP`, `TYPE_COLORS`, `EVENT_ICONS` y `eventColor`.

- [ ] **Step 6: Eliminar el filtro client-side `byEmpresa`**

Localizar y eliminar estas líneas:

```tsx
const byEmpresa = (!filterEmpresaId || filterEmpresaId === 'all')
  ? allEvents
  : allEvents.filter(e => e.extendedProps.empresaId === filterEmpresaId);
setEvents(byEmpresa);
```

Reemplazar por:

```tsx
setEvents(allEvents);
```

- [ ] **Step 7: Actualizar `activeTypes` default (eliminar 'programa')**

```tsx
// Cambiar:
const [activeTypes, setActiveTypes] = useState<Set<EventType>>(
  role === 'cliente'
    ? new Set(['obligacion', 'documento', 'programa'])
    : new Set(['obligacion', 'tarea', 'documento', 'programa'])
);

// Por:
const [activeTypes, setActiveTypes] = useState<Set<EventType>>(
  role === 'cliente'
    ? new Set<EventType>(['obligacion', 'documento'])
    : new Set<EventType>(['obligacion', 'tarea', 'documento'])
);
```

- [ ] **Step 8: Actualizar el texto descriptivo del calendario**

Localizar el texto `"Obligaciones, tareas y programas · click para ver detalle"` y cambiar a `"Obligaciones, tareas y documentos · click para ver detalle"`.

- [ ] **Step 9: Verificar en navegador**

Abrir `/calendario`. Filtrar por empresa — solo deben aparecer eventos de esa empresa. El filtro de tipo "Programas" ya no debe existir.

- [ ] **Step 10: Commit**

```bash
git add src/components/dashboard/DashboardCalendar.tsx
git commit -m "fix(calendario): filtro empresa en query SQL, eliminar tipo programa como evento separado"
```

---

## Task 6: Limpiar referencias OEA en el frontend

**Files:**
- Modify: `src/lib/obligaciones.ts`

- [ ] **Step 1: Limpiar `programaToCategoria`**

Localizar la función `programaToCategoria` en `src/lib/obligaciones.ts` y eliminar la referencia a `oea`:

```ts
// Cambiar:
export function programaToCategoria(programa: string): string {
  const p = (programa || '').toLowerCase().trim();
  if (p.includes('immex'))                          return 'immex';
  if (p.includes('prosec'))                         return 'prosec';
  if (p.includes('padrón') || p.includes('padron')) return 'padron';
  if (p.includes('iva') || p.includes('ieps') ||
      p.includes('cert') || p.includes('oea'))      return 'cert_iva_ieps';
  return 'general';
}

// Por:
export function programaToCategoria(programa: string): string {
  const p = (programa || '').toLowerCase().trim();
  if (p.includes('immex'))                          return 'immex';
  if (p.includes('prosec'))                         return 'prosec';
  if (p.includes('padrón') || p.includes('padron')) return 'padron';
  if (p.includes('iva') || p.includes('ieps') ||
      p.includes('cert'))                           return 'cert_iva_ieps';
  return 'general';
}
```

- [ ] **Step 2: Buscar otras referencias OEA en el frontend**

```bash
grep -rn 'oea\|OEA' src/ --include='*.ts' --include='*.tsx' | grep -v node_modules
```

Revisar cada resultado y eliminar/actualizar las referencias que queden (labels, colores, selects).

- [ ] **Step 3: Commit**

```bash
git add src/lib/obligaciones.ts
git commit -m "fix: eliminar referencias OEA del frontend"
```

---

## Task 7: Actualizar OnboardingEmpresaWizard

**Files:**
- Modify: `src/components/empresas/OnboardingEmpresaWizard.tsx`

- [ ] **Step 1: Localizar el paso de programas en el wizard**

```bash
grep -n 'programa\|immex\|prosec\|padron\|cert_iva\|oea' src/components/empresas/OnboardingEmpresaWizard.tsx | head -40
```

Identificar dónde se capturan los programas seleccionados y dónde se insertan en la base de datos.

- [ ] **Step 2: Leer el wizard completo**

```bash
cat src/components/empresas/OnboardingEmpresaWizard.tsx
```

- [ ] **Step 3: Modificar el submit del wizard**

Localizar la función que se ejecuta al finalizar el onboarding (generalmente `handleSubmit` o `handleFinish`). Después de crear la empresa, agregar el insert en `empresa_programas` para cada programa seleccionado:

```tsx
// Después de crear la empresa (obtener empresaId del resultado del INSERT):
const programasSeleccionados: string[] = []; // llenar con los programas que marcó el usuario

if (programasSeleccionados.length > 0) {
  await supabase
    .from('empresa_programas')
    .insert(
      programasSeleccionados.map(programa => ({
        empresa_id: empresaId,
        programa,
        activo: true,
        fecha_inicio: null, // el usuario puede actualizar esto después en el tab Programas
      }))
    );
  // El trigger en DB genera las obligaciones automáticamente
}
```

- [ ] **Step 4: Eliminar OEA de las opciones del wizard**

Si hay un checkbox o lista de programas que incluye "OEA", eliminarlo.

- [ ] **Step 5: Verificar en navegador**

Crear una empresa nueva con el wizard seleccionando IMMEX y PROSEC. Al terminar, ir a `/empresas/:id` → tab "Programas" — ambos deben aparecer activos. Ir a `/calendario` — deben aparecer las obligaciones generadas.

- [ ] **Step 6: Commit**

```bash
git add src/components/empresas/OnboardingEmpresaWizard.tsx
git commit -m "feat(onboarding): insertar en empresa_programas al crear empresa"
```

---

## Task 8: Verificación final

- [ ] **Step 1: Build sin errores TypeScript**

```bash
npm run build
```

Resultado esperado: sin errores de tipo. Si hay errores por el tipo `'programa'` eliminado de `EventType`, revisar todos los lugares donde se usaba ese literal.

- [ ] **Step 2: Verificar flujo completo en navegador**

1. Ir a una empresa existente → tab "Programas" → activar IMMEX
2. Ir a `/calendario` → debe aparecer "Reporte Mensual de Producción IMMEX" para cada mes del año actual
3. Filtrar por esa empresa → solo deben verse sus obligaciones
4. Filtrar por otra empresa → no deben verse obligaciones de la primera

- [ ] **Step 3: Verificar corrección de fechas IMMEX/PROSEC**

En Supabase SQL editor:

```sql
SELECT nombre, frecuencia_tipo, mes_vencimiento, dia_vencimiento, usar_ultimo_dia_habil
FROM obligaciones_catalogo
WHERE programa IN ('immex', 'prosec')
  AND nombre ILIKE '%Renovación%';
```

Resultado esperado:
- IMMEX: `mes_vencimiento=5`, `dia_vencimiento=NULL`, `usar_ultimo_dia_habil=true`
- PROSEC: `mes_vencimiento=4`, `dia_vencimiento=NULL`, `usar_ultimo_dia_habil=true`

- [ ] **Step 4: Verificar que OEA no existe**

```sql
SELECT COUNT(*) FROM obligaciones_catalogo WHERE programa = 'oea';
-- Debe retornar 0
```

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "chore: verificación final rediseño calendario compliance"
```

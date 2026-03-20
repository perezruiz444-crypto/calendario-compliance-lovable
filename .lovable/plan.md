

# Plan: Asignar multiples responsables a una obligacion

## Problema actual
El campo `responsable_id` en la tabla `obligaciones` es un solo UUID -- solo permite 1 persona asignada. Para notificar a multiples personas del equipo, necesitamos una relacion muchos-a-muchos.

## Solucion

### 1. Nueva tabla `obligacion_responsables`

```sql
CREATE TABLE public.obligacion_responsables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligacion_id uuid NOT NULL REFERENCES obligaciones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'cliente',
  created_at timestamptz DEFAULT now(),
  UNIQUE(obligacion_id, user_id)
);
ALTER TABLE public.obligacion_responsables ENABLE ROW LEVEL SECURITY;
-- RLS: mismas reglas que obligaciones (admins, consultores, clientes de la empresa)
```

Los campos `responsable_id` y `responsable_tipo` existentes en `obligaciones` se mantienen por compatibilidad pero dejan de usarse en el formulario.

### 2. UI: Multi-select con checkboxes en el formulario

Reemplazar el Select unico de responsable por una lista de checkboxes agrupada (Consultores / Clientes). El usuario marca a todas las personas que quiere asignar.

```text
📅 Fecha de Vencimiento: [2026-04-15]

👥 Responsables:
  Consultores
  ☑ Ana Garcia
  ☐ Carlos Lopez
  Clientes
  ☑ Maria Rodriguez
  ☑ Pedro Sanchez
```

### 3. Cambios en codigo

| Archivo | Cambio |
|---------|--------|
| DB migration | Crear tabla `obligacion_responsables` con RLS |
| `ObligacionFormDialog.tsx` | Cambiar Select unico por lista de checkboxes. Form data pasa `responsable_ids: string[]` en lugar de `responsable_id: string` |
| `ObligacionesManager.tsx` | Al crear/editar, insertar/sincronizar registros en `obligacion_responsables`. Al consultar, hacer join para mostrar nombres |
| `ObligacionesActivasTab.tsx` | Mostrar multiples responsables (avatares/badges) en lugar de uno solo |

### 4. Compatibilidad con notificaciones

El sistema de notificaciones y recordatorios podra consultar `obligacion_responsables` para enviar alertas a todos los asignados en lugar de solo al `responsable_id`.


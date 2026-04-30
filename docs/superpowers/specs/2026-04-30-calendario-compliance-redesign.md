# Spec: Rediseño del Calendario de Cumplimiento

**Fecha:** 2026-04-30  
**Estado:** Aprobado  
**Alcance:** Sprint calendario — lógica de generación automática, correcciones al catálogo, eliminación OEA

---

## Problema

El calendario de cumplimiento no es funcional de forma autónoma porque:

1. No existe una fuente de verdad de qué programas tiene activos cada empresa — los programas están como campos sueltos en `empresas`.
2. La generación de obligaciones ocurre solo cuando alguien activa manualmente una obligación desde el catálogo, y no se regenera en años nuevos.
3. El catálogo tiene errores: `Renovación Anual IMMEX` y `Renovación Anual PROSEC` tienen fechas incorrectas; OEA no aplica y contamina el sistema.
4. El filtro por empresa en el calendario se aplica en el cliente JS después de traer todos los datos, no en la query SQL.

---

## Flujo objetivo

1. El admin configura los programas activos de una empresa (nueva tabla `empresa_programas`)
2. Un trigger en DB genera automáticamente todas las obligaciones del año para esa empresa
3. Un cron anual (1 de enero) genera el año siguiente para todas las empresas activas
4. El calendario consume esas obligaciones materializadas sin lógica adicional en el frontend

---

## Sección 1: Base de datos

### Nueva tabla `empresa_programas`

```sql
CREATE TABLE empresa_programas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  programa     text NOT NULL CHECK (programa IN ('immex','prosec','padron','cert_iva_ieps','general')),
  activo       boolean NOT NULL DEFAULT true,
  fecha_inicio date,   -- fecha de autorización (informativo)
  created_at   timestamptz DEFAULT now(),
  UNIQUE (empresa_id, programa)
);
```

Esta tabla es la **fuente de verdad** de qué programas tiene cada empresa. Reemplaza funcionalmente los campos `immex_fecha_autorizacion`, `prosec_fecha_autorizacion`, `cert_iva_ieps_fecha_autorizacion` en `empresas` (esos campos se mantienen por compatibilidad pero dejan de ser la fuente principal).

### Trigger de generación automática

Al hacer `INSERT` o `UPDATE activo = true` en `empresa_programas`, un trigger llama a `generar_obligaciones_por_programa(empresa_id, programa, año)` que:

1. Toma todos los ítems de `obligaciones_catalogo WHERE programa = NEW.programa AND activo = true`
2. Para cada ítem, genera las ocurrencias del año actual con `ON CONFLICT DO NOTHING`
3. Si el mes actual es diciembre, también genera el año siguiente

### Función `generar_obligaciones_por_programa`

Extiende la lógica existente de `generar_ocurrencias_obligacion` para operar a nivel programa completo (no por obligación individual). Reutiliza la misma lógica de frecuencias (MENSUAL, TRIMESTRAL, SEMESTRAL, ANUAL, SEMANAL, ULTIMO_DIA_MES).

### Flag `usar_ultimo_dia_habil` en catálogo

```sql
ALTER TABLE obligaciones_catalogo
  ADD COLUMN IF NOT EXISTS usar_ultimo_dia_habil boolean NOT NULL DEFAULT false;
```

Cuando está activo, la función de generación calcula el último día hábil del mes (excluyendo sábado y domingo) en lugar de usar `dia_vencimiento` fijo:

```sql
v_fecha := (make_date(v_year, v_mes, 1) + INTERVAL '1 month - 1 day')::date;
WHILE EXTRACT(ISODOW FROM v_fecha) IN (6, 7) LOOP
  v_fecha := v_fecha - 1;
END LOOP;
```

### Cron anual (pg_cron)

```sql
SELECT cron.schedule(
  'generar-obligaciones-anual',
  '0 6 1 1 *',
  $$SELECT generar_obligaciones_todos_programas_activos(EXTRACT(YEAR FROM NOW())::int + 1)$$
);
```

Se ejecuta el 1 de enero a las 06:00 UTC. Genera todas las obligaciones del año entrante para todas las empresas con programas activos.

---

## Sección 2: Correcciones al catálogo

### Renovación Anual IMMEX

```sql
UPDATE obligaciones_catalogo
SET
  frecuencia_tipo        = 'ANUAL',
  mes_vencimiento        = 5,
  dia_vencimiento        = NULL,
  usar_ultimo_dia_habil  = true,
  presentacion           = 'anual',
  notas_internas         = 'Período de presentación: 1 abril – último día hábil mayo (VUCEM). Empresas con IMMEX+PROSEC: cumplir antes del 30 abril. Suspensión si no se presenta en mayo; cancelación si no se subsana antes del último día hábil de agosto.'
WHERE programa = 'immex' AND nombre = 'Renovación Anual Programa IMMEX';
```

### Renovación Anual PROSEC

```sql
UPDATE obligaciones_catalogo
SET
  frecuencia_tipo        = 'ANUAL',
  mes_vencimiento        = 4,
  dia_vencimiento        = NULL,
  usar_ultimo_dia_habil  = true,
  presentacion           = 'anual',
  notas_internas         = 'Fecha límite: último día hábil de abril (VUCEM). Suspensión automática el 1 de mayo si no se presenta. Cancelación definitiva el 1 de julio si no se subsana.'
WHERE programa = 'prosec' AND nombre = 'Renovación Anual Programa PROSEC';
```

### Eliminación OEA

```sql
-- Borrar obligaciones OEA sin cumplimiento registrado
DELETE FROM obligaciones
WHERE catalogo_id IN (SELECT id FROM obligaciones_catalogo WHERE programa = 'oea')
  AND NOT EXISTS (
    SELECT 1 FROM obligacion_cumplimientos oc WHERE oc.obligacion_id = obligaciones.id
  );

-- Borrar catálogo OEA
DELETE FROM obligaciones_catalogo WHERE programa = 'oea';
```

### Cert. IVA/IEPS

Se mantiene como está con `frecuencia_tipo = 'ANUAL'`. Se documenta en `notas_internas` que la vigencia varía por nivel de certificación (A/AA/AAA). No se modifica en este sprint.

---

## Sección 3: UI

### Tab "Programas" en EmpresaDetail

Nueva pestaña en la pantalla de empresa que muestra y gestiona `empresa_programas`:

```
┌─────────────────────────────────────────────────────┐
│  Programas Activos                   [+ Agregar]    │
├─────────────────────────────────────────────────────┤
│  ✓ IMMEX          Desde: 15/03/2021    [Desactivar] │
│  ✓ PROSEC         Desde: 01/06/2022    [Desactivar] │
│  ✗ Cert. IVA/IEPS  —                  [Activar]    │
│  ✗ Padrón          —                  [Activar]    │
└─────────────────────────────────────────────────────┘
```

**Al activar un programa:**
- INSERT en `empresa_programas`
- Trigger genera obligaciones automáticamente
- Toast: "Programa activado — se generaron X obligaciones para 2026"

**Al desactivar:**
- UPDATE `activo = false` en `empresa_programas`
- Obligaciones existentes se conservan (pueden tener cumplimientos)
- No se generan nuevas en años futuros

### Onboarding (wizard nueva empresa)

El paso de programas inserta directamente en `empresa_programas`. Al finalizar el wizard, el calendario ya tiene datos sin paso adicional.

### Calendario — correcciones de query

- Filtro por empresa se aplica **en la query SQL**, no en el cliente:
  ```ts
  if (filterEmpresaId) query = query.eq('empresa_id', filterEmpresaId)
  ```
- Tareas también filtradas por `empresa_id` en query cuando hay filtro activo
- Eventos tipo "programa" eliminados como categoría separada — las renovaciones IMMEX/PROSEC son ya obligaciones regulares en el calendario
- Eliminar referencias a OEA en labels, colores y filtros del frontend

---

## Sección 4: Casos borde

| Situación | Comportamiento |
|---|---|
| Empresa se da de alta en octubre | Trigger genera obligaciones del año actual (pasadas aparecen como vencidas) + año siguiente |
| Empresa desactiva programa en marzo | Obligaciones del año permanecen; no se crean nuevas el año siguiente |
| Obligación ya completada | `ON CONFLICT DO NOTHING` no la modifica |
| Catálogo se modifica (cambia día/mes) | Obligaciones ya materializadas no cambian; solo afecta años futuros |
| Empresa tiene IMMEX + PROSEC | Ambos programas en `empresa_programas`; cada uno genera sus obligaciones independientemente |

---

## Fuera de alcance (este sprint)

- Días festivos oficiales en el cálculo de "último día hábil" (solo se excluyen sábado y domingo)
- Renovación Cert. IVA/IEPS con vigencia variable por nivel A/AA/AAA
- Notificaciones automáticas por email al acercarse fechas de vencimiento

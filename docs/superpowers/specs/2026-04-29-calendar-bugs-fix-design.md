# Fix: Bugs de Recurrencia y Panel de Salud del Catálogo

**Fecha:** 2026-04-29  
**Alcance:** 1 migración SQL + 1 tab nuevo en CatalogoAdmin.tsx

---

## Contexto

El motor de recurrencia funciona correctamente para empresas con catálogo conectado. Se encontraron 3 bugs con datos reales tras validación contra Supabase.

---

## Bug 1 — Duplicados por mes (Elastomer · "Ajuste anual inventarios")

**Problema:** Hay 13 ocurrencias en vez de 12. Dos filas para mayo con fechas distintas (día 29 y día 31). El `ON CONFLICT` actual es por `(empresa_id, catalogo_id, fecha_vencimiento)` exacta, por lo que fechas distintas en el mismo mes no se deduplicaron.

**Fix:**
1. Dedup: `DELETE` conservando la fila con cumplimiento (o la más reciente si no hay cumplimiento), usando `ROW_NUMBER() OVER (PARTITION BY empresa_id, catalogo_id, date_trunc('month', fecha_vencimiento))`.
2. Constraint: `CREATE UNIQUE INDEX` sobre `(empresa_id, catalogo_id, date_trunc('month', fecha_vencimiento)) WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL` para prevenir futuros duplicados del mismo mes.

---

## Bug 2 — Catálogo mal configurado (frecuencia vs. presentación)

**Problema:** Catálogos con `presentacion` que dice "último día hábil de mayo" (implica ANUAL) pero `frecuencia_tipo = 'ULTIMO_DIA_MES'` (genera 12 ocurrencias). El cliente ve ruido en el calendario.

**Fix (dos partes):**

**A) Corrección de datos (migración):**
- `UPDATE obligaciones_catalogo SET frecuencia_tipo = 'ANUAL', mes_vencimiento = <mes detectado>` donde `frecuencia_tipo = 'ULTIMO_DIA_MES'` y `presentacion` contiene "de <mes>".
- Después del update, `DELETE` de ocurrencias extra (meses que no corresponden al `mes_vencimiento`) que no tengan cumplimiento registrado.

**B) Validación en UI (CatalogoAdmin):**
- Al guardar un catálogo, si `frecuencia_tipo = 'ULTIMO_DIA_MES'` y `presentacion` contiene un mes específico ("de mayo", "de abril", etc.), mostrar warning: _"El texto de presentación menciona un mes específico. ¿Quieres cambiar la frecuencia a Anual?"_
- No bloquea el guardado — es un aviso que el admin puede ignorar.

---

## Bug 3 — Obligaciones huérfanas (sin catalogo_id)

**Decisión:** No vincular automáticamente. Enfocarse en prevenir nuevas huérfanas. Las existentes se quedan como one-shot (son legítimamente eventuales o fueron creadas antes del catálogo).

---

## Bug 4 — Panel "Salud del Catálogo"

**Ubicación:** Tab nuevo "Salud" en `src/components/configuraciones/CatalogoAdmin.tsx`, junto a los tabs existentes.

**Audiencia:** Admin interno + supervisores del cliente. Lenguaje amigable, sin jerga técnica.

### Bloque 1 — Resumen de cobertura

Tabla con columnas: Catálogo · Empresas activas · Ocurrencias 2026 · Estado (✅ / ⚠️).

Fuente: query `COUNT` sobre `obligaciones` agrupado por `catalogo_id` + año actual, LEFT JOIN con `obligaciones_catalogo`.

### Bloque 2 — Banderas rojas

Query SQL con lógica CASE detecta automáticamente:
- `frecuencia_tipo = 'ULTIMO_DIA_MES'` + `presentacion` contiene un mes → "Revisa este catálogo: genera fechas todo el año pero el texto dice que vence en un mes específico."
- `activo = true` + 0 empresas activas → "Este catálogo está activo pero ninguna empresa lo usa."
- `frecuencia_tipo IS NULL` + tiene obligaciones → "Este catálogo no tiene recurrencia configurada — sus obligaciones solo aparecen una vez."

Lenguaje: advertencias, no errores. Ícono ⚠️ naranja, no rojo.

### Bloque 3 — Acción rápida

Botón "Revisar configuración" por cada bandera roja. Abre el form de edición del catálogo pre-llenado. No hace cambios automáticos.

---

## Arquitectura

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `supabase/migrations/<timestamp>_fix_recurrencia_bugs.sql` | Bug 1 dedup + constraint, Bug 2 corrección de datos |
| `src/components/configuraciones/CatalogoAdmin.tsx` | Warning en save (Bug 2 UI) + Tab Salud (Bug 4) |

### No se crean archivos nuevos de UI

El tab de Salud vive dentro de `CatalogoAdmin.tsx`. La query de diagnóstico se ejecuta desde el mismo componente vía `supabase.rpc` o query directa con `.select()`.

---

## Orden de ejecución de la migración

1. Dedup de duplicados (Bug 1) — primero, antes de crear el constraint
2. Crear unique index por mes (Bug 1)
3. Corregir frecuencia_tipo en catálogos mal configurados (Bug 2)
4. Borrar ocurrencias extra sin cumplimiento (Bug 2)

Este orden evita que el constraint bloquee el dedup.

---

## Criterios de éxito

- Elastomer: exactamente 12 ocurrencias para "Ajuste anual inventarios" (una por mes)
- El catálogo corregido muestra `frecuencia_tipo = 'ANUAL'` con `mes_vencimiento` correcto
- Intentar insertar dos fechas en el mismo mes para el mismo `empresa_id + catalogo_id` falla con constraint error
- Tab "Salud" visible en CatalogoAdmin, muestra cobertura y banderas rojas sin errores de consola
- Warning al guardar catálogo con `ULTIMO_DIA_MES` + mes específico en presentación

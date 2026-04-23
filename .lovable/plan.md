

# Plan: Hacer el Calendario realmente útil para empresas

## Diagnóstico

**Por qué hoy no funciona:**

1. **El motor existe pero está vacío.** Las 3 columnas (`frecuencia_tipo`, `dia_vencimiento`, `mes_vencimiento`) están `NULL` en TODO el catálogo. El trigger nunca dispara → cada activación genera **1 sola fila** en vez de 12. Por eso "no se repiten las obligaciones".
2. **El modal de activación pide fecha manual.** Aunque el catálogo defina "MENSUAL día 17", el consultor tiene que escoger fecha a mano, lo cual rompe el motor matemático y es contraintuitivo.
3. **Catálogo legacy con texto libre.** Casos como `presentacion: "Revisión periódica mensual (21 de cada mes)"` no se pueden parsear automáticamente — alguien tiene que migrarlos a la estructura matemática.
4. **El calendario es "para todo el despacho", no "para mi empresa".** Mezcla obligaciones + tareas + documentos + programas sin filtros visibles. Un cliente abre y ve un caos.

## Solución en 4 movimientos

### 1. Backfill del catálogo (data migration)
Mapear los catálogos existentes a `frecuencia_tipo` + `dia_vencimiento` + `mes_vencimiento` en base al texto de `presentacion` (heurística + reglas comunes):
- "Mensual" / "mensualmente" → `MENSUAL`, día 17 (regla SAT genérica, editable)
- "Bimestral" → `BIMESTRAL`
- "Trimestral" → `TRIMESTRAL`
- "Semestral" → `SEMESTRAL`
- "Anual" / "Renovación Anual" → `ANUAL` con mes razonable (ej. abril para reportes anuales)
- "Único" / "En todo momento" / "Al rectificar" → `EVENTUAL`

Después del backfill, lanzar un script puntual (función SQL one-shot) que **expanda las obligaciones ya activas** que solo tienen 1 fila — generando las ocurrencias faltantes del año actual usando la nueva regla del catálogo.

### 2. Rediseñar `ActivarObligacionDialog`
- Si el catálogo tiene `frecuencia_tipo` definido → **ocultar el selector de fecha** y mostrar un preview: *"Se generarán automáticamente N ocurrencias: 17 de enero, 17 de febrero, 17 de marzo…"* con las fechas calculadas del año en curso.
- Si el catálogo es `EVENTUAL` o sin frecuencia → mostrar el selector de fecha manual (comportamiento actual).
- Mensaje del toast más claro: *"Activada • Generadas 12 fechas automáticamente para 2026"*.

### 3. Calendario centrado en la empresa
- **`Calendario.tsx`** y **`DashboardCalendar.tsx`**: agregar una **barra de filtros prominente** arriba con chips: *Obligaciones / Tareas / Documentos / Programas* (toggle on/off, default todo activo). El usuario decide qué ver.
- Agregar un **selector de empresa visible en el header del calendario** (no solo en el sidebar global) — para admins/consultores. Para clientes ya está fijo a su empresa.
- Agregar **vista "Próximas 30 días"** como tab adicional al lado de Mes/Agenda — lista plana priorizada por fecha, ideal para clientes que solo quieren saber "¿qué viene?".
- Etiqueta **"Recurrente"** en eventos generados por el motor + tooltip *"Mensual día 17 — esta es la ocurrencia de marzo"*.

### 4. Mini-calendario en el portal del cliente
En `MiEmpresa.tsx`, agregar un componente **`MisVencimientos.tsx`** arriba del todo:
- Lista vertical limpia: las próximas 5–10 obligaciones de la empresa, agrupadas por mes.
- Cada item: nombre + fecha + checkbox para marcar cumplimiento del periodo + botón "subir evidencia".
- Cero ruido — sin tareas operativas, sin documentos, solo **lo que el cliente debe presentar**.

## Archivos a tocar

1. **Migración SQL** — backfill de `obligaciones_catalogo` (UPDATE masivo con CASE basado en texto de `presentacion`) + función one-shot `expand_existing_obligaciones()` que genera ocurrencias retroactivas para obligaciones ya activas.
2. **Editar** `src/components/obligaciones/ActivarObligacionDialog.tsx` — preview de fechas auto-calculadas, ocultar selector cuando hay frecuencia.
3. **Editar** `src/components/dashboard/DashboardCalendar.tsx` — chips de filtro por tipo, badge "Recurrente", vista "Próximos 30 días".
4. **Editar** `src/pages/Calendario.tsx` — header con selector de empresa + leyenda integrada (no abajo).
5. **Crear** `src/components/empresas/MisVencimientos.tsx` — lista limpia para clientes.
6. **Editar** `src/pages/MiEmpresa.tsx` — montar `MisVencimientos` arriba.

## Lo que NO voy a tocar

- El trigger Postgres ya está bien — funciona si el catálogo está bien poblado.
- Las tareas operativas (módulo `Tareas`) — siguen siendo separadas.
- El sistema de cumplimiento por periodo — se reutiliza tal cual.

## Notas

- **Backfill conservador**: para casos ambiguos del catálogo legacy (ej. *"En caso de fusión"*) se marca `EVENTUAL` y se deja la fecha manual como hoy. Nadie pierde datos.
- **Idempotencia**: el `ON CONFLICT DO NOTHING` del trigger garantiza que si re-ejecutas el expand, no duplica.
- **Día sugerido**: cuando el texto dice "mensual" sin día, uso día 17 (estándar SAT para pagos provisionales). El admin puede editarlo después en `CatalogoAdmin`.


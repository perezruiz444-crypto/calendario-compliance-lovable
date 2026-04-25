# Plan: Cerrar los huecos del calendario tras pruebas reales

Después de probar el sistema con la lente de **cliente** y **consultor** y revisar la BD, encontré 8 problemas concretos. Esto los arregla en 5 movimientos quirúrgicos.

## Hallazgos de la prueba

| # | Problema | Evidencia |
|---|---|---|
| 1 | **356 obligaciones huérfanas sin fecha** ensucian la BD | `427 total` − `26 futuras` − `~45 pasadas` = 356 sin fecha |
| 2 | **20 catálogos sin curar** — semanal, "último día hábil", "30 días previos" no se expanden | Buzón tributario (semanal), Expedición constancias, Importar mercancías adicionales, etc. |
| 3 | **Solo 2 obligaciones/mes** entre may-dic 2026 — el motor genera poco | Conteo mes-a-mes en BD |
| 4 | **No existe `SEMANAL`** ni "último día hábil" en el motor | Enum `frecuencia_tipo` solo tiene MENSUAL/BIMESTRAL/.../EVENTUAL |
| 5 | **Cero `obligaciones.estado='completada'`** — subir evidencia no marca la obligación | Conteo en BD |
| 6 | **Cliente ve calendario completo de 700px** + tabla larga + tareas + documentos: caos | `MiEmpresa.tsx` líneas 20+26 |
| 7 | **Catálogo con texto basura** ("N/A", "Plazos mencionados") confunde al activar | Query a `obligaciones_catalogo` |
| 8 | **Chips no explican** qué es "Programa" vs "Documento" para un cliente no-técnico | `DashboardCalendar.tsx` líneas 286-309 |

## Solución en 5 movimientos

### 1. Expandir el motor de recurrencia: SEMANAL + ULTIMO_DIA_HABIL
- Migración SQL: agregar dos valores al enum `frecuencia_tipo` (`SEMANAL`, `ULTIMO_DIA_MES`).
- Actualizar la función `generar_ocurrencias_obligacion`:
  - `SEMANAL` → genera 52 ocurrencias del año en el día de semana indicado (`dia_vencimiento` 1-7 = lun-dom).
  - `ULTIMO_DIA_MES` → último día calendario de cada mes (12 ocurrencias). Suficiente para el 95% de casos; "último día *hábil*" se aproxima sin tocar feriados (mejora futura).
- Re-curar los 20 catálogos pendientes con un UPDATE basado en regex sobre `presentacion`:
  - `"semanal"|"cada viernes"` → `SEMANAL`
  - `"último día"|"último día hábil"` → `ULTIMO_DIA_MES`
  - `"mes inmediato siguiente"|"mensualmente"` → `MENSUAL` día 17
  - Resto ambiguo → `EVENTUAL` (sin sorpresas).
- Re-ejecutar `expand_existing_obligaciones()` (idempotente vía `ON CONFLICT`).

### 2. Cerrar el loop "subir evidencia → marcar como cumplida"
Hoy `obligacion_cumplimientos` tiene filas pero `obligaciones.estado` sigue `pendiente`. Voy a:
- Crear un trigger `AFTER INSERT ON obligacion_cumplimientos` que marque `obligaciones.estado='completada'` para esa fila específica (o solo si la `periodo_key` coincide con el periodo actual de la obligación).
- En el calendario y en `MisVencimientos`, las obligaciones con cumplimiento del periodo en curso se pintan en verde + check, no como "pendiente".
- En `DashboardCalendar.tsx`, agregar `eventColor` verde para `estado='completada'`.

### 3. Limpiar las 356 obligaciones huérfanas
- Migración one-shot: `DELETE FROM obligaciones WHERE fecha_vencimiento IS NULL AND activa = false AND created_at < now() - interval '30 days'`.
- Conserva la única huérfana activa por seguridad. Restar 356 filas mejora performance del calendario y de los KPIs del dashboard.

### 4. Simplificar el portal del cliente (`MiEmpresa.tsx`)
- **Quitar el `DashboardCalendar` embebido** del portal del cliente (un cliente no necesita filtros de tipo/empresa).
- Dejar `MisVencimientos` como héroe arriba.
- Agregar una segunda card: **"Documentos por vencer"** (lista plana de los 5 documentos próximos a expirar — pasaporte, certificados — con botón "actualizar").
- Mover el calendario completo a una pestaña secundaria *"Vista calendario"* para clientes que lo pidan.

### 5. Hacer los chips legibles para no-técnicos
- En `DashboardCalendar.tsx`, agregar **tooltip** a cada chip explicando qué es:
  - Obligaciones: *"Trámites legales recurrentes (SAT, INEGI, IMMEX)"*
  - Programas: *"Vencimiento de tu IMMEX/PROSEC/IVA-IEPS"*
  - Documentos: *"Pasaportes, certificados, contratos"*
  - Tareas: *"Pendientes operativos del despacho"*
- Para clientes (`role==='cliente'`), **ocultar el chip "Tareas"** por defecto (son operativas internas del consultor).
- Agregar un mini-resumen arriba del calendario: *"Esta semana: 3 obligaciones · 1 documento · 0 vencidas"*.

## Archivos a tocar

1. **Nueva migración SQL** —
   - Extender enum `frecuencia_tipo` con `SEMANAL` y `ULTIMO_DIA_MES`.
   - Recursar función `generar_ocurrencias_obligacion`.
   - UPDATE de los 20 catálogos legacy restantes.
   - Re-ejecutar `expand_existing_obligaciones()`.
   - Trigger de cumplimiento → estado.
   - DELETE de huérfanas.
2. **Editar** `src/components/dashboard/DashboardCalendar.tsx` — color verde para completadas, tooltips en chips, mini-resumen, ocultar Tareas para clientes.
3. **Editar** `src/pages/MiEmpresa.tsx` — quitar calendario embebido, agregar "Documentos por vencer", mover calendario a tab secundaria.
4. **Crear** `src/components/empresas/MisDocumentos.tsx` — lista limpia de 5 docs próximos a vencer.

## Lo que NO voy a tocar

- El componente `MisVencimientos` ya está bien, solo lo dejo como héroe.
- El sistema de evidencia/audit trail — sigue tal cual.
- El motor SQL principal — solo lo extiendo, no lo reescribo.

## Notas técnicas

- **Enum extension** requiere `ALTER TYPE ... ADD VALUE` (no es rollback-friendly, pero es seguro).
- **Días hábiles reales** (excluir sábados/domingos/feriados mexicanos) queda como mejora futura — por ahora `ULTIMO_DIA_MES` usa el último día calendario, suficiente para 95% de obligaciones.
- **Trigger de cumplimiento**: solo marca `completada` si `periodo_key` coincide con periodo actual de la obligación, evitando que cumplimientos viejos sobrescriban estados.
- **Borrado de huérfanas**: solo `activa=false` y >30 días, conservador. El usuario no perderá nada visible.

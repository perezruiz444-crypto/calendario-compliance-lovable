
Plan ya validado y aprobado. Resumen de ejecución:

## Paso 1 — Migración SQL
Agregar a `obligaciones_catalogo`:
- `frecuencia_tipo` text (MENSUAL | BIMESTRAL | TRIMESTRAL | SEMESTRAL | ANUAL | EVENTUAL)
- `dia_vencimiento` integer (1-31)
- `mes_vencimiento` integer (1-12)

Crear función `public.generar_ocurrencias_obligacion(p_obligacion_id uuid)` SECURITY DEFINER:
- Lee la obligación insertada y su catálogo asociado
- Calcula N ocurrencias según `frecuencia_tipo` (MENSUAL=12, BIMESTRAL=6, TRIMESTRAL=4, SEMESTRAL=2, ANUAL=1, EVENTUAL=0)
- Para cada ocurrencia: calcula `fecha_vencimiento` con `make_date(año_actual, mes, dia_vencimiento)` con clamp al último día del mes
- Inserta en `obligaciones` con mismo `empresa_id`, `catalogo_id`, `nombre`, `categoria`, `presentacion`, `activa=true`, `estado='vigente'`
- Anti-duplicado: `ON CONFLICT DO NOTHING` vía índice único parcial sobre `(empresa_id, catalogo_id, fecha_vencimiento) WHERE catalogo_id IS NOT NULL`
- Copia los responsables de la obligación original a las nuevas ocurrencias

Crear trigger `trg_generar_ocurrencias` AFTER INSERT en `obligaciones`:
- Condición: `NEW.catalogo_id IS NOT NULL AND pg_trigger_depth() = 1`
- Ejecuta `generar_ocurrencias_obligacion(NEW.id)`

## Paso 2 — `CatalogoAdmin.tsx`
Agregar al formulario de creación/edición de catálogo:
- Select `frecuencia_tipo` con las 6 opciones
- Input number `dia_vencimiento` (1-31, visible si tipo ≠ EVENTUAL)
- Select `mes_vencimiento` (Enero-Diciembre, visible solo si tipo = ANUAL)

Mostrar también esos valores en la lista del catálogo como badge informativo.

## Paso 3 — `ActivarObligacionDialog.tsx`
- Al activar, leer `frecuencia_tipo` del item del catálogo
- Si es recurrente (no EVENTUAL/null), mostrar `toast.success` con mensaje: "Se generaron N ocurrencias automáticamente para el año en curso"
- El INSERT no cambia — el trigger se encarga del resto

## Paso 4 — `DashboardCalendar.tsx`
- Limpiar el `setEvents` duplicado (cosmético, líneas 196-198)

## Archivos
1. **Crear** migración SQL (columnas + índice único parcial + función + trigger)
2. **Editar** `src/components/configuraciones/CatalogoAdmin.tsx`
3. **Editar** `src/components/obligaciones/ActivarObligacionDialog.tsx`
4. **Editar** `src/components/dashboard/DashboardCalendar.tsx`

## Notas
- No se backfilea data existente (solo aplica a inserciones nuevas).
- `src/integrations/supabase/types.ts` se regenera solo después de la migración.

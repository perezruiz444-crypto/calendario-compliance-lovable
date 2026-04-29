
# Fix: Error al guardar cumplimiento desde el Sheet de detalle

## Causa raíz

`src/components/obligaciones/ObligacionDetailSheet.tsx` (línea ~95) hace un `upsert` a `obligacion_cumplimientos` con columnas que **no existen**:

```ts
.upsert({
  cumplido_por: user.id,           // ❌ no existe
  fecha_cumplimiento: new Date()…  // ❌ no existe
})
```

Schema real de la tabla:
- `completada_por` (uuid) ← el correcto
- `completada_en` (timestamptz, NOT NULL, default now()) ← el correcto
- `completada` (boolean, NOT NULL)
- `notas`, `evidencia_url`, `periodo_key`, `obligacion_id`

El componente hermano `EvidenciaCumplimiento.tsx` ya usa el nombre correcto (`completada_por`), por eso ese flujo sí funciona.

## Cambio

Un único archivo, dos líneas:

**`src/components/obligaciones/ObligacionDetailSheet.tsx`** — en `handleMarcarCumplida`:
- `cumplido_por` → `completada_por`
- Quitar `fecha_cumplimiento` (la columna `completada_en` tiene default `now()`, no hace falta enviarla)
- Agregar `completada: true` explícitamente para dejar el registro consistente

Antes:
```ts
.upsert({
  obligacion_id: ob.id,
  periodo_key: periodKey,
  cumplido_por: user.id,
  notas: evidencia || null,
  fecha_cumplimiento: new Date().toISOString(),
})
```

Después:
```ts
.upsert({
  obligacion_id: ob.id,
  periodo_key: periodKey,
  completada: true,
  completada_por: user.id,
  notas: evidencia || null,
})
```

## Validación

- Marcar como cumplida desde el Sheet → debe mostrar toast verde y refrescar.
- El trigger `marcar_obligacion_cumplida` se dispara con el INSERT y pone `obligaciones.estado = 'completada'` (lo cual repinta el evento del calendario en verde).
- Desmarcar (DELETE) sigue funcionando igual, no se toca.

## No incluido

- No se toca el schema (las columnas ya están bien).
- No se toca `EvidenciaCumplimiento.tsx` ni `MisVencimientos.tsx` (ya usan los nombres correctos).

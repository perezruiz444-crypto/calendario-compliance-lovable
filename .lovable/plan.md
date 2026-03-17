

# Plan: Auto-activar obligaciones al asignar fecha

## Problema
Cuando un consultor le asigna una fecha de vencimiento a una obligacion, esta no aparece en el apartado de "Obligaciones Activas" porque el campo `activa` permanece en `false`. El usuario espera que al ponerle fecha, la obligacion se active automaticamente.

## Solucion

### 1. `src/components/obligaciones/ObligacionFormDialog.tsx` — Auto-activar al poner fecha

En la funcion `update()` (linea 133), agregar logica para que cuando se asigne `fecha_vencimiento`, `fecha_inicio` o `fecha_fin`, el campo `activa` se ponga en `true` automaticamente:

```typescript
if (['fecha_vencimiento', 'fecha_inicio', 'fecha_fin'].includes(field) && value) {
  updated.activa = true;
}
```

### 2. `src/components/obligaciones/ObligacionesManager.tsx` — Misma logica en insert/update

En `handleCreate` y `handleUpdate`, asegurar que si hay alguna fecha asignada, `activa` sea `true`:

```typescript
const shouldBeActive = data.activa || !!data.fecha_vencimiento || !!data.fecha_inicio || !!data.fecha_fin;
```

Usar `shouldBeActive` en lugar de `data.activa` al insertar/actualizar.

### 3. `src/components/empresas/EmpresaObligacionesActivasCard.tsx` — Misma logica en el onSubmit del edit

Aplicar la misma logica de auto-activacion en el handler de edicion inline (linea ~263) para que al editar una obligacion desde la tarjeta y ponerle fecha, se active.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/obligaciones/ObligacionFormDialog.tsx` | Auto-set `activa = true` cuando se asigna una fecha |
| `src/components/obligaciones/ObligacionesManager.tsx` | Derivar `activa` de fechas en create/update |
| `src/components/empresas/EmpresaObligacionesActivasCard.tsx` | Derivar `activa` en edit handler |


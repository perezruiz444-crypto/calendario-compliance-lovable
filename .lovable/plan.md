

# Plan: Simplificar el formulario de obligaciones

## Problema actual

El formulario tiene **5 campos de fecha** (autorización, vencimiento, renovación, inicio, fin) + un toggle de activación + selección de responsable en 2 pasos. Esto genera confusion sobre que campos son necesarios y como activar una obligacion.

## Propuesta: Reorganizar en 2 pasos claros

### Paso 1 — Datos de la obligacion (simplificado)
Mantener: nombre, categoria, articulos, presentacion, descripcion, notas, numero_oficio.

Reducir fechas a **solo 1 campo visible por defecto**: `Fecha de vencimiento`. Los demas campos (fecha_autorizacion, fecha_renovacion, fecha_inicio, fecha_fin) se ocultan detras de un enlace "Mostrar mas fechas" tipo collapsible. Esto reduce el ruido visual drasticamente.

### Paso 2 — Activacion simplificada
Eliminar el toggle manual. La logica es:
- Si tiene `fecha_vencimiento` → se activa automaticamente, el campo de responsable aparece inline debajo de la fecha de vencimiento.
- Si NO tiene fecha → permanece inactiva (solo informativa/catalogo).
- En el listado general, el toggle manual ya existente permite override.

Ademas, unificar la seleccion de responsable: en lugar de 2 selects (tipo + persona), usar **1 solo select** que agrupe clientes y consultores con headers de grupo.

## Cambios en codigo

| Archivo | Cambio |
|---------|--------|
| `ObligacionFormDialog.tsx` | Colapsar fechas secundarias en un Collapsible. Mover responsable inline bajo fecha_vencimiento. Eliminar toggle "Activar". Unificar select de responsable con grupos. Quitar campo "estado" (se calcula automatico por fecha). |

### Logica de activacion resultante
```
fecha_vencimiento presente → activa = true, mostrar campo responsable
fecha_vencimiento vacia → activa = false (override posible desde listado)
```

### UI resultante del formulario
```text
┌─────────────────────────────────┐
│ Nombre *                        │
│ Categoría *    │ Presentación   │
│ Artículo(s)                     │
│ Nº Oficio                       │
│                                 │
│ 📅 Fecha de Vencimiento         │
│    [input date]                 │
│    👤 Responsable: [select]     │  ← solo si hay fecha
│                                 │
│ ▸ Más fechas (autorización,     │  ← collapsible, cerrado
│   renovación, inicio, fin)      │
│                                 │
│ Descripción                     │
│ Notas                           │
└─────────────────────────────────┘
```

Este diseno reduce de ~12 campos visibles a ~7, y la activacion es implicita al poner una fecha de vencimiento.


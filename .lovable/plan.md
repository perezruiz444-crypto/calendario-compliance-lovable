

# Plan: Manejo de obligaciones recurrentes

## Problema actual

Hoy el sistema tiene el campo `presentacion` (mensual, trimestral, anual, etc.) y ya rastrea cumplimiento por periodo via `obligacion_cumplimientos` con `periodo_key`. Sin embargo, hay un problema fundamental:

- `fecha_vencimiento` es una fecha fija que no se recalcula automaticamente
- Una obligacion mensual con vencimiento "15 de enero" no genera automaticamente el siguiente vencimiento "15 de febrero"
- El usuario tiene que actualizar manualmente la fecha cada periodo

## Solucion propuesta

Cuando una obligacion tiene `presentacion` recurrente (no "unica"), el sistema debe:

1. **Usar `fecha_vencimiento` como fecha base del primer vencimiento**
2. **Calcular automaticamente el proximo vencimiento** basado en la periodicidad
3. **Mostrar el proximo vencimiento en la UI** sin modificar la fecha original en BD

### Logica de calculo

```
fecha_base = fecha_vencimiento (ej: 15 enero 2026)
presentacion = "mensual"
→ proximos vencimientos: 15 feb, 15 mar, 15 abr...
→ el "proximo" es el primer vencimiento futuro no completado
```

### Cambios

| Archivo | Cambio |
|---------|--------|
| `src/lib/obligaciones.ts` | Agregar funcion `getNextVencimiento(fechaBase, presentacion, cumplimientos)` que calcula el proximo vencimiento no completado |
| `src/components/obligaciones/ObligacionesActivasTab.tsx` | Mostrar "Proximo vencimiento" calculado en lugar de la fecha fija, ordenar por proximo vencimiento |
| `src/components/obligaciones/ObligacionesManager.tsx` | En la tabla, mostrar proximo vencimiento para recurrentes. Indicar visualmente que es recurrente |
| `src/components/obligaciones/ObligacionFormDialog.tsx` | Simplificar: colapsar fechas secundarias, quitar toggle manual (activacion implicita por fecha_vencimiento), unificar select de responsable en 1 solo agrupado |

### Activacion simplificada (del plan anterior pendiente)

El formulario se simplifica al mismo tiempo:
- Solo `fecha_vencimiento` visible por defecto
- Fechas secundarias en collapsible
- Si tiene `fecha_vencimiento` → activa automaticamente
- Si tiene `presentacion` recurrente → muestra indicador de recurrencia y calcula proximos vencimientos
- Responsable en 1 solo select agrupado (clientes / consultores)

### UI en el listado de activas

Para obligaciones recurrentes se mostrara:
- Badge con la periodicidad (ej: "Mensual")
- "Proximo: 15/mar/2026" calculado automaticamente
- El checkbox de cumplimiento ya funciona por periodo, no cambia


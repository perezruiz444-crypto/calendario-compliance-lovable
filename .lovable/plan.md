

# Diagnostico: Obligaciones activas de Johnson

## Hallazgo

Despues de revisar la base de datos, confirmo que la migracion funciono correctamente:

- Johnson tiene **108 obligaciones** en total
- **14 tienen fecha de vencimiento** asignada → todas estan marcadas como `activa = true` ✅
- **94 NO tienen ninguna fecha** asignada (ni `fecha_vencimiento`, ni `fecha_inicio`, ni `fecha_fin`) → permanecen como `activa = false`

Las 14 obligaciones activas son: Ajuste anual inventarios, Articulo 69 del CFF (x3), Buzon tributario (x2), Expedicion constancias Automotriz (x2), INEGI, Registros Automotriz, Registros Autopartes, Reporte anual, Reporte Anual Operaciones, Ventas anuales.

## Problema real

No es un bug de codigo ni de migracion. Las obligaciones que no aparecen como activas simplemente **no tienen fecha de vencimiento asignada todavia**. Para que aparezcan, hay que asignarles una fecha desde el formulario de edicion.

## Posible mejora: Permitir activar obligaciones manualmente (sin fecha)

Si el usuario quiere que obligaciones sin fecha tambien aparezcan como activas, podemos agregar un boton o toggle de "Activar" directamente en el listado general de obligaciones, independiente de si tienen fecha o no.

### Cambios necesarios

| Archivo | Cambio |
|---------|--------|
| `src/components/obligaciones/ObligacionesManager.tsx` | Agregar boton/toggle para activar/desactivar obligaciones directamente desde el listado |

Esto permitiria al usuario activar cualquier obligacion manualmente, ademas de la activacion automatica al asignar fecha.


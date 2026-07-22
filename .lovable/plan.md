## Bug encontrado

En `src/components/obligaciones/ObligacionesManager.tsx` línea 594:

```tsx
{vencInfo && getVencimientoBadge(next ? format(next.date, 'yyyy-MM-dd') : ob.fecha_vencimiento)}
```

La variable `next` **no está definida** en el scope del `.map()` (es un remanente de una refactorización previa). Cada render dispara `ReferenceError: next is not defined` y el `ErrorBoundary` rompe toda la tab de obligaciones en `/empresas/{id}`.

En ese mismo scope ya existe `fechaVenc` (línea 518) que tiene exactamente el valor correcto: `oc?.fecha_vencimiento ?? ob.fecha_vencimiento`.

## Fix (1 línea)

Reemplazar en línea 594:

```tsx
{vencInfo && getVencimientoBadge(fechaVenc)}
```

Con esto el badge de vencimiento vuelve a pintarse usando la fecha ya calculada de la próxima ocurrencia, y se elimina el crash. Cambio aditivo, sin tocar lógica de datos ni otros archivos.
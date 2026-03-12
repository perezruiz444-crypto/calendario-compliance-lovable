

## Plan: Tema Claro Completo — Sidebar Blanca/Gris Claro

### Cambio principal
Convertir el sidebar de fondo navy oscuro (`210 100% 15%`) a un fondo blanco/gris muy claro, y ajustar todos los colores de sidebar para que funcionen sobre fondo claro.

### Archivo: `src/index.css`

Actualizar las variables CSS del sidebar en `:root`:

| Variable | Antes | Después |
|---|---|---|
| `--sidebar-background` | `210 100% 15%` (navy oscuro) | `210 20% 98%` (gris muy claro) |
| `--sidebar-foreground` | `0 0% 100%` (blanco) | `0 0% 20%` (texto oscuro) |
| `--sidebar-primary` | `4 76% 49%` (rojo) | `210 100% 20%` (navy — el botón activo) |
| `--sidebar-primary-foreground` | `0 0% 100%` | `0 0% 100%` (sin cambio) |
| `--sidebar-accent` | `210 100% 18%` | `210 20% 93%` (gris claro hover) |
| `--sidebar-accent-foreground` | `0 0% 100%` | `0 0% 20%` (texto oscuro) |
| `--sidebar-border` | `210 100% 22%` | `0 0% 90%` (borde gris suave) |
| `--sidebar-ring` | `4 76% 49%` | `210 100% 20%` (navy) |

Actualizar `--gradient-primary` para que sea más suave si se usa en la sidebar.

### Archivo: `src/components/layout/DashboardLayout.tsx`

Ajustes menores de clases para que los textos de opacidad (`text-sidebar-foreground/60`) se vean bien sobre fondo claro. El logo icon puede cambiar de `bg-sidebar-primary` a `bg-primary` para mantener contraste con el ícono corporativo.

### Resultado visual
- Sidebar con fondo blanco/gris perla
- Texto de navegación en gris oscuro
- Botón activo en navy con texto blanco
- Hover en gris claro sutil
- Bordes suaves entre secciones
- Todo el sistema uniforme y luminoso

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/index.css` | Actualizar variables `--sidebar-*` a tonos claros |
| `src/components/layout/DashboardLayout.tsx` | Ajustes menores de clases para contraste |


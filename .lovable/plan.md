

## Plan: Modernizar el Calendario de Eventos

### Problema
El calendario usa los estilos por defecto de `react-big-calendar` con overrides minimos. Se ve anticuado: bordes gruesos, toolbar plana, eventos como barras opacas, sin transiciones ni sombras.

### Cambios propuestos

#### 1. Overhaul completo de CSS (`src/index.css`)
Reescribir todos los estilos `.rbc-calendar-enhanced` con un look moderno:

- **Toolbar**: Botones con estilo pill/rounded, grupo de vistas como segmented control, titulo del mes mas grande y centrado
- **Grid del mes**: Bordes sutiles (1px light), sin bordes exteriores pesados, celdas con fondo ligeramente alternado
- **Headers de dia**: Uppercase mas sutil, color muted, sin borde inferior grueso
- **Eventos**: Border-radius mayor (6px), sombra sutil, hover con scale transform, texto truncado limpio
- **Hoy**: Highlight con ring/outline sutil en primary en vez de background solido
- **"+N mas"**: Estilo como badge/chip moderno con gradiente sutil
- **Popup overlay**: Glassmorphism ligero (backdrop-blur, border translucido)
- **Transiciones**: `transition` en hover de eventos, botones toolbar, celdas
- **Vista week/day**: Lineas de hora mas sutiles, header con fondo gradiente

#### 2. Eventos con dot indicator en vez de barras llenas (`DashboardCalendar.tsx`)
- Cambiar `eventStyleGetter` para usar estilos mas modernos: fondo con opacity baja + borde izquierdo de color + texto oscuro en vez de barras solidas de color con texto blanco
- Esto da un look mas limpio y legible tipo Google Calendar / Notion

#### 3. Leyenda integrada como chips (`Calendario.tsx`)
- Reemplazar la Card de leyenda por chips/pills inline debajo del toolbar del calendario, mas compactos y modernos

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/index.css` | Reescribir estilos rbc-calendar-enhanced con look moderno |
| `src/components/dashboard/DashboardCalendar.tsx` | Actualizar eventStyleGetter para estilo moderno (fondo translucido + borde izquierdo), mejorar badges |
| `src/pages/Calendario.tsx` | Leyenda como chips inline en vez de card separada |


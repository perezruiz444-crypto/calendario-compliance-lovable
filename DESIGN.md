# Calendario Compliance — Design System

**Navy Trust Editorial** · Space Grotesk + DM Sans · APP UI

Todo el sistema está implementado en `src/index.css` como variables CSS y clases utilitarias de Tailwind. Este documento explica cuándo y cómo usar cada pieza.

---

## Paleta de colores

| Token | Valor HSL | Cuándo usar |
|-------|-----------|-------------|
| `--primary` | `218 80% 19%` | Acciones principales, estado activo en nav, CTA primario |
| `--primary-glow` | `214 75% 52%` | Gradientes, anillos de focus, highlights |
| `--accent` | `214 75% 52%` | Igual que primary-glow — para elementos interactivos secundarios |
| `--success` | `152 65% 38%` | Tareas completadas, estados OK, métricas positivas |
| `--success-glow` | `152 65% 45%` | Estados de éxito con más presencia (paralelo a primary-glow), `.glow-success` |
| `--warning` | `36 90% 45%` | Tareas pendientes, vencimientos próximos |
| `--destructive` | `4 76% 49%` | Errores, acciones destructivas, prioridad urgente |
| `--urgent` | `25 95% 53%` | Solo para prioridad "urgente" — distinto del destructive |
| `--muted-foreground` | — | Texto secundario, labels, descripciones |
| `--border` | — | Bordes de cards y separadores |
| `--border-subtle` | — | Bordes de secciones grandes (más suave que --border) |

**v2 (2026-07):** primary y success se profundizaron/vivificaron tras investigar
referencias (saaslandingpage.com, saasinterface.com) y tendencias fintech/compliance
2026 — navy sigue siendo la elección correcta para esta categoría, pero con más
contraste y un verde-esmeralda más vibrante para estados de cumplimiento.

**Regla:** Nunca uses colores hexadecimales inline. Siempre `hsl(var(--token))` o la clase Tailwind correspondiente.

---

## Tipografía

| Fuente | Clase | Cuándo usar |
|--------|-------|-------------|
| Space Grotesk | `.font-heading` | Títulos, headings (`h1`–`h4`), KPI numbers, labels de botones |
| DM Sans | `.font-body` (default en `body`) | Párrafos, descripciones, inputs, contenido |
| DM Mono | `.font-mono` | Timestamps, IDs técnicos, valores numéricos tabulares |

### Jerarquía de texto

```
.display-1    → 4xl/5xl, font-bold, -0.035em   — Títulos de página hero
.display-2    → 3xl/4xl, font-bold, -0.03em    — Subtítulos de sección
h1            → 2.25rem, font-700              — Títulos de página estándar
h2            → 1.75rem, font-700              — Secciones
h3            → 1.25rem, font-600              — Cards y widgets
h4            → 1rem,    font-600              — Labels de sección
.eyebrow      → 11px, uppercase, 0.14em        — Etiquetas sobre títulos
.eyebrow-primary → igual pero en color primary — Secciones con acento primario
```

---

## Sombras

Usa la sombra más ligera que sirva. No subas de nivel sin razón.

| Clase | Cuándo usar |
|-------|-------------|
| `.shadow-elegant` | Separación mínima (inputs flotantes) |
| `.shadow-card` | Cards estándar en estado hover |
| `.shadow-editorial` | Cards en estado normal, widgets de dashboard |
| `.shadow-float` | Dropdowns, popovers, elementos flotantes |

---

## Gradientes

| Clase | Cuándo usar |
|-------|-------------|
| `.gradient-primary` | Botones CTA principales |
| `.gradient-hero` | Header del sidebar, indicador activo de nav |
| `.gradient-card` | Fondo sutil de cards de datos |
| `.gradient-subtle` | Fondos de sección con ligera profundidad |
| `.surface-mesh` | Header editorial del dashboard |

---

## Patrones de estado

### Loading
```tsx
<div className="rounded-[0.625rem] border bg-card p-4 space-y-3">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-3 w-1/2" />
</div>
```

### Empty state
- Ícono centrado en `w-16 h-16 rounded-2xl bg-muted`
- Título `.font-heading font-semibold`
- Descripción `text-sm text-muted-foreground max-w-xs mx-auto`
- CTA: botón "Nueva Tarea" si puede crear, "Limpiar filtros" si hay filtros activos

### Error state
- Ícono en `rounded-2xl bg-destructive/10`
- Mensaje amigable (no el error técnico)
- Botón "Reintentar" con `<RefreshCw />` que llama de nuevo al fetch

---

## Progressive disclosure (listas de obligaciones)

Las listas de obligaciones/vencimientos usan **agrupación por urgencia con
disclosure progresivo** en vez de listas planas: resumen (KPIs/badges) siempre
visible, detalle agrupado y colapsable debajo.

Componente compartido: `src/components/obligaciones/ObligacionesPorUrgencia.tsx`.
Agrupa cualquier lista de ítems con fecha de vencimiento en 4 secciones —
Vencidas, Urgentes, Próximas, Al día — usando `getVencimientoInfo()` de
`src/lib/obligaciones.ts`. Vencidas y Urgentes se muestran expandidas por
defecto; Próximas y Al día colapsadas.

**Cuándo usar:**
- Vistas de página completa con listas potencialmente largas (`ObligacionesActivasTab`).
- Widgets de dashboard cuando la lista supera ~8 ítems (`DashboardObligacionesMensuales`
  cae a lista flat simple por debajo de ese umbral — no todo necesita agrupación).
- Paneles secundarios como "Próximos 30 días" en `DashboardCalendar`.

**No usar** para listas ya cortas (≤ 8 ítems) donde el agrupamiento añade
fricción sin beneficio — en ese caso, lista flat simple.

Los estados completados/cumplidos van aparte, colapsados detrás de un toggle
"Ver completadas (N)" — nunca mezclados en el mismo grupo que las pendientes.

---

## Cards

### Card editorial (dashboard principal)
```tsx
<div className="card-editorial p-5">...</div>
```

### Card shadcn estándar
```tsx
<Card className="gradient-card shadow-card">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

---

## Navegación y roles

| Rol | Secciones en nav |
|-----|-----------------|
| `administrador` | Dashboard, Empresas, Tareas, Calendario, Reportes, Usuarios, Configuraciones |
| `consultor` | Dashboard, Empresas, Tareas, Calendario, Reportes, Configuraciones |
| `cliente` | Dashboard, Mi Empresa, Tareas, Calendario, Configuraciones |

**Estado especial:** Cliente sin `empresa_id` → pantalla de espera con instrucciones, sin KPIs.

**Mobile:** Sidebar colapsa a `Sheet`. Vista Kanban colapsa automáticamente a lista en < 768px (hook `useIsMobile`).

---

## Accesibilidad

- **Focus ring:** `box-shadow: 0 0 0 3px hsl(var(--primary-glow) / 0.25)` — nunca `outline: none` sin reemplazo
- **Touch targets:** `h-11` (44px) en móvil, `h-8`/`h-9` en desktop
- **Contraste:** foreground (`222 47% 11%`) sobre background (`220 30% 98%`) > 7:1
- **ARIA:** botones de vista usan `aria-current="page"` en el activo y `aria-label` con el nombre
- **Motion:** respetar `prefers-reduced-motion` — no agregar animaciones sin `motion-safe:`

---

## Cuándo crear un componente nuevo vs reusar

**Reusar primero:**
- `PageTransition.tsx` para transiciones entre páginas
- `PageHeader.tsx` para títulos de página
- `EmptyState` (patrón en Tareas) para listas vacías
- `ClientOnboardingTour` como referencia de first-run
- `ObligacionesPorUrgencia.tsx` para cualquier lista de obligaciones/vencimientos
  que necesite agrupación por urgencia (ver sección "Progressive disclosure")

**Crear nuevo cuando:** el patrón se repite 3+ veces con la misma estructura.

**No crear:** wrappers de un solo uso alrededor de shadcn components sin lógica propia.

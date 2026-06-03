# Calendario Compliance — Design System

**Navy Trust Editorial** · Space Grotesk + DM Sans · APP UI

Todo el sistema está implementado en `src/index.css` como variables CSS y clases utilitarias de Tailwind. Este documento explica cuándo y cómo usar cada pieza.

---

## Paleta de colores

| Token | Valor HSL | Cuándo usar |
|-------|-----------|-------------|
| `--primary` | `218 76% 23%` | Acciones principales, estado activo en nav, CTA primario |
| `--primary-glow` | `214 70% 55%` | Gradientes, anillos de focus, highlights |
| `--accent` | `214 70% 55%` | Igual que primary-glow — para elementos interactivos secundarios |
| `--success` | `152 60% 32%` | Tareas completadas, estados OK, métricas positivas |
| `--warning` | `36 90% 45%` | Tareas pendientes, vencimientos próximos |
| `--destructive` | `4 76% 49%` | Errores, acciones destructivas, prioridad urgente |
| `--urgent` | `25 95% 53%` | Solo para prioridad "urgente" — distinto del destructive |
| `--muted-foreground` | — | Texto secundario, labels, descripciones |
| `--border` | — | Bordes de cards y separadores |
| `--border-subtle` | — | Bordes de secciones grandes (más suave que --border) |

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

**Crear nuevo cuando:** el patrón se repite 3+ veces con la misma estructura.

**No crear:** wrappers de un solo uso alrededor de shadcn components sin lógica propia.

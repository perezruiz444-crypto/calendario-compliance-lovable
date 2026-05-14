# Rediseño Visual Completo — Calendario Compliance

**Dirección:** Editorial sofisticado · **Paleta:** Navy Trust renovado · **Tipografía:** Space Grotesk + DM Sans · **Motion:** 4/5 (rico pero profesional)

---

## 1. Sistema de diseño base

### Paleta extendida (HSL en `index.css`)
```text
--background:        220 30% 98%   (off-white cálido azulado)
--foreground:        222 47% 11%   (casi negro azulado)
--primary:           218 76% 23%   #0f1b3d navy profundo
--primary-hover:     218 60% 32%   #1e3a5f
--primary-glow:      214 70% 55%   #3b6fa0 (acento luminoso)
--accent:            218 76% 23%   (mismo navy, NO rojo decorativo)
--destructive:       4 76% 49%     (solo errores reales)
--surface-elevated:  0 0% 100%
--surface-muted:     220 25% 95%
--border-subtle:     220 20% 92%
--ink-soft:          222 25% 35%
```

Gradientes y sombras:
```text
--gradient-hero:     linear 135° from primary to primary-glow
--gradient-subtle:   linear 180° from background to surface-muted
--gradient-mesh:     radial layers de primary-glow @ 4% opacity
--shadow-editorial:  0 1px 2px rgba(15,27,61,.04), 0 8px 32px -12px rgba(15,27,61,.12)
--shadow-float:      0 24px 48px -20px rgba(15,27,61,.18)
--ring-focus:        0 0 0 3px hsl(214 70% 55% / .25)
```

### Tipografía
- Display: **Space Grotesk** (700/600) — tracking -0.03em en H1/H2
- Body: **DM Sans** (400/500) — 14px base, 1.55 line-height
- Mono: DM Mono (datos numéricos, fechas)
- Escala editorial: H1 2.25rem · H2 1.75rem · H3 1.25rem · eyebrow 11px tracking +0.14em uppercase

### Radios y espaciado
- `--radius: 0.875rem` (14px, más editorial)
- Espacio vertical generoso entre secciones: `gap-10` desktop, `gap-6` mobile
- Cards con padding `p-7` (28px) por defecto

---

## 2. Layout editorial

### Sidebar
- Fondo `surface-muted` con borde derecho hairline (1px @ 40% opacity)
- Logo con eyebrow "Compliance Suite" sobre nombre
- Items activos: indicador vertical de 3px en `primary-glow` + fondo `primary/6`
- Hover suave 150ms ease-out con translate-x-[2px]
- Footer del usuario rediseñado tipo "card flotante" con avatar + acción rápida

### Topbar
- Altura 56px, fondo translúcido con `backdrop-blur-xl`
- Búsqueda global como protagonista (centrada, ancho 480px max), placeholder "Buscar empresas, obligaciones, tareas…"
- Atajos visibles: `⌘K` chip al final del input
- Notificaciones + perfil compactos a la derecha

### Page header pattern (nuevo, reutilizable)
Cada página principal arranca con:
- Eyebrow uppercase con ruta contextual ("DASHBOARD · MAYO 2026")
- H1 grande Space Grotesk
- Subtítulo descriptivo en `ink-soft`
- Acciones primarias alineadas a la derecha
- Línea divisoria hairline debajo

---

## 3. Componentes clave rediseñados

### Cards
- Tres variantes: `card-flat` (sin sombra, solo border), `card-editorial` (sombra sutil, hover float), `card-feature` (gradient-mesh background, sombra grande)
- Border-left de 3px solo cuando hay estado semántico real (vencido = destructive, urgente = warning)
- Header con eyebrow + título + acción en línea

### Botones
- `primary`: navy sólido, hover sube a `primary-hover` con micro-shadow
- `ghost-editorial`: solo texto + underline animado al hover (story-link pattern)
- `outline-glow`: border `primary-glow`, fill al hover con transición de 200ms
- Tamaños: sm 32px, md 38px, lg 44px

### Tablas y listas
- Filas con `border-b border-subtle`, hover `surface-muted/60`
- Tipografía mono para fechas, números y porcentajes
- Chips de estado con dot leading + texto, sin fondos saturados
- Sticky header con backdrop-blur

### Inputs
- Border 1px subtle, focus con ring `primary-glow @ 25%`
- Labels arriba en eyebrow style
- Placeholders en `ink-soft`

---

## 4. Microinteracciones y motion (nivel 4/5)

Stack: **Framer Motion** + Tailwind transitions.

### Page transitions
- Fade + slide-up 8px al entrar a cada ruta (250ms)
- Stagger en grids de cards (60ms entre items)

### Hovers
- Cards: `translate-y-[-2px]` + shadow upgrade (180ms ease-out)
- Botones: scale 1.02 sutil + glow ring
- Nav items: barra lateral animada con `layoutId`
- Story-link en links internos del dashboard

### Loading states
- Skeletons editoriales (no genéricos): mantienen forma del contenido real con shimmer suave
- Number counter animado en KPIs (cuenta de 0 al valor real, 800ms easeOut)
- Progress bars con shimmer interno

### Calendar (FullCalendar)
- Eventos con entrada `scale + fade` al cambiar mes
- Hover en evento: tooltip flotante con shadow-float
- Today indicator: punto pulsante `primary-glow`

### Datos en vivo (Realtime Supabase)
- Toast Sonner con slide-in desde top-right + sound option
- Indicador "live" con dot pulsante verde junto a títulos de widgets reactivos

### Confetti / celebraciones
- Cuando completas obligación 100% del mes: micro-confetti + toast premium
- Streak indicator en obligaciones recurrentes

---

## 5. Dashboard rediseñado (storytelling vertical)

Flujo narrativo en lugar de wall-of-KPIs:

```text
┌─────────────────────────────────────────┐
│ Eyebrow + Greeting personalizado        │
│ "Buenos días, Carlos"                   │
│ Resumen 1 línea: "3 obligaciones venc…" │
├─────────────────────────────────────────┤
│ Hero KPI band (4 métricas, números      │
│ grandes mono, deltas con flecha)        │
├─────────────────────────────────────────┤
│ ░ Obligaciones del mes (protagonista)  │
│   - Filtro urgencia inline              │
│   - Toggle ocultar cumplidas (persist)  │
│   - Click row → ObligacionDetailSheet  │
├─────────────────────────────────────────┤
│ ░░ Tareas pendientes + Agenda hoy      │
│    (2 columnas en desktop)              │
├─────────────────────────────────────────┤
│ ░░░ Calendario compacto + Mensajes     │
├─────────────────────────────────────────┤
│ Footer minimal con últimas actividades │
└─────────────────────────────────────────┘
```

Eliminar `DashboardObligaciones` viejo (código muerto).

---

## 6. Touchpoints específicos

- **Auth/Login:** split-screen editorial. Izq: formulario centrado con logo + eyebrow. Der: gradient-mesh navy con quote rotativa o ilustración abstracta de compliance.
- **Empty states:** ilustración minimal + título display + CTA primario. Nunca genérico "no data".
- **Error boundaries:** card editorial con tono cálido, no alarmista.
- **Sheets (detalles):** width 560px, header sticky con eyebrow + título, scroll suave, footer con acciones siempre visibles.

---

## 7. Detalles técnicos

**Archivos a tocar:**
1. `src/index.css` — variables HSL, gradientes, sombras, escala tipográfica, utilidades (`.eyebrow`, `.story-link`, `.card-editorial`, `.surface-mesh`)
2. `tailwind.config.ts` — fontFamily heading=Space Grotesk, body=DM Sans; nuevos tokens de shadow
3. `index.html` — Google Fonts (Space Grotesk 600/700 + DM Sans 400/500)
4. `src/components/layout/DashboardLayout.tsx` — sidebar y topbar editoriales
5. `src/components/ui/button.tsx` y `card.tsx` — nuevas variantes (`editorial`, `feature`, `ghost-editorial`, `outline-glow`)
6. `src/pages/Dashboard.tsx` — restructura narrativa
7. `src/pages/Auth.tsx` — split-screen
8. Crear `src/components/layout/PageHeader.tsx` — patrón reutilizable
9. Crear `src/components/ui/AnimatedNumber.tsx` para KPIs
10. Instalar `framer-motion` (si no está) + envolver rutas en `AnimatePresence`

**Mantener:**
- FullCalendar como motor de calendario (solo restyle CSS)
- Sonner para toasts
- Shadcn como base de componentes
- Light theme only
- Toda la lógica/queries/RLS intacta

---

## 8. Plan de ejecución por fases

**Fase 1 — Fundación visual (sin romper nada)**
- Tokens CSS nuevos, fuentes, radios, sombras
- Variantes de Button/Card
- PageHeader component
- Resultado: app entera se ve renovada solo con cambios CSS

**Fase 2 — Layout shell**
- Sidebar y Topbar rediseñados
- Page transitions con Framer Motion

**Fase 3 — Dashboard storytelling**
- Restructura Dashboard.tsx con flujo narrativo
- AnimatedNumber en KPIs
- Eliminar DashboardObligaciones viejo
- Live indicators en widgets realtime

**Fase 4 — Pulido**
- Auth split-screen
- Empty states ilustrados
- Microinteracciones finales (confetti completion, hover refinements)
- QA visual en mobile + desktop

---

## Lo que NO cambia
- Lógica de negocio, queries, hooks (`useObligacionCumplimientos`, `useAuth`, etc.)
- Estructura de rutas y permisos RLS
- Schemas de DB
- Identidad core "Calendario Compliance · Russell Bedford"
- Motor FullCalendar
- Light theme exclusivo (no se introduce dark mode)

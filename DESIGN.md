# Calendario Compliance — Design System

**Dirección A · Expediente** · Papel + Tinta + Sello · IBM Plex Sans / Condensed / Mono · APP UI

El cumplimiento se presenta como un expediente bien llevado: folios, sellos y renglones. La jerarquía la dan las **líneas y la tipografía**, no las sombras ni los degradados. Brandbook visual: https://claude.ai/artifact/8vC7erej6jHs8S19HFpbAc

El sistema vive en `src/index.css` (variables CSS y clases utilitarias), `tailwind.config.ts` (tokens, escalas, radios, sombras) y `src/lib/brandColors.ts` (paleta categórica). Este documento explica cuándo y cómo usar cada pieza.

---

## Principios

1. **Casi monocromo.** Papel, Tinta y grises. El color se reserva para estado y para el Sello.
2. **El Sello es escaso.** Si aparece el rojo, algo exige atención o algo quedó cumplido. No lo uses como decoración.
3. **Líneas, no sombras.** Separa con bordes de 1 px; contorno de 2 px para énfasis. Las sombras solo en capas flotantes.
4. **Esquinas casi rectas.** Radio base de 4 px.
5. **Estado = color + etiqueta + icono.** Nunca solo color.
6. **Voz directa.** «El reporte anual IMMEX vence el 31 de mayo. Falta el acuse.» No «¡Ups! Tienes algo pendiente».

---

## Paleta de colores

### Marca

| Nombre | Hex | Token | Cuándo usar |
|--------|-----|-------|-------------|
| **Papel** | `#F3F3EF` | `--background` | Fondo de la app |
| **Tinta** | `#111418` | `--foreground`, `--primary` | Texto, acciones principales, estructura |
| **Folio** | `#5B616B` | `--muted-foreground` | Metadatos, descripciones, rótulos |
| **Sello** | `#C8361D` | `--sello` (`bg-sello`, `text-sello`) | Acento de marca: hoy, vencido, cumplido-con-sello |
| **Vigente** | `#1F6B45` | `--success` | Al día, completado |

### Semánticos

| Token | Valor HSL | Cuándo usar |
|-------|-----------|-------------|
| `--primary` | `214 17% 8%` | Botón principal, nav activo, texto fuerte (en oscuro se invierte a Papel) |
| `--accent` | `60 8% 88%` | **Superficie neutra de hover** en menús y listas (shadcn). **No** es el rojo de marca |
| `--sello` | `9 75% 45%` | Acento de marca. Úsalo con `bg-sello` / `text-sello` |
| `--success` | `150 55% 27%` | Tareas completadas, estados OK |
| `--warning` | `35 100% 30%` | Pendientes, vencimientos próximos |
| `--destructive` | `9 75% 42%` | Errores, acciones destructivas, vencido |
| `--urgent` | `26 90% 37%` | Solo prioridad «urgente» |
| `--band` | `214 17% 8%` | **Encabezados oscuros de marca** (héroes). No se invierte en modo oscuro |
| `--border` | `70 7% 83%` | Bordes de tarjetas y separadores |
| `--border-subtle` | `70 8% 88%` | Bordes de secciones grandes |

> **Por qué `--sello` y `--accent` son distintos.** shadcn usa `accent` como fondo de hover (más de 30 usos). Si fuera rojo, todos los menús se pintarían de rojo y el Sello dejaría de ser escaso.

### Modo oscuro
Tinta como fondo, Papel como texto, Sello más claro (`#E2553A`). `--primary` se invierte a Papel.

**Trampa conocida:** `bg-primary` + `text-white` se rompe en oscuro (Papel con texto blanco). Para encabezados oscuros fijos usa **`bg-band text-band-foreground`**, que no se invierte. Para texto sobre `bg-primary` usa `text-primary-foreground`, nunca `text-white`.

### Escalas crudas de Tailwind (remapeadas)
El código legado usa `amber-500`, `blue-100`, `purple-600`… En `tailwind.config.ts` esas escalas se redefinen a partir de cinco tonos de marca, conservando su semántica:

| Escala de Tailwind | Tono de marca |
|--------------------|---------------|
| `amber`, `orange`, `yellow` | Ocre (`#A05F00`) |
| `green`, `emerald`, `lime` | Vigente (`#1F6B45`) |
| `red`, `rose`, `pink` | Sello (`#C8361D`) |
| `blue`, `sky`, `cyan`, `teal`, `indigo` | Azul acero (`#2F6FA8`) |
| `purple`, `violet`, `fuchsia` | Ciruela (`#7A4A8C`) |

**`amber-500`, `blue-100`, etc. NO son los valores por defecto de Tailwind.** En código nuevo prefiere los tokens semánticos (`text-warning`, `bg-success/10`…); las escalas existen para no reescribir el legado.

### Paleta categórica (`src/lib/brandColors.ts`)
8 tonos para categorías de tareas y gráficas: Grafito, Sello, Vigente, Ocre, Azul acero, Ciruela, Turquesa, Café. Son hex porque se guardan en BD y se usan en SVG. Importa `BRAND_CATEGORY_COLORS`; no definas colores sueltos.

### Contraste (WCAG)

| Combinación | Ratio |
|-------------|-------|
| Tinta sobre Papel | 16.6 : 1 |
| Folio sobre Papel / sobre blanco | 5.6 / 6.2 : 1 |
| Sello sobre Papel / sobre blanco | 4.7 / 5.3 : 1 |
| Blanco sobre Sello (botón) | 5.3 : 1 |
| Vigente sobre Papel | 5.8 : 1 |
| `--warning` sobre Papel / blanco | 5.0 / 5.6 : 1 |
| Papel sobre Tinta (modo oscuro) | 16.6 : 1 |
| Sello `#E2553A` sobre Tinta | 4.9 : 1 |

Los tonos de la **paleta categórica** (p. ej. Ocre `#B87400`, 3.4 : 1) son para relleno y gráficas, **no para texto**. Para texto usa tokens semánticos.

**Regla:** nunca uses hexadecimales inline en componentes. Siempre `hsl(var(--token))` o la clase de Tailwind. Excepciones: la paleta categórica y SVG de exportación.

---

## Tipografía

| Fuente | Clase | Cuándo usar |
|--------|-------|-------------|
| IBM Plex Sans Condensed | `.font-heading` (default en `h1`–`h6`) | Títulos, KPIs, etiquetas de botón (mayúsculas) |
| IBM Plex Sans | `.font-body` (default en `body`) | Párrafos, descripciones, inputs, contenido |
| IBM Plex Mono | `.font-mono` | **Folios**: RFC, fechas, números de programa, rótulos, timestamps |

### Jerarquía de texto

```
.display-1     → 4xl/6xl, bold, MAYÚSCULAS, leading 0.95  — Titular hero (login, dashboard)
.display-2     → 3xl/4xl, bold, MAYÚSCULAS                — Títulos de página (PageHeader)
.h1 / .h2      → 5xl / 3xl, bold, MAYÚSCULAS               — Títulos por jerarquía
.h3 / .h4      → 2xl / xl, semibold, capitalización normal — Cards y widgets
.eyebrow       → mono 11px, MAYÚSCULAS, 0.08em            — Rótulo sobre títulos
.eyebrow-primary → igual, en color primary                 — Secciones con acento
.folio         → mono xs, MAYÚSCULAS, muted               — Identificadores
.sello         → condensed bold, MAYÚSCULAS, borde 2 px   — Estampa de estado
```

Sin tracking negativo en ningún nivel. Los botones van en mayúsculas condensadas (`font-heading uppercase`, 0.04em).

---

## Forma, líneas y sombras

- **Radio:** `--radius: 0.25rem` (4 px). Los radios `xl`, `2xl` y `3xl` se normalizan a este valor desde `tailwind.config.ts`.
- **`rounded-full` solo** para avatares, puntos de color, spinners y switches. Etiquetas, contadores, barras de progreso, chips y recuadros de icono son **cuadrados** (`rounded-none`).
- **Focus:** contorno de 2 px con offset de 2 px (`*:focus-visible`). Nunca `outline: none` sin reemplazo.
- **Hover:** cambia el borde u opacidad. **No** uses `hover:scale-*` ni `hover:-translate-y-*`.

| Clase | Cuándo usar |
|-------|-------------|
| `.shadow-elegant` | Sin sombra (se conserva por compatibilidad) |
| `.shadow-card`, `.shadow-editorial` | Anillo de 1 px del color de borde; sin sombra difusa |
| `.shadow-float` | Dropdowns y popovers: anillo de Tinta + una sombra corta |
| `shadow-md/lg/xl` de Tailwind | Capas flotantes únicamente |

### Degradados
**No se usan**, y ya no existen las clases `.gradient-primary`, `.gradient-hero`, `.gradient-card`, `.gradient-subtle` ni `.surface-mesh`, ni las variables `--gradient-*`. Usa `bg-primary`, `bg-card` o `bg-background`. No agregues `bg-gradient-*` ni capas `radial-gradient`. (Lo único con degradado es la animación de carga `.animate-shimmer`.)

---

## Estados

### Etiquetas de estado (`.status-*`)
Contorno de 2 px, sin relleno, mayúsculas condensadas, cuadradas. Siempre con etiqueta de texto.

| Clase | Significado |
|-------|-------------|
| `.status-vencida` | Vencida (Sello/destructivo) |
| `.status-pendiente` | Pendiente (borde discontinuo, ocre) |
| `.status-cumplida` | Cumplida (Vigente) |
| `.status-progreso` | En progreso (Tinta) |

### Loading
```tsx
<div className="rounded-[var(--radius)] border bg-card p-4 space-y-3">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-3 w-1/2" />
</div>
```

### Empty state
- Ícono centrado en un recuadro cuadrado `w-16 h-16 bg-muted` (sin `rounded-full`)
- Rótulo en mono (`.eyebrow`) + título `.font-heading font-semibold`
- Descripción `text-sm text-muted-foreground max-w-xs mx-auto`
- CTA: botón «Nueva Tarea» si puede crear, «Limpiar filtros» si hay filtros activos

### Error state
- Ícono en recuadro `bg-destructive/10`
- Mensaje amigable (no el error técnico)
- Botón «Reintentar» con `<RefreshCw />` que vuelve a llamar al fetch

---

## Logo e identificador

Componente: `src/components/brand/Logo.tsx`.

- `BrandMark`: hoja de calendario con retícula y sello de cumplido. Usa `currentColor` para el trazo (Tinta o Papel según el fondo) y `--sello` para el círculo.
- `Logo variant="stacked"` (default): marca + «CALENDARIO / COMPLIANCE» en dos líneas, con `tagline` opcional en mono.
- `Logo variant="inline"`: una línea, para encabezado móvil.

En tamaños menores a 24 px usa `<BrandMark detailed={false} />` (sin retícula interna). Favicon: `public/favicon.svg`.

---

## Progressive disclosure (listas de obligaciones)

Las listas de obligaciones/vencimientos usan **agrupación por urgencia con
disclosure progresivo** en vez de listas planas: resumen (KPIs/etiquetas) siempre
visible, detalle agrupado y colapsable debajo.

Componente compartido: `src/components/obligaciones/ObligacionesPorUrgencia.tsx`.
Agrupa cualquier lista de ítems con fecha de vencimiento en 4 secciones —
Vencidas, Urgentes, Próximas, Al día — usando `getVencimientoInfo()` de
`src/lib/obligaciones.ts`. Vencidas y Urgentes se muestran expandidas por
defecto; Próximas y Al día colapsadas.

**Cuándo usar:**
- Vistas de página completa con listas potencialmente largas (`ObligacionesActivasTab`).
- Widgets de dashboard cuando la lista supera ~8 ítems (`DashboardObligacionesMensuales`
  cae a lista simple por debajo de ese umbral — no todo necesita agrupación).
- Paneles secundarios como «Próximos 30 días» en `DashboardCalendar`.

**No usar** para listas ya cortas (≤ 8 ítems) donde el agrupamiento añade
fricción sin beneficio — en ese caso, lista simple.

Los estados completados/cumplidos van aparte, colapsados detrás de un toggle
«Ver completadas (N)» — nunca mezclados en el mismo grupo que las pendientes.

---

## Cards

### Card editorial (dashboard principal)
```tsx
<div className="card-editorial p-5">...</div>
```

### Card shadcn estándar
```tsx
<Card className="shadow-card">
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

- **Focus:** contorno de 2 px (`outline: 2px solid hsl(var(--ring))`, offset 2 px). Nunca `outline: none` sin reemplazo.
- **Touch targets:** `h-11` (44 px) en móvil, `h-8`/`h-9` en desktop.
- **Contraste:** ver la tabla de la sección «Paleta». Texto normal ≥ 4.5 : 1; texto grande y gráficos ≥ 3 : 1.
- **Estado sin depender del color:** etiqueta de texto + icono + contorno (`.status-*`).
- **ARIA:** botones de vista usan `aria-current="page"` en el activo y `aria-label` con el nombre.
- **Motion:** respetar `prefers-reduced-motion`; no agregar animaciones sin `motion-safe:`.

---

## Cuándo crear un componente nuevo vs reusar

**Reusar primero:**
- `PageTransition.tsx` para transiciones entre páginas
- `PageHeader.tsx` para títulos de página
- `EmptyState` (`src/components/ui/EmptyState.tsx`) para listas vacías
- `Logo` / `BrandMark` para cualquier uso de la marca
- `ClientOnboardingTour` como referencia de first-run
- `ObligacionesPorUrgencia.tsx` para cualquier lista de obligaciones/vencimientos
  que necesite agrupación por urgencia (ver «Progressive disclosure»)

**Crear nuevo cuando:** el patrón se repite 3+ veces con la misma estructura.

**No crear:** wrappers de un solo uso alrededor de shadcn components sin lógica propia.

---

## Fuera del sistema de la plataforma

- **Reportes PDF** (`src/lib/pdfGenerator.ts`, paleta «Russell Bedford Navy») y **correos** (`supabase/functions/_shared/email-templates.ts`, firmados por «El Equipo de Compliance de Russell Bedford») llevan la **marca del despacho**, no la de la plataforma. Es intencional: no los alinees con esta guía sin confirmarlo con el despacho. El Excel (`src/lib/excelExport.ts`) no define colores ni marca.
- **`ThemeEditor.tsx`** (Configuraciones) permite personalizar los tokens y guardarlos en `app_settings`. Hoy **no está montado** en ninguna pantalla. Sus presets son variantes de Expediente (cambian el Sello; Papel y Tinta se conservan). Si se llega a montar, ojo: lo que guarde se aplica a **todos** los usuarios y, al ir en línea sobre `<html>`, también pisa el modo oscuro.

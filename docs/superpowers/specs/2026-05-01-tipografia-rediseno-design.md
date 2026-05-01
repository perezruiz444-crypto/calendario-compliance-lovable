# Rediseño Tipográfico y Visual — Calendario Compliance
**Fecha:** 2026-05-01  
**Tipo:** Tipografía + ajuste de paleta (Opción B aprobada)  
**Objetivo:** Sensación SaaS profesional moderno + Fintech de confianza

---

## Contexto y problema

El sistema de diseño actual usa **Fraunces** (fuente serif editorial/display) para headings, lo que genera una sensación de falta de seriedad institucional en una herramienta de compliance fiscal. Adicionalmente: cards con sombras excesivas siempre activas, paleta navy demasiado oscura (#003366), rojo usado como accent general (se siente agresivo), y jerarquía tipográfica inconsistente en el codebase.

---

## Sección 1: Tipografía

### Fuentes

| Rol | Antes | Después |
|---|---|---|
| Headings | Fraunces (serif display) | **Plus Jakarta Sans** |
| Body | DM Sans | **Inter** |
| Mono | DM Mono | DM Mono (sin cambio) |

**Plus Jakarta Sans** carga desde Google Fonts. Agregar al `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

### Escala tipográfica

| Elemento | Antes | Después |
|---|---|---|
| H1 | Fraunces 2rem 700 | Plus Jakarta Sans 1.875rem 700 |
| H2 | Fraunces 1.5rem 600 | Plus Jakarta Sans 1.5rem 650 |
| H3 | Fraunces 1.25rem 600 | Plus Jakarta Sans 1.125rem 600 |
| H4 | Fraunces 1.1rem 600 | Plus Jakarta Sans 1rem 600 |
| Body | DM Sans 15px | Inter 14px |
| Small/muted | DM Sans 14px | Inter 13px |
| Labels/caps | DM Sans | Plus Jakarta Sans 11px, tracking +0.06em |

### Reglas tipográficas
- Body `letter-spacing: 0` (Inter ya está optimizada sin necesitarlo; antes era `-0.01em`)
- Headings mantienen `letter-spacing: -0.02em`
- Inputs/textarea/select: Inter 14px
- `font-heading` utility → Plus Jakarta Sans
- `font-body` utility → Inter
- FullCalendar toolbar title → Plus Jakarta Sans

---

## Sección 2: Paleta de colores

### Principios
1. Navy más luminoso — menos opresivo, más SaaS
2. Rojo únicamente para estados destructivos/alertas críticas — eliminar como accent decorativo
3. Secundario más azulado para identidad coherente

### Variables CSS actualizadas (`:root`)

| Variable | Antes | Después |
|---|---|---|
| `--primary` | `210 100% 20%` | `214 72% 30%` |
| `--primary-hover` | `210 100% 25%` | `214 72% 36%` |
| `--primary-light` | `210 60% 96%` | `214 60% 96%` |
| `--secondary` | `210 15% 95%` | `215 20% 94%` |
| `--muted-foreground` | `215 15% 45%` | `215 20% 50%` |
| `--border` | `210 20% 88%` | `214 25% 90%` |
| `--background` | `210 20% 98%` | `214 20% 98%` |
| `--sidebar-background` | `210 30% 97%` | `214 25% 96%` |

El `--accent` (`4 76% 49%`) se mantiene como valor pero su **uso en UI se restringe** a solo contextos destructivos/error. No se usa como accent visual decorativo.

### Modo oscuro
Ajustar `--primary` en `.dark` de `210 90% 52%` a `214 68% 52%` para consistencia de hue.

---

## Sección 3: Cards, Sidebar y jerarquía visual

### Cards
- **Border-radius:** `0.75rem` (subir de `0.625rem`) — actualizar `--radius` en CSS vars
- **Shadow en reposo:** `--shadow-sm` únicamente
- **Shadow al hover:** `--shadow-md` vía `hover:shadow-card` — quitar `--shadow-lg` como default siempre activo
- **Padding:** `1.5rem` consistente — estandarizar donde hay mezcla de `p-4`/`p-6`
- **`card-accent-left`:** usar solo donde haya jerarquía real de estado (vencido, en progreso), no como patrón decorativo general

### Sidebar
- Fondo: `hsl(214 25% 96%)` — casi idéntico al body, menos contraste agresivo
- Items activos: `background: hsl(214 72% 30% / 0.08)` + texto navy — reemplazar fondo sólido primario
- Separadores entre secciones: `opacity: 0.5`
- Header/logo: reducir padding vertical para compactar

### Jerarquía general
- Espacio mínimo entre secciones de página: `gap-8` (`2rem`) consistente
- Page titles: aplicar `font-heading` (Plus Jakarta Sans) explícitamente — hay componentes que usan el default sans
- Labels secundarios: usar `text-muted-foreground` de forma consistente — hay inconsistencias

---

## Archivos a modificar

1. **`public/index.html`** (o `index.html` en raíz) — agregar Google Fonts link
2. **`src/index.css`** — actualizar variables CSS, fuentes base, escala tipográfica, sidebar vars
3. **`tailwind.config.ts`** — actualizar `fontFamily.heading` y `fontFamily.body`
4. **`--radius`** en `src/index.css` — cambiar a `0.75rem`

---

## Lo que NO cambia
- Estructura de componentes
- Sistema de tokens (nombres de variables)
- Paleta de status (success, warning, destructive)
- DM Mono para datos numéricos
- Animaciones y transiciones existentes
- Modo oscuro (solo ajuste de hue en primary)

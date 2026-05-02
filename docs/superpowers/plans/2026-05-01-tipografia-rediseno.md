# Rediseño Tipográfico y Visual — Calendario Compliance

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar Fraunces + DM Sans por Plus Jakarta Sans + Inter, afinar la paleta navy, y limpiar jerarquía visual de cards/sidebar para una sensación SaaS profesional + Fintech de confianza.

**Architecture:** Todos los cambios son en capa de tokens de diseño (CSS custom properties + Tailwind config) y el HTML de carga de fuentes. No se tocan componentes de lógica ni estructura. Los cambios en `src/index.css` y `tailwind.config.ts` propagan automáticamente a toda la app.

**Tech Stack:** React + TypeScript + Tailwind CSS + shadcn/ui + Google Fonts (Plus Jakarta Sans, Inter)

---

## Mapa de archivos

| Archivo | Cambio |
|---|---|
| `index.html` | Agregar Google Fonts link (Plus Jakarta Sans + Inter) |
| `src/index.css` | Variables CSS, fuentes base, escala tipográfica, sidebar, radius, FullCalendar overrides |
| `tailwind.config.ts` | fontFamily.heading y fontFamily.body |

---

## Task 1: Cargar nuevas fuentes desde Google Fonts

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Abrir el archivo**

```
index.html (raíz del proyecto)
```

- [ ] **Step 2: Reemplazar el bloque de Google Fonts existente**

Busca en `<head>` el link que carga `DM+Sans` y/o `Fraunces` y reemplázalo completo por:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Si no existe ningún link de Google Fonts, agregar estas 3 líneas justo antes de `</head>`.

- [ ] **Step 3: Verificar en el navegador**

Abrir DevTools → Network → filtrar por "fonts.googleapis" y confirmar que los 3 preconnects y el stylesheet cargan con status 200.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(design): cargar Plus Jakarta Sans e Inter desde Google Fonts"
```

---

## Task 2: Actualizar Tailwind config con las nuevas familias tipográficas

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Abrir el archivo**

```
tailwind.config.ts (raíz del proyecto)
```

- [ ] **Step 2: Reemplazar el bloque fontFamily**

Encuentra:
```ts
fontFamily: {
  heading: ['Fraunces', 'Georgia', 'serif'],
  body: ['DM Sans', 'system-ui', 'sans-serif'],
  mono: ['DM Mono', 'monospace'],
},
```

Reemplaza por:
```ts
fontFamily: {
  heading: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
  body: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['DM Mono', 'monospace'],
},
```

- [ ] **Step 3: Verificar que Tailwind no lanza errores**

```bash
npx tsc --noEmit
```

Expected: sin errores de tipos.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(design): actualizar fontFamily en Tailwind — Plus Jakarta Sans + Inter"
```

---

## Task 3: Actualizar variables CSS — tipografía base y escala de headings

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Actualizar fuente del body**

Encuentra en `@layer base`:
```css
body {
  @apply bg-background text-foreground;
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  letter-spacing: -0.01em;
}
```

Reemplaza por:
```css
body {
  @apply bg-background text-foreground;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  letter-spacing: 0;
}
```

- [ ] **Step 2: Actualizar fuente de headings**

Encuentra:
```css
h1, h2, h3, h4, h5, h6 {
  font-family: 'Fraunces', Georgia, serif;
  font-optical-sizing: auto;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

h1 { font-size: 2rem;    font-weight: 700; }
h2 { font-size: 1.5rem;  font-weight: 600; }
h3 { font-size: 1.25rem; font-weight: 600; }
h4 { font-size: 1.1rem;  font-weight: 600; }
```

Reemplaza por:
```css
h1, h2, h3, h4, h5, h6 {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

h1 { font-size: 1.875rem; font-weight: 700; }
h2 { font-size: 1.5rem;   font-weight: 600; }
h3 { font-size: 1.125rem; font-weight: 600; }
h4 { font-size: 1rem;     font-weight: 600; }
```

- [ ] **Step 3: Actualizar fuente de inputs**

Encuentra:
```css
input, textarea, select {
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 14px;
}
```

Reemplaza por:
```css
input, textarea, select {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
}
```

- [ ] **Step 4: Actualizar utilities tipográficas**

Encuentra en `@layer utilities`:
```css
.font-heading { font-family: 'Fraunces', Georgia, serif; }
.font-body    { font-family: 'DM Sans', system-ui, sans-serif; }
```

Reemplaza por:
```css
.font-heading { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
.font-body    { font-family: 'Inter', system-ui, sans-serif; }
```

- [ ] **Step 5: Actualizar FullCalendar toolbar title**

Encuentra:
```css
.fc .fc-toolbar-title {
  font-family: 'Fraunces', Georgia, serif !important;
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  letter-spacing: -0.02em;
}
```

Reemplaza por:
```css
.fc .fc-toolbar-title {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  letter-spacing: -0.02em;
}
```

- [ ] **Step 6: Verificar en el navegador**

Abrir la app en `http://localhost:8080` (o el puerto que use Vite). Confirmar visualmente que:
- Los headings de página muestran Plus Jakarta Sans (geométrica, sin serifa)
- El body text se ve en Inter
- El calendario usa Plus Jakarta Sans en el título del mes

- [ ] **Step 7: Commit**

```bash
git add src/index.css
git commit -m "feat(design): reemplazar Fraunces/DM Sans por Plus Jakarta Sans/Inter"
```

---

## Task 4: Actualizar paleta CSS — navy más luminoso y sidebar

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Actualizar variables de color en `:root`**

Encuentra en `:root` cada variable y reemplaza los valores (mantén el resto intacto):

```css
/* Antes → Después */
--primary: 210 100% 20%;        → --primary: 214 72% 30%;
--primary-hover: 210 100% 25%;  → --primary-hover: 214 72% 36%;
--primary-light: 210 60% 96%;   → --primary-light: 214 60% 96%;
--secondary: 210 15% 95%;       → --secondary: 215 20% 94%;
--muted-foreground: 215 15% 45%; → --muted-foreground: 215 20% 50%;
--border: 210 20% 88%;          → --border: 214 25% 90%;
--background: 210 20% 98%;      → --background: 214 20% 98%;
--sidebar-background: 210 30% 97%; → --sidebar-background: 214 25% 96%;
--sidebar-border: 210 20% 87%;  → --sidebar-border: 214 20% 88%;
```

Reemplaza cada línea individualmente. El valor del `--radius` también cambia en este task:

```css
--radius: 0.625rem;  →  --radius: 0.75rem;
```

- [ ] **Step 2: Actualizar primary en modo oscuro**

Encuentra en `.dark`:
```css
--primary: 210 90% 52%;
--primary-hover: 210 90% 58%;
```

Reemplaza por:
```css
--primary: 214 68% 52%;
--primary-hover: 214 68% 58%;
```

- [ ] **Step 3: Verificar en el navegador**

Abrir la app. Confirmar que:
- El sidebar se ve con un azul-grisáceo suave (no navy puro)
- Los botones primarios se ven azul-medio (más brillante que antes)
- Las cards tienen esquinas ligeramente más redondeadas
- Activar modo oscuro y verificar que el primary también se ve más azulado

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(design): afinar paleta navy y border-radius — más luminoso y moderno"
```

---

## Task 5: Limpiar jerarquía de sombras en cards — CSS global

**Files:**
- Modify: `src/index.css`

El objetivo es que las sombras sean sutiles en reposo y solo se intensifiquen al hover. El cambio es en las utility classes existentes — no en los componentes individuales todavía.

- [ ] **Step 1: Revisar las utility classes de sombra**

Encuentra en `@layer utilities`:
```css
.shadow-elegant { box-shadow: var(--shadow-md); }
.shadow-card    { box-shadow: var(--shadow-lg); }
.shadow-float   { box-shadow: var(--shadow-xl); }
```

Reemplaza por:
```css
.shadow-elegant { box-shadow: var(--shadow-sm); }
.shadow-card    { box-shadow: var(--shadow-md); }
.shadow-float   { box-shadow: var(--shadow-lg); }
```

Esto reduce un nivel la intensidad de todas las sombras en el sistema, sin tocar cada componente.

- [ ] **Step 2: Agregar variante hover para cards**

Justo después del bloque anterior, agrega:
```css
.hover\:shadow-card:hover { box-shadow: var(--shadow-md); }
.hover\:shadow-float:hover { box-shadow: var(--shadow-lg); }
```

- [ ] **Step 3: Verificar en el navegador**

Las cards del dashboard deben verse más limpias y planas en reposo. Al pasar el cursor, deben elevarse ligeramente.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(design): reducir sombras de cards — sutiles en reposo, elevadas al hover"
```

---

## Task 6: Limpiar sidebar — items activos y separadores

**Files:**
- Modify: `src/components/layout/DashboardLayout.tsx`

- [ ] **Step 1: Leer el archivo para identificar los items activos del sidebar**

Abre `src/components/layout/DashboardLayout.tsx` y busca el patrón de clases CSS en los nav items activos. Usualmente tiene algo como `bg-primary text-primary-foreground` o `bg-sidebar-primary`.

- [ ] **Step 2: Reemplazar estilos de item activo**

Busca la clase que marca el item de nav activo. Ejemplo de lo que encontrarás:
```tsx
className={cn(
  "...",
  isActive && "bg-primary text-primary-foreground"
)}
```

Reemplaza el estado activo por:
```tsx
isActive && "bg-primary/8 text-primary font-medium"
```

Si el patrón usa variables distintas como `bg-sidebar-primary`, reemplaza por:
```tsx
isActive && "bg-[hsl(214_72%_30%/0.08)] text-primary font-medium"
```

- [ ] **Step 3: Reducir opacidad de separadores**

Busca en el mismo archivo los elementos `<Separator>` o `<hr>` dentro del sidebar y agrega `className="opacity-50"` si no lo tienen.

- [ ] **Step 4: Verificar en el navegador**

El item activo debe verse con fondo azul muy sutil (no el fondo navy sólido de antes). El texto debe ser navy. Los separadores deben verse más delicados.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/DashboardLayout.tsx
git commit -m "feat(design): sidebar — item activo con fondo sutil, separadores más delicados"
```

---

## Task 7: Verificación visual final y commit de cierre

**Files:**
- Review: toda la app en el navegador

- [ ] **Step 1: Iniciar el servidor de desarrollo**

```bash
npm run dev
```

- [ ] **Step 2: Checklist visual**

Verificar cada punto abriendo la app en el navegador:

| Elemento | ¿OK? |
|---|---|
| Headings en Plus Jakarta Sans (geométrica, sin serifa) | |
| Body text en Inter (neutral, legible) | |
| Botones primarios en azul-medio (no navy muy oscuro) | |
| Sidebar con fondo casi idéntico al body | |
| Item activo del sidebar con fondo sutil (no sólido) | |
| Cards con sombra ligera en reposo | |
| Cards con radio de borde más suave (0.75rem) | |
| Modo oscuro activo y sin roturas visuales | |
| FullCalendar toolbar en Plus Jakarta Sans | |

- [ ] **Step 3: Si hay algún componente con `font-['Fraunces']` hardcodeado**

```bash
grep -r "Fraunces\|DM Sans" src --include="*.tsx" --include="*.css"
```

Reemplazar cualquier referencia directa encontrada por `font-heading` o `font-body` respectivamente.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat(design): rediseño tipográfico y visual completado — Plus Jakarta Sans + Inter + paleta navy refinada"
```

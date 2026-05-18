# Fase 4 — Afinar todo (pulido editorial integral)

Llevamos el lenguaje "Editorial Sofisticado · Navy Trust" a cada superficie que aún se siente de la versión anterior. Sin tocar lógica de negocio: solo presentación, jerarquía, motion y consistencia tipográfica.

## Alcance por sección

### 1. Dashboard (cerrar Fase 3)
- Reemplazar tarjetas restantes (Agenda Hoy, Próximas tareas, Mensajes, Renovaciones, Compliance Semáforo) con `card-editorial`, eyebrow + título display, separadores sutiles.
- Stagger de entrada con `framer-motion` (delay incremental 0.04s).
- `DashboardObligacionesMensuales` con la misma banda visual: chips de mes en `DM Mono`, barras con `--gradient-primary`.
- Empty states con ilustración tipográfica (eyebrow + frase corta + acción).

### 2. Calendario (`/calendario` + `DashboardCalendar`)
- Header de página usando `PageHeader` (eyebrow "Agenda" + display "Calendario de Vencimientos").
- Selector de empresa como chip editorial (borde sutil, `DM Mono` para el nombre).
- Chips de tipo (obligación/tarea/documento) rediseñados: pill con punto de color, hover lift, estado activo con `shadow-editorial`.
- Refinar CSS de FullCalendar: títulos en Space Grotesk, números en DM Mono, hoy con barra lateral primary, eventos con border-left 3px y micro-hover.

### 3. Tareas (`/tareas`)
- `PageHeader` + banda KPI compacta (total, en curso, vencidas, completadas semana) con `AnimatedNumber`.
- Tabs/filtros como chips editoriales.
- Tarjetas de tarea: prioridad como border-left de color + eyebrow con categoría, fecha en DM Mono.
- Timeline/Gantt: paleta navy + accents, líneas de hoy en primary-glow.

### 4. Empresas (`/empresas` + `/empresas/:id`)
- Lista: grid editorial con `card-editorial`, logo/inicial en chip, eyebrow "RFC" + razón social display.
- Detalle: hero con nombre en display-1, eyebrow con sector, tabs estilo underline animado (`layoutId`).
- Cards internas (General, IMMEX, PROSEC, Obligaciones Activas) homogéneas con eyebrow + título.

### 5. Obligaciones / Mi Empresa
- `ObligacionDetailSheet`: header con eyebrow "Obligación · {categoría}", título display, badges de estado con paleta semántica.
- Historial de cumplimiento como timeline vertical con puntos primary.
- `/mi-empresa` (vista cliente): hero personalizado, banda KPI cliente, tabs editoriales.

### 6. Mensajes y Notificaciones
- `/mensajes`: lista tipo bandeja editorial, avatar con inicial en chip navy, asunto en Space Grotesk, snippet en DM Sans, fecha en DM Mono.
- Dropdown de notificaciones: animación fade+slide, items con border-left de color por tipo.

### 7. Reportes y Configuraciones
- `/reportes`: PageHeader + tarjetas de tipo de reporte como bento (2-3 columnas), íconos en chip, CTA primary.
- `/configuraciones`: layout 2 columnas ya existente, refinar typography y badges admin con chip eyebrow.

### 8. Auth (`/auth`, `/`, `/set-password`, `/reset-password`)
- Split-screen editorial: 60/40, panel izquierdo con `surface-mesh` + display title + eyebrow "Russell Bedford · Compliance", panel derecho con form minimalista.
- Inputs con label flotante o eyebrow encima, focus ring primary-glow.
- Botón principal con `--gradient-primary` y micro-hover.

### 9. Componentes globales
- `Button`: variante `editorial` (gradient primary + sombra editorial).
- `Badge`: variantes semánticas alineadas a tokens (success, warning, destructive, info).
- `Dialog` / `Sheet`: header con eyebrow + título display, padding consistente.
- `Empty state` reutilizable (`EmptyState.tsx`) con ícono, eyebrow, título, descripción, CTA.
- `Skeleton` con shimmer sutil en lugar de pulse plano.

### 10. Motion y micro-interacciones
- `AnimatePresence` en tabs activos (underline con `layoutId`).
- Hover lift (-translate-y-0.5 + shadow-editorial) en todas las cards interactivas.
- Página 404 rediseñada con tipografía display gigante.

## Detalles técnicos

- Nuevos archivos:
  - `src/components/ui/EmptyState.tsx`
  - `src/components/ui/EditorialTabs.tsx` (wrapper con `layoutId`)
  - `src/components/ui/KpiCard.tsx` (extrae patrón Dashboard para reutilizar)
- Sin migraciones, sin cambios de datos, sin tocar hooks de negocio.
- Mantener todas las memorias del proyecto (FullCalendar, sonner, fechas T12:00:00, `.maybeSingle()`, etc.).

## Orden de ejecución sugerido

```text
1. Globales: Button/Badge variants, EmptyState, KpiCard, EditorialTabs
2. Dashboard restante (cards + obligaciones mensuales)
3. Calendario (página + FullCalendar CSS)
4. Tareas
5. Empresas (lista + detalle)
6. Obligaciones / Mi Empresa
7. Mensajes + Notificaciones
8. Reportes + Configuraciones
9. Auth split-screen
10. 404 + pulido final
```

## Preguntas antes de arrancar
- ¿Lo hacemos en una sola pasada (todo de corrido) o por bloques con checkpoint visual entre cada uno?
- ¿Quieres que el Auth pase a split-screen completo o mantenemos el card centrado actual con solo refinamiento?

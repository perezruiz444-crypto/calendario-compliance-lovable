# Design Audit — Calendario Compliance

**Fecha:** 2026-06-07
**URL:** https://calendario-compliance.lovable.app
**Modo:** Quick + login (4 páginas: /auth, /dashboard, /empresas, /tareas)
**Clasificación:** APP UI (workspace data-dense, autenticada). /auth es híbrido (marketing + form).
**Auditor:** /design-review (gstack)

---

## Design Score: B  ·  AI Slop Score: A

App de compliance con criterio de diseño real: tipografía intencional (no genérica),
paleta sobria azul corporativa, jerarquía de información con badges de programa. Cero
patrones de AI-slop. Los problemas son de **sistematización** (escala de headings,
contraste de textos secundarios, touch targets), no de dirección de diseño.

---

## Inferred Design System (extraído del render)

- **Tipografías:** `Space Grotesk` (display/headings), `DM Sans` (body), `DM Mono` (mono).
  Tres familias intencionales. **A.** No usa Inter/Roboto/system genéricos.
- **Color:** azul corporativo profundo (#1e3a8a aprox) como primario, fondos gris muy claro,
  acentos semánticos (rojo para vencidas, verde para cumplimiento). Coherente.
- **Escala de headings (problema):** H1 48px/700 → H3 24px/600 sin H2 en el flujo. Los H3
  mezclan 16px, 20px y 24px con pesos 600 y 700. Misma etiqueta semántica, jerarquía visual
  contradictoria.

---

## Hallazgos

### FINDING-001 — [Medium] Validación nativa del browser en inglés
**Página:** /auth
Al enviar el formulario vacío aparece "Please fill out this field." (tooltip nativo del
navegador) en una app 100% en español. Delata que falta `noValidate` en el `<form>` + mensajes
de validación propios en español.
**Impacto:** el usuario ve inglés en un producto en español; rompe la percepción de pulido.
**Fix:** añadir `noValidate` al form y mostrar errores de Zod/RHF en español bajo cada campo.

### FINDING-002 — [Medium] Escala de headings no sistemática
**Páginas:** /dashboard (y consistente en el resto)
Saltos de nivel (H1→H3 sin H2) y tres tamaños distintos de H3 (16/20/24px) con pesos mezclados
(600/700). "Semáforo de Cumplimiento" es H3 16px/600 mientras otros H3 son 24px.
**Impacto:** la jerarquía visual no corresponde a la semántica; el ojo no sabe qué pesa más.
**Fix:** definir escala tipográfica con tokens (p.ej. ratio 1.25): H1 48, H2 32, H3 24, H4 20,
cada nivel un peso fijo. Usar el nivel correcto por jerarquía, no por tamaño deseado.

### FINDING-003 — [Polish] Contraste bajo en textos secundarios
**Páginas:** /auth, /dashboard
Subtexto "sin complicaciones." en azul claro sobre azul, y textos auxiliares en gris tenue
("Gestiona todas las obligaciones…", "¿Sin acceso?…", subtítulos de KPIs) rondan el límite de
WCAG AA 4.5:1.
**Impacto:** lectura difícil para baja visión; se percibe "lavado".
**Fix:** subir el gris de los textos secundarios a ≥4.5:1 sobre su fondo; verificar el azul-sobre-azul del hero.

### FINDING-004 — [Polish] Touch targets del sidebar < 44px
**Páginas:** todas (sidebar)
Botones de navegación a 40px de alto; "Ver como Cliente" 36px; "Cerrar sesión" 32px. En desktop
con mouse pasa, pero incumple el mínimo de 44px para touch.
**Impacto:** en tablet/móvil los targets quedan chicos; más errores de tap.
**Fix:** subir altura de ítems de nav a ≥44px (o `min-height: 44px` en breakpoints touch).

### FINDING-005 — [Polish] Error 401 en consola del dashboard
**Página:** /dashboard
Un recurso devolvió 401 (Unauthorized) al cargar. No rompe la vista, pero indica un request con
token inválido/expirado o un endpoint sin sesión.
**Impacto:** posible dato que no carga silenciosamente; ruido en consola.
**Fix:** identificar el request 401 (probablemente un fetch que corre antes de que el token esté
listo) y gatearlo con `authReady` antes de disparar.

---

## Lo que está bien (no tocar)

- **Cero AI-slop:** sin gradientes morados, sin grid de 3 columnas icon-in-circle, sin emojis
  decorativos, sin blobs. Score A.
- **Tipografía intencional** (Space Grotesk + DM Sans + DM Mono).
- **Jerarquía de información en /empresas:** cards con RFC + badges de programa (IMMEX/PROSEC/
  CERT IVA-IEPS) + dirección. Los badges aportan escaneo real, no decoración.
- **/tareas:** tabs de vista (Lista/Kanban/Calendario/Timeline) + filtros claros. Densidad
  apropiada para app de trabajo.
- **Login split-screen:** marca a la izquierda, un solo CTA primario, focus-visible ring azul presente.

---

## Quick Wins (orden de impacto)

1. **FINDING-001** — `noValidate` + errores en español. ~15 min. Mata la inconsistencia de idioma.
2. **FINDING-002** — tokenizar la escala de headings. ~30-45 min. El arreglo de mayor impacto visual.
3. **FINDING-003** — subir contraste de textos secundarios a AA. ~20 min.
4. **FINDING-004** — touch targets del sidebar a 44px. ~10 min.
5. **FINDING-005** — gatear el request 401 con authReady. ~15-30 min (requiere ubicar el fetch).

---

## Nota de alcance

Audit en modo quick: 4 páginas, sin responsive por página ni voces externas de Codex, para
contener costo. No se aplicó fix loop (el repo estaba en main, modo colaborativo). Páginas no
auditadas: calendario, reportes, usuarios, configuraciones, mi-empresa, detalle de empresa.
Screenshots en `.gstack-design-audit/screenshots/`.

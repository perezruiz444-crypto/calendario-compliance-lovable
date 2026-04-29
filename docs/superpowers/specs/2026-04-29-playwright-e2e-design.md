# Spec: Pruebas E2E con Playwright contra el sitio desplegado

**Fecha:** 2026-04-29
**URL objetivo:** https://calendario-compliance.lovable.app
**Framework:** Playwright

---

## Contexto

El proyecto no tiene ningún tipo de pruebas automatizadas. Los agentes aplican cambios a la base de datos y al frontend sin poder verificar que el sitio funciona correctamente después de cada push. El objetivo es tener un agente (Playwright) que navegue el sitio real desplegado como usuario, detecte regresiones y valide los flujos críticos automáticamente en cada push a `main`.

---

## Alcance

### Tipos de pruebas

| Tipo | Descripción |
|---|---|
| Smoke | Verificar que las páginas críticas cargan sin errores de consola |
| Auth | Login/logout con credenciales reales |
| E2E flujos | Crear empresa, ver calendario, ver catálogo |
| Visual | Screenshot del dashboard comparado por run |

### Páginas críticas a cubrir

- `/` — Dashboard / home
- `/empresas` — Lista de empresas
- `/calendario` — Calendario de obligaciones
- `/configuraciones` — CatalogoAdmin

---

## Arquitectura

### Estructura de archivos

```
tests/
  e2e/
    smoke.spec.ts        # 4 páginas cargan sin errores de consola
    auth.spec.ts         # login y logout
    empresas.spec.ts     # navegar a empresas, verificar lista carga
    calendario.spec.ts   # calendario carga y muestra el mes actual
  visual/
    dashboard.spec.ts    # screenshot comparativo del dashboard
playwright.config.ts     # config base con URL y credenciales
.env.test                # credenciales locales (gitignored)
```

### playwright.config.ts

- `baseURL`: `https://calendario-compliance.lovable.app`
- `testDir`: `./tests`
- Browser: Chromium (headless en CI, headed opcional en local)
- Screenshot on failure: siempre
- Video on failure: siempre
- Retries en CI: 2

### Credenciales

- Local: `.env.test` (gitignored) con `TEST_EMAIL` y `TEST_PASSWORD`
- CI: GitHub Secrets `TEST_EMAIL` y `TEST_PASSWORD`
- El agente hace login antes de cada test suite que lo requiera usando un `beforeEach` o `globalSetup`

---

## Tests detallados

### smoke.spec.ts
- Navegar a cada ruta y verificar: status 200, sin errores `console.error`, título de página correcto
- No requiere login si hay redirección al login — verifica que al menos la página de login carga

### auth.spec.ts
- Login con `TEST_EMAIL` / `TEST_PASSWORD`
- Verificar que después del login aparece el dashboard (URL cambia o elemento del dashboard visible)
- Logout y verificar redirección a login

### empresas.spec.ts
- Login → navegar a `/empresas`
- Verificar que la tabla/lista de empresas carga (al menos un elemento visible o mensaje "sin empresas")
- No crea datos: solo verifica que la página funciona

### calendario.spec.ts
- Login → navegar a `/calendario`
- Verificar que el componente FullCalendar renderiza (buscar `.fc` en el DOM)
- Verificar que el mes mostrado corresponde al mes actual

### dashboard.spec.ts (visual)
- Login → screenshot del dashboard completo
- Playwright compara contra baseline guardado en `tests/visual/snapshots/`
- En el primer run genera el baseline; en runs posteriores detecta diferencias

---

## GitHub Actions

### Workflows

**`.github/workflows/e2e.yml`** (nuevo):
- Trigger: `push` a `main` + `workflow_dispatch` (manual)
- Steps:
  1. Checkout
  2. Setup Node 20
  3. `npm ci`
  4. `npx playwright install --with-deps chromium`
  5. `npx playwright test`
  6. Upload artifacts (screenshots, videos) si falla
- Env vars desde GitHub Secrets: `TEST_EMAIL`, `TEST_PASSWORD`

---

## Qué NO incluye este MVP

- Tests de escritura/mutación (crear empresa, modificar catálogo) — riesgo de contaminar datos reales
- Tests en Firefox/Safari — solo Chromium por ahora
- Coverage de todas las páginas — solo las 4 críticas
- Integración con Slack/email para notificar fallos — queda para después

---

## Verificación

1. Correr `npx playwright test --headed` localmente para ver el agente navegar el sitio
2. Hacer push a `main` y verificar que el workflow `e2e.yml` aparece en GitHub Actions y pasa
3. Disparar manualmente desde GitHub Actions > workflow_dispatch
4. Inducir un fallo (cambiar un selector) y verificar que el CI falla y sube screenshots

# Playwright E2E — Pruebas contra sitio desplegado

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instalar Playwright y crear una suite de pruebas E2E + visual + smoke que corra contra `https://calendario-compliance.lovable.app` en cada push a `main` y de forma manual.

**Architecture:** Playwright instalado como devDependency. Un `globalSetup` hace login una sola vez y guarda el storage state para reusar en todos los tests. Los tests se organizan en `tests/e2e/` (flujos) y `tests/visual/` (screenshots). GitHub Actions ejecuta la suite en cada push a `main` y permite disparo manual.

**Tech Stack:** Playwright, TypeScript, GitHub Actions, dotenv

---

## Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `package.json` | Agregar `@playwright/test` y scripts |
| `playwright.config.ts` | Crear — config principal |
| `tests/global-setup.ts` | Crear — login global |
| `tests/e2e/smoke.spec.ts` | Crear — 4 páginas cargan |
| `tests/e2e/auth.spec.ts` | Crear — login/logout |
| `tests/e2e/empresas.spec.ts` | Crear — página empresas |
| `tests/e2e/calendario.spec.ts` | Crear — página calendario |
| `tests/visual/dashboard.spec.ts` | Crear — screenshot dashboard |
| `.github/workflows/e2e.yml` | Crear — CI workflow |
| `.env.test` | Crear — credenciales locales (gitignored) |
| `.gitignore` | Modificar — agregar entradas |

---

## Task 1: Instalar Playwright y configurar package.json

**Files:**
- Modify: `package.json`
- Create: `.env.test`
- Modify: `.gitignore`

- [ ] **Step 1: Instalar @playwright/test**

```bash
npm install --save-dev @playwright/test dotenv
```

Expected: `package.json` actualizado con `"@playwright/test"` y `"dotenv"` en devDependencies.

- [ ] **Step 2: Agregar scripts en package.json**

Abrir `package.json` y agregar dentro de `"scripts"`:

```json
"test:e2e": "playwright test",
"test:e2e:headed": "playwright test --headed",
"test:e2e:update-snapshots": "playwright test --update-snapshots"
```

- [ ] **Step 3: Crear .env.test con placeholders**

Crear el archivo `.env.test` en la raíz del proyecto:

```
TEST_EMAIL=tu-email@ejemplo.com
TEST_PASSWORD=tu-contraseña
```

- [ ] **Step 4: Actualizar .gitignore**

Agregar al final de `.gitignore`:

```
# Playwright
tests/.auth/
test-results/
playwright-report/
.env.test
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: instalar playwright y configurar scripts"
```

---

## Task 2: Crear playwright.config.ts

**Files:**
- Create: `playwright.config.ts`

- [ ] **Step 1: Crear el archivo de configuración**

Crear `playwright.config.ts` en la raíz del proyecto:

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'https://calendario-compliance.lovable.app',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.spec\.ts/,
    },
  ],

  globalSetup: undefined,
  outputDir: 'test-results/',
});
```

- [ ] **Step 2: Commit**

```bash
git add playwright.config.ts
git commit -m "chore: agregar playwright.config.ts"
```

---

## Task 3: Global setup — autenticación

**Files:**
- Create: `tests/global-setup.ts`

El `global-setup.ts` hace login una sola vez y guarda el storage state (cookies + localStorage) para que todos los tests lo reusen sin repetir el flujo de login.

- [ ] **Step 1: Crear el directorio**

```bash
mkdir -p tests/.auth tests/e2e tests/visual
```

- [ ] **Step 2: Crear tests/global-setup.ts**

```typescript
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_EMAIL y TEST_PASSWORD deben estar definidos en .env.test');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://calendario-compliance.lovable.app/auth');

  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  // Esperar a que el login complete y redirija al dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Guardar estado de autenticación
  await page.context().storageState({ path: 'tests/.auth/user.json' });

  await browser.close();
}

export default globalSetup;
```

- [ ] **Step 3: Actualizar playwright.config.ts para referenciar el global setup**

Abrir `playwright.config.ts` y reemplazar `globalSetup: undefined` con:

```typescript
globalSetup: './tests/global-setup.ts',
```

Y en el proyecto `setup`, reemplazar `testMatch` con la referencia correcta:

```typescript
projects: [
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'tests/.auth/user.json',
    },
    testMatch: /.*\.spec\.ts/,
  },
],
```

El archivo `playwright.config.ts` completo debe quedar:

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'https://calendario-compliance.lovable.app',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
      },
      testMatch: /.*\.spec\.ts/,
    },
  ],

  globalSetup: './tests/global-setup.ts',
  outputDir: 'test-results/',
});
```

- [ ] **Step 4: Instalar browser de Playwright**

```bash
npx playwright install chromium
```

Expected: Chromium descargado en `~/.cache/ms-playwright/`.

- [ ] **Step 5: Verificar que el setup funciona**

Necesitas llenar `.env.test` con tus credenciales reales antes de este paso.

```bash
npx playwright test --project=chromium tests/global-setup.ts 2>&1 || node -e "
const { chromium } = require('@playwright/test');
" 
```

Alternativamente, corre directamente:
```bash
node -e "require('dotenv').config({path:'.env.test'}); console.log('EMAIL:', process.env.TEST_EMAIL ? 'OK' : 'MISSING')"
```

Expected: `EMAIL: OK`

- [ ] **Step 6: Commit**

```bash
git add tests/global-setup.ts playwright.config.ts
git commit -m "chore: agregar global setup de autenticacion para playwright"
```

---

## Task 4: Smoke tests

**Files:**
- Create: `tests/e2e/smoke.spec.ts`

Verifica que las 4 páginas críticas cargan sin errores de consola.

- [ ] **Step 1: Crear tests/e2e/smoke.spec.ts**

```typescript
import { test, expect } from '@playwright/test';

const RUTAS = [
  { path: '/dashboard', titulo: 'dashboard' },
  { path: '/empresas', titulo: 'empresas' },
  { path: '/calendario', titulo: 'calendario' },
  { path: '/configuraciones', titulo: 'configuraciones' },
];

for (const ruta of RUTAS) {
  test(`smoke: ${ruta.path} carga sin errores`, async ({ page }) => {
    const errores: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errores.push(msg.text());
    });
    page.on('pageerror', err => errores.push(err.message));

    await page.goto(ruta.path);
    await page.waitForLoadState('networkidle');

    // Verificar que la página cargó (no redirigió a /auth)
    expect(page.url()).not.toContain('/auth');

    // Verificar que no hay errores de consola críticos
    // Filtramos errores conocidos de terceros (Supabase realtime, etc.)
    const erroresCriticos = errores.filter(e =>
      !e.includes('WebSocket') &&
      !e.includes('supabase') &&
      !e.includes('Failed to fetch')
    );
    expect(erroresCriticos, `Errores en ${ruta.path}: ${erroresCriticos.join(', ')}`).toHaveLength(0);
  });
}
```

- [ ] **Step 2: Correr los smoke tests**

```bash
npm run test:e2e -- tests/e2e/smoke.spec.ts
```

Expected: 4 tests PASSED. Si alguno falla, revisar la URL o el storageState.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "test: agregar smoke tests para 4 páginas críticas"
```

---

## Task 5: Auth tests

**Files:**
- Create: `tests/e2e/auth.spec.ts`

Estos tests NO usan el `storageState` — prueban el flujo de login/logout en sí.

- [ ] **Step 1: Crear tests/e2e/auth.spec.ts**

```typescript
import { test, expect, chromium } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Estos tests corren sin storageState — prueban el flujo de auth
test.use({ storageState: { cookies: [], origins: [] } });

test('auth: login exitoso lleva al dashboard', async ({ page }) => {
  await page.goto('/auth');

  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();

  await page.fill('#email', process.env.TEST_EMAIL!);
  await page.fill('#password', process.env.TEST_PASSWORD!);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  expect(page.url()).toContain('/dashboard');
});

test('auth: logout redirige a /auth', async ({ page }) => {
  // Este test empieza desde el dashboard (storageState está limpio, usamos login manual)
  await page.goto('/auth');
  await page.fill('#email', process.env.TEST_EMAIL!);
  await page.fill('#password', process.env.TEST_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Hacer click en "Cerrar sesión"
  await page.getByText('Cerrar sesión').click();

  await page.waitForURL('**/auth', { timeout: 10000 });
  expect(page.url()).toContain('/auth');
});
```

- [ ] **Step 2: Correr auth tests**

```bash
npm run test:e2e -- tests/e2e/auth.spec.ts
```

Expected: 2 tests PASSED.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/auth.spec.ts
git commit -m "test: agregar tests de login y logout"
```

---

## Task 6: E2E flujos críticos

**Files:**
- Create: `tests/e2e/empresas.spec.ts`
- Create: `tests/e2e/calendario.spec.ts`

- [ ] **Step 1: Crear tests/e2e/empresas.spec.ts**

```typescript
import { test, expect } from '@playwright/test';

test('empresas: página carga con botón nueva empresa visible', async ({ page }) => {
  await page.goto('/empresas');
  await page.waitForLoadState('networkidle');

  // El botón "+ Nueva Empresa" siempre está presente independiente de si hay datos
  await expect(page.getByText('Nueva Empresa')).toBeVisible({ timeout: 10000 });

  // La URL no redirigió a auth
  expect(page.url()).not.toContain('/auth');
});
```

- [ ] **Step 2: Crear tests/e2e/calendario.spec.ts**

```typescript
import { test, expect } from '@playwright/test';

test('calendario: FullCalendar renderiza con el mes actual', async ({ page }) => {
  await page.goto('/calendario');
  await page.waitForLoadState('networkidle');

  // FullCalendar siempre agrega la clase .fc al contenedor raíz
  await expect(page.locator('.fc')).toBeVisible({ timeout: 10000 });

  // Verificar que el mes actual aparece en el header del calendario
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const mesActual = meses[new Date().getMonth()];

  const headerText = await page.locator('.fc-toolbar-title').textContent();
  expect(headerText?.toLowerCase()).toContain(mesActual);
});
```

- [ ] **Step 3: Correr los tests de flujo**

```bash
npm run test:e2e -- tests/e2e/empresas.spec.ts tests/e2e/calendario.spec.ts
```

Expected: 2 tests PASSED.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/empresas.spec.ts tests/e2e/calendario.spec.ts
git commit -m "test: agregar tests E2E de empresas y calendario"
```

---

## Task 7: Visual regression — screenshot del dashboard

**Files:**
- Create: `tests/visual/dashboard.spec.ts`

- [ ] **Step 1: Crear tests/visual/dashboard.spec.ts**

```typescript
import { test, expect } from '@playwright/test';

test('visual: dashboard coincide con el baseline', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Esperar a que el saludo esté visible (confirma que los datos cargaron)
  await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

  // Screenshot de la página completa para comparación visual
  await expect(page).toMatchSnapshot('dashboard-full.png', {
    maxDiffPixelRatio: 0.02, // 2% de diferencia permitida
  });
});
```

- [ ] **Step 2: Generar el baseline (primera vez)**

```bash
npm run test:e2e:update-snapshots -- tests/visual/dashboard.spec.ts
```

Expected: Crea `tests/visual/dashboard.spec.ts-snapshots/dashboard-full-chromium-darwin.png` (o similar con el OS).

- [ ] **Step 3: Correr el test visual para verificar que pasa**

```bash
npm run test:e2e -- tests/visual/dashboard.spec.ts
```

Expected: 1 test PASSED (compara contra el baseline recién creado).

- [ ] **Step 4: Agregar snapshots al gitignore o al repo**

Los snapshots de baseline **deben commitearse** para que CI pueda compararlos.

```bash
git add tests/visual/dashboard.spec.ts tests/visual/dashboard.spec.ts-snapshots/
git commit -m "test: agregar test visual del dashboard con baseline"
```

---

## Task 8: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/e2e.yml`

- [ ] **Step 1: Verificar que el directorio existe**

```bash
ls .github/workflows/
```

Expected: lista de archivos (ya existe el directorio por los workflows anteriores).

- [ ] **Step 2: Crear .github/workflows/e2e.yml**

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test
        env:
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
          CI: true

      - name: Upload test results on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-results
          path: |
            test-results/
            playwright-report/
          retention-days: 7
```

- [ ] **Step 3: Commit y push**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci: agregar workflow de Playwright E2E en GitHub Actions"
```

- [ ] **Step 4: Agregar secrets en GitHub**

En el repositorio de GitHub:
1. Ir a Settings → Secrets and variables → Actions
2. Crear secret `TEST_EMAIL` con tu email
3. Crear secret `TEST_PASSWORD` con tu contraseña

---

## Task 9: Verificación final

- [ ] **Step 1: Correr toda la suite localmente**

Asegúrate de tener `.env.test` con credenciales reales y luego:

```bash
npm run test:e2e
```

Expected: 8 tests PASSED (4 smoke + 2 auth + 2 flujo + 1 visual).

- [ ] **Step 2: Push a main y verificar CI**

```bash
git push origin main
```

Luego ir a GitHub → Actions → workflow `E2E Tests` → verificar que pasa.

- [ ] **Step 3: Verificar disparo manual**

En GitHub → Actions → E2E Tests → "Run workflow" → Run workflow. Verificar que pasa.

- [ ] **Step 4: Simular fallo (opcional pero recomendado)**

Cambiar temporalmente en `smoke.spec.ts` la ruta `/dashboard` por `/dashboard-inexistente` y correr los tests:

```bash
npm run test:e2e -- tests/e2e/smoke.spec.ts
```

Expected: 1 test FAILED con screenshot guardado en `test-results/`. Revertir el cambio después.

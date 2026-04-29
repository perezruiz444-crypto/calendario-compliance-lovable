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

    // Filtrar errores conocidos de terceros
    const erroresCriticos = errores.filter(e =>
      !e.includes('WebSocket') &&
      !e.includes('supabase') &&
      !e.includes('Failed to fetch')
    );
    expect(erroresCriticos, `Errores en ${ruta.path}: ${erroresCriticos.join(', ')}`).toHaveLength(0);
  });
}

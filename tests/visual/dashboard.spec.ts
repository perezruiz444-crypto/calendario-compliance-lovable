import { test, expect } from '@playwright/test';

test('visual: dashboard coincide con el baseline', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Esperar a que el saludo esté visible (confirma que los datos cargaron)
  await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

  // Screenshot de la página completa para comparación visual
  const screenshot = await page.screenshot({ fullPage: true });
  expect(screenshot).toMatchSnapshot('dashboard-full.png', {
    maxDiffPixelRatio: 0.02,
  });
});

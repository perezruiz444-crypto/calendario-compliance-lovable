import { test, expect } from '@playwright/test';

test('empresas: página carga con botón nueva empresa visible', async ({ page }) => {
  await page.goto('/empresas');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Nueva Empresa')).toBeVisible({ timeout: 10000 });

  expect(page.url()).not.toContain('/auth');
});

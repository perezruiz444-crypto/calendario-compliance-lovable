import { test, expect } from '@playwright/test';

test('calendario: FullCalendar renderiza con el mes actual', async ({ page }) => {
  await page.goto('/calendario');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('.fc')).toBeVisible({ timeout: 10000 });

  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const mesActual = meses[new Date().getMonth()];

  const headerText = await page.locator('.fc-toolbar-title').textContent();
  expect(headerText?.toLowerCase()).toContain(mesActual);
});

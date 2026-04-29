import { test, expect } from '@playwright/test';
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
  await page.goto('/auth');
  await page.fill('#email', process.env.TEST_EMAIL!);
  await page.fill('#password', process.env.TEST_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Disparar logout via JS para evitar que el iframe de hCaptcha intercepte el click
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const logoutBtn = btns.find(b => b.textContent?.includes('Cerrar sesión'));
    logoutBtn?.click();
  });

  await page.waitForURL('**/auth', { timeout: 10000 });
  expect(page.url()).toContain('/auth');
});

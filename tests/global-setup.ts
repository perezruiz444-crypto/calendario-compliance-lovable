import { chromium, FullConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

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

import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'tests/browser/.auth/session.json';

setup.setTimeout(60000);

setup('login once and save session', async ({ page, context }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Wait for inputs to be visible and fill them
  await page.locator('#email').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#password').waitFor({ state: 'visible', timeout: 5000 });
  await page.fill('#email', 'demo@realestatecrm.com');
  await page.fill('#password', 'demo1234');
  // Verify password was filled
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /sign in/i }).first().click();

  // Poll until session cookie appears (httpOnly, so check via context.cookies)
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const cookies = await context.cookies();
    const hasSession = cookies.some(c => c.name === 'authjs.session-token');
    if (hasSession) break;
  }

  // Verify session cookie exists
  const cookies = await context.cookies();
  const sessionCookie = cookies.find(c => c.name === 'authjs.session-token');
  expect(sessionCookie).toBeTruthy();

  // Save authenticated state
  await context.storageState({ path: AUTH_FILE });
});

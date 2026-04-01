import { test, expect } from '@playwright/test';
import { loginAsDemo, getEntityUrl } from '../helpers/auth';

const DESKTOP = { width: 1280, height: 720 };
const MOBILE = { width: 375, height: 812 };
const MAX_DIFF_RATIO = 0.05;

/* ------------------------------------------------------------------ */
/*  C19 — Visual Regression Screenshots                                */
/* ------------------------------------------------------------------ */

test.describe('C19 — Visual Regression', () => {

  /* ================================================================ */
  /*  Login page (no auth needed)                                      */
  /* ================================================================ */

  test('login desktop screenshot', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveScreenshot('login-desktop.png', {
      maxDiffPixelRatio: MAX_DIFF_RATIO,
    });
  });

  test('login mobile screenshot', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveScreenshot('login-mobile.png', {
      maxDiffPixelRatio: MAX_DIFF_RATIO,
    });
  });

  /* ================================================================ */
  /*  Authenticated pages                                              */
  /* ================================================================ */

  const routes: [string, string][] = [
    ['/', 'dashboard'],
    ['/listings', 'listings'],
    ['/contacts', 'contacts'],
    ['/showings', 'showings'],
    ['/calendar', 'calendar'],
    ['/newsletters', 'newsletters'],
    ['/content', 'content'],
  ];

  const REDIRECTING_ROUTES = ['/listings', '/contacts', '/showings', '/pipeline', '/content'];

  for (const [route, name] of routes) {
    test(`${name} desktop screenshot`, async ({ page }) => {
      await loginAsDemo(page);
      await page.setViewportSize(DESKTOP);
      if (REDIRECTING_ROUTES.includes(route)) {
        const url = await getEntityUrl(page, route);
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
      } else {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
      }
      // Wait for any animations/transitions to settle
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`${name}-desktop.png`, {
        maxDiffPixelRatio: MAX_DIFF_RATIO,
      });
    });

    test(`${name} mobile screenshot`, async ({ page }) => {
      await loginAsDemo(page);
      await page.setViewportSize(MOBILE);
      if (REDIRECTING_ROUTES.includes(route)) {
        const url = await getEntityUrl(page, route);
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
      } else {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
      }
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`${name}-mobile.png`, {
        maxDiffPixelRatio: MAX_DIFF_RATIO,
      });
    });
  }

  /* ================================================================ */
  /*  Component-level screenshots                                      */
  /* ================================================================ */

  test('dashboard pipeline cards desktop screenshot', async ({ page }) => {
    await loginAsDemo(page);
    await page.setViewportSize(DESKTOP);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const pipeline = page.locator('[data-testid="pipeline"], .lf-card').first();
    const visible = await pipeline.isVisible().catch(() => false);
    if (visible) {
      await expect(pipeline).toHaveScreenshot('dashboard-pipeline-desktop.png', {
        maxDiffPixelRatio: MAX_DIFF_RATIO,
      });
    }
  });

  test('navigation bar desktop screenshot', async ({ page }) => {
    await loginAsDemo(page);
    await page.setViewportSize(DESKTOP);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const nav = page.locator('header, nav, .lf-glass').first();
    const visible = await nav.isVisible().catch(() => false);
    if (visible) {
      await expect(nav).toHaveScreenshot('navbar-desktop.png', {
        maxDiffPixelRatio: MAX_DIFF_RATIO,
      });
    }
  });

  test('navigation bar mobile screenshot', async ({ page }) => {
    await loginAsDemo(page);
    await page.setViewportSize(MOBILE);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const nav = page.locator('header, nav, .lf-glass').first();
    const visible = await nav.isVisible().catch(() => false);
    if (visible) {
      await expect(nav).toHaveScreenshot('navbar-mobile.png', {
        maxDiffPixelRatio: MAX_DIFF_RATIO,
      });
    }
  });

  test('listings page card layout desktop screenshot', async ({ page }) => {
    await loginAsDemo(page);
    await page.setViewportSize(DESKTOP);
    const url = await getEntityUrl(page, '/listings');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Capture just the main content area
    const main = page.locator('main, [role="main"]').first();
    const visible = await main.isVisible().catch(() => false);
    if (visible) {
      await expect(main).toHaveScreenshot('listings-cards-desktop.png', {
        maxDiffPixelRatio: MAX_DIFF_RATIO,
      });
    }
  });
});

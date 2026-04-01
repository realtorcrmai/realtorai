import { test, expect } from '@playwright/test';
import { loginAsDemo, getEntityUrl, getFirstEntityId } from '../helpers/auth';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const LOAD_THRESHOLD_MS = 15000; // dev mode tolerance (includes login overhead + SSR compile)

/* ------------------------------------------------------------------ */
/*  C14 — Page Load Performance                                        */
/* ------------------------------------------------------------------ */

test.describe('C14 — Page Load Performance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  /* ---- Non-redirecting routes ---- */

  const nonRedirectRoutes: [string, string][] = [
    ['/', 'dashboard'],
    ['/calendar', 'calendar'],
    ['/newsletters', 'newsletters'],
    ['/tasks', 'tasks'],
    ['/settings', 'settings'],
    ['/search', 'search'],
  ];

  for (const [route, name] of nonRedirectRoutes) {
    test(`${name} (${route}) loads within ${LOAD_THRESHOLD_MS}ms`, async ({ page }) => {
      const start = Date.now();
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const elapsed = Date.now() - start;

      console.log(`  ${name}: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(LOAD_THRESHOLD_MS);
    });
  }

  /* ---- Redirecting routes — resolve to entity URL first ---- */

  const redirectRoutes: [string, string][] = [
    ['/listings', 'listings'],
    ['/contacts', 'contacts'],
    ['/showings', 'showings'],
    ['/pipeline', 'pipeline'],
    ['/content', 'content'],
  ];

  for (const [route, name] of redirectRoutes) {
    test(`${name} (${route}) loads within ${LOAD_THRESHOLD_MS}ms`, async ({ page }) => {
      const url = await getEntityUrl(page, route);
      const start = Date.now();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const elapsed = Date.now() - start;

      console.log(`  ${name}: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(LOAD_THRESHOLD_MS);
    });
  }

  /* ---- Public route ---- */

  test('login page loads within threshold', async ({ page }) => {
    const start = Date.now();
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const domContentLoaded = Date.now() - start;

    await page.waitForLoadState('load');
    const fullLoad = Date.now() - start;

    console.log(`  login: DOMContentLoaded=${domContentLoaded}ms, load=${fullLoad}ms`);
    expect(fullLoad).toBeLessThan(LOAD_THRESHOLD_MS);
  });

  /* ---- Network request count ---- */

  const heavyPages: [string, string][] = [
    ['/', 'dashboard'],
    ['/listings', 'listings'],
    ['/contacts', 'contacts'],
    ['/newsletters', 'newsletters'],
    ['/showings', 'showings'],
  ];

  for (const [route, name] of heavyPages) {
    test(`${name} page does not trigger excessive network requests (<50)`, async ({ page }) => {
      const requests: string[] = [];
      page.on('request', (req) => {
        requests.push(req.url());
      });

      const url = await getEntityUrl(page, route);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      console.log(`  ${name}: ${requests.length} network requests`);
      expect(requests.length).toBeLessThan(50);
    });
  }

  /* ---- Pagination / virtual scroll on list pages ---- */

  test('listings page has pagination or limited initial render', async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const hasPagination = await page.locator(
      '[aria-label*="pagination"], [aria-label*="page"], button:has-text("Next"), button:has-text("Load more"), [data-pagination]'
    ).count();

    const listItemCount = await page.locator(
      '[data-listing-card], .lf-card, tr[data-row], article'
    ).count();

    // Either pagination exists or items are capped at a reasonable number
    const isReasonable = hasPagination > 0 || listItemCount <= 50;
    expect(isReasonable).toBe(true);
  });

  test('contacts page has pagination or limited initial render', async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const hasPagination = await page.locator(
      '[aria-label*="pagination"], [aria-label*="page"], button:has-text("Next"), button:has-text("Load more"), [data-pagination]'
    ).count();

    const listItemCount = await page.locator(
      '[data-contact-card], .lf-card, tr[data-row], article'
    ).count();

    const isReasonable = hasPagination > 0 || listItemCount <= 50;
    expect(isReasonable).toBe(true);
  });

  /* ---- Performance API metrics ---- */

  test('dashboard first contentful paint is reasonable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    const fcp = await page.evaluate(() => {
      const entries = performance.getEntriesByName('first-contentful-paint');
      return entries.length > 0 ? entries[0].startTime : null;
    });

    if (fcp !== null) {
      console.log(`  Dashboard FCP: ${fcp.toFixed(0)}ms`);
      // In dev mode, FCP can be slow — use generous threshold
      expect(fcp).toBeLessThan(5000);
    }
  });

  test('listings page first contentful paint is reasonable', async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const fcp = await page.evaluate(() => {
      const entries = performance.getEntriesByName('first-contentful-paint');
      return entries.length > 0 ? entries[0].startTime : null;
    });

    if (fcp !== null) {
      console.log(`  Listings FCP: ${fcp.toFixed(0)}ms`);
      expect(fcp).toBeLessThan(5000);
    }
  });
});

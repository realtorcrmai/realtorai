/**
 * Warmup project — forces Turbopack to compile every route chunk once,
 * BEFORE the parallel test workers race for cold compiles.
 *
 * Without this, the first worker to hit /newsletters (etc.) stalls the page
 * on "Compiling..." for 15-30s, and every other worker's assertion times out.
 *
 * This project depends on `setup` (which writes the auth session) and is
 * itself a dependency of `desktop`/`mobile`, so it runs exactly once, serially,
 * with the authenticated session loaded.
 */
import { test as warmup } from '@playwright/test';
import { E2E_CONTACT_ID, E2E_LISTING_ID, E2E_SHOWING_ID } from '../fixtures/test-ids';

warmup.setTimeout(300_000); // up to 5 min for cold-compile of all routes

const ROUTES: Array<{ path: string; waitFor?: string }> = [
  { path: '/' },
  { path: '/contacts' },
  { path: `/contacts/${E2E_CONTACT_ID}` },
  { path: '/listings' },
  { path: `/listings/${E2E_LISTING_ID}` },
  { path: '/showings' },
  { path: `/showings/${E2E_SHOWING_ID}` },
  { path: '/calendar' },
  { path: '/newsletters' },
  { path: '/content' },
  { path: '/tasks' },
  { path: '/automations' },
  { path: '/forms' },
  { path: '/search' },
  { path: '/import' },
  { path: '/settings' },
  { path: '/settings/team' },
];

warmup('compile every route (Turbopack warmup)', async ({ page }) => {
  for (const route of ROUTES) {
    try {
      await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      // Wait for either an h1 or main to be attached — confirms page compiled
      await page.locator('main, h1').first().waitFor({ state: 'attached', timeout: 45_000 });
      // Tiny settle so any subsequent compile-on-nav finishes
      await page.waitForTimeout(200);
       
      console.log(`✓ warmed ${route.path}`);
    } catch (err) {
      // Log and continue — a missing route should not break the whole suite
       
      console.warn(`⚠ warmup failed for ${route.path}: ${(err as Error).message}`);
    }
  }
});

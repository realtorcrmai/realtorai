import { Page } from '@playwright/test';

/**
 * Login is handled globally by auth.setup.ts + storageState.
 * This function is now a no-op — kept for backward compatibility.
 * Tests automatically have the session cookie from storageState.
 */
export async function loginAsDemo(_page: Page) {
  // Auth is pre-loaded via playwright.config.ts storageState
  // No browser login needed per test
}

/**
 * Get a valid entity ID from the database via API.
 */
export async function getFirstEntityId(page: Page, table: string): Promise<string> {
  const response = await page.request.get(`/api/${table}?limit=1`);
  const data = await response.json();
  return data?.[0]?.id || '';
}

/**
 * For routes that server-redirect (e.g. /listings -> /listings/[id]),
 * resolve to a direct entity URL to avoid page.goto hanging.
 */
export async function getEntityUrl(page: Page, route: string): Promise<string> {
  const REDIRECT_ROUTES: Record<string, string> = {
    '/listings': 'listings',
    '/contacts': 'contacts',
    '/showings': 'showings',
    '/pipeline': 'listings',
    '/content': 'listings',
  };
  const table = REDIRECT_ROUTES[route];
  if (table) {
    const id = await getFirstEntityId(page, table);
    return id ? `${route}/${id}` : route;
  }
  return route;
}

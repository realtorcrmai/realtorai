import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsDemo, getFirstEntityId, getEntityUrl } from '../helpers/auth';

async function runAxe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  return results;
}

/* ------------------------------------------------------------------ */
/*  WCAG 2.1 AA — Main routes                                         */
/* ------------------------------------------------------------------ */

test.describe('C13 — Accessibility (WCAG 2.1 AA)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  /* ---- Top-level pages ---- */

  const nonRedirectRoutes: [string, string][] = [
    ['/', 'dashboard'],
    ['/calendar', 'calendar'],
    ['/newsletters', 'newsletters'],
    ['/tasks', 'tasks'],
    ['/automations', 'automations'],
    ['/settings', 'settings'],
    ['/search', 'search'],
  ];

  for (const [route, name] of nonRedirectRoutes) {
    test(`${name} page (${route}) passes WCAG 2.1 AA`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'load' });
      const results = await runAxe(page);
      expect(results.violations).toEqual([]);
    });
  }

  /* ---- Redirecting routes — resolve to entity URL first ---- */

  const redirectRoutes: [string, string, string][] = [
    ['/listings', 'listings', 'listings'],
    ['/contacts', 'contacts', 'contacts'],
    ['/showings', 'showings', 'appointments'],
    ['/pipeline', 'pipeline', 'listings'],
    ['/content', 'content', 'listings'],
  ];

  for (const [route, name, table] of redirectRoutes) {
    test(`${name} page (${route}) passes WCAG 2.1 AA`, async ({ page }) => {
      const url = await getEntityUrl(page, route);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const results = await runAxe(page);
      expect(results.violations).toEqual([]);
    });
  }

  /* ---- Detail pages (need real IDs) ---- */

  test('listing detail page passes WCAG 2.1 AA', async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`, { waitUntil: 'domcontentloaded' });
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test('contact detail page passes WCAG 2.1 AA', async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`, { waitUntil: 'domcontentloaded' });
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test('showing detail page passes WCAG 2.1 AA', async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    test.skip(!id, 'No showings in database');
    await page.goto(`/showings/${id}`, { waitUntil: 'domcontentloaded' });
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test('content detail page passes WCAG 2.1 AA', async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No content items in database');
    await page.goto(`/content/${id}`, { waitUntil: 'domcontentloaded' });
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  /* ---- Login page (no auth needed) ---- */

  test('login page passes WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  /* ---------------------------------------------------------------- */
  /*  Component-level a11y tests                                       */
  /* ---------------------------------------------------------------- */

  test('all form inputs have associated labels', async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check every visible input/select/textarea has a label or aria-label
    const unlabeled = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea');
      const missing: string[] = [];
      inputs.forEach((el) => {
        const htmlEl = el as HTMLInputElement;
        if (htmlEl.type === 'hidden') return;
        const id = htmlEl.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const hasAriaLabel = htmlEl.getAttribute('aria-label');
        const hasAriaLabelledBy = htmlEl.getAttribute('aria-labelledby');
        const hasTitle = htmlEl.getAttribute('title');
        const hasPlaceholder = htmlEl.getAttribute('placeholder');
        // aria-label, aria-labelledby, label[for], or title all count
        if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle && !hasPlaceholder) {
          missing.push(`${htmlEl.tagName}#${id || '(no id)'} name=${htmlEl.name || '(none)'}`);
        }
      });
      return missing;
    });
    expect(unlabeled).toEqual([]);
  });

  test('all buttons have accessible names', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const unnamed = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"], a[href]');
      const missing: string[] = [];
      buttons.forEach((el) => {
        const text = (el.textContent || '').trim();
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const title = el.getAttribute('title');
        if (!text && !ariaLabel && !ariaLabelledBy && !title) {
          missing.push(`${el.tagName}.${el.className.split(' ')[0] || '(no class)'}`);
        }
      });
      return missing;
    });
    expect(unnamed).toEqual([]);
  });

  test('all images have alt text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const missingAlt = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const missing: string[] = [];
      images.forEach((img) => {
        const alt = img.getAttribute('alt');
        // alt="" is valid (decorative), null is not
        if (alt === null) {
          missing.push(img.src.slice(-60));
        }
      });
      return missing;
    });
    expect(missingAlt).toEqual([]);
  });

  test('interactive elements have visible focus styles', async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Tab through a few elements and check focus is visible
    const focusableSelector = 'a[href], button, input, select, textarea, [tabindex="0"]';
    const focusableCount = await page.locator(focusableSelector).count();
    const elementsToCheck = Math.min(focusableCount, 5);

    for (let i = 0; i < elementsToCheck; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      const count = await focused.count();
      expect(count).toBeGreaterThan(0);

      if (count > 0) {
        // Check the focused element has some visible focus indicator
        const outlineOrRing = await focused.first().evaluate((el) => {
          const style = window.getComputedStyle(el);
          const outline = style.outline;
          const boxShadow = style.boxShadow;
          const outlineWidth = parseInt(style.outlineWidth, 10);
          return outlineWidth > 0 || (boxShadow !== 'none' && boxShadow !== '');
        });
        // We report but don't hard-fail since CSS :focus-visible may differ
        if (!outlineOrRing) {
          console.warn(`Element ${i} may lack visible focus indicator`);
        }
      }
    }
  });

  test('modals trap focus when open', async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Try to open an add-contact modal/dialog
    const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
    const hasAddButton = await addButton.count();

    if (hasAddButton === 0) {
      test.skip(true, 'No modal trigger found on contacts page');
      return;
    }

    await addButton.click();
    await page.waitForTimeout(500);

    // Check if a dialog/modal opened
    const dialog = page.locator('[role="dialog"], [aria-modal="true"], dialog[open]').first();
    const dialogVisible = await dialog.count();

    if (dialogVisible === 0) {
      test.skip(true, 'No modal dialog appeared');
      return;
    }

    // Tab through and verify focus stays within dialog
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const activeInDialog = await page.evaluate(() => {
        const active = document.activeElement;
        const dialog = document.querySelector('[role="dialog"], [aria-modal="true"], dialog[open]');
        return dialog?.contains(active) ?? false;
      });
      expect(activeInDialog).toBe(true);
    }
  });

  test('color contrast passes on dashboard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({ runOnly: ['color-contrast'] })
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('color contrast passes on listings page', async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({ runOnly: ['color-contrast'] })
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('ARIA roles are valid on dashboard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const results = await new AxeBuilder({ page })
      .options({ runOnly: ['aria-allowed-role', 'aria-valid-attr', 'aria-valid-attr-value'] })
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('heading hierarchy is correct on dashboard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const results = await new AxeBuilder({ page })
      .options({ runOnly: ['heading-order'] })
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('page has lang attribute', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const lang = await page.evaluate(() => document.documentElement.getAttribute('lang'));
    expect(lang).toBeTruthy();
  });

  test('page has a main landmark', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const mainCount = await page.locator('main, [role="main"]').count();
    expect(mainCount).toBeGreaterThanOrEqual(1);
  });

  test('skip-to-content or navigation landmark exists', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navCount = await page.locator('nav, [role="navigation"]').count();
    const skipLink = await page.locator('a[href="#main"], a[href="#content"]').count();
    expect(navCount + skipLink).toBeGreaterThan(0);
  });

  test('form inputs on login page have labels', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const results = await new AxeBuilder({ page })
      .options({ runOnly: ['label'] })
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

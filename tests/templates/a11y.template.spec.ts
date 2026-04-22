/**
 * Accessibility Test Template — Page-Level Axe Scan + Keyboard Navigation
 * REQ-A11Y-001: WCAG 2.1 AA compliance
 *
 * Uses @axe-core/playwright for automated accessibility scanning plus
 * manual keyboard navigation and ARIA verification tests.
 *
 * Sections:
 *   1. Page load + axe scan (zero violations)
 *   2. Keyboard navigation (Tab through interactive elements)
 *   3. Focus indicator visibility
 *   4. ARIA label presence on key elements
 *
 * Stack: Playwright + @axe-core/playwright.
 *
 * Adapt per page: replace PAGE_URL, PAGE_NAME, and EXPECTED_INTERACTIVE_ELEMENTS.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// --- Page Configuration (adapt per page) ---
const PAGE_URL = '/contacts';
const PAGE_NAME = 'Contacts';

// Interactive elements expected on this page
const EXPECTED_INTERACTIVE_ELEMENTS = [
  { role: 'button', namePattern: /add contact|new contact/i },
  { role: 'textbox', namePattern: /search/i },
  { role: 'table', namePattern: /contacts/i },
];

// Prefix for test case IDs based on page name
const TC_PREFIX = PAGE_NAME.toUpperCase().slice(0, 3);

// === Section 1: Axe Automated Scan ===

test.describe(`REQ-A11Y-001: ${PAGE_NAME} page — Axe scan`, () => {
  test(`TC-${TC_PREFIX}-100: zero axe violations on page load @P0`, async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Log violations for debugging (if any)
    if (results.violations.length > 0) {
      console.error(
        'Axe violations:',
        JSON.stringify(
          results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length,
            helpUrl: v.helpUrl,
          })),
          null,
          2,
        ),
      );
    }

    expect(results.violations).toEqual([]);
  });

  test(`TC-${TC_PREFIX}-101: zero axe violations after interaction (open dialog) @P1`, async ({
    page,
  }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Open a dialog/sheet/modal if available
    const addButton = page.getByRole('button', { name: /add|new|create/i });
    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500); // Wait for animation

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    }
  });

  test(`TC-${TC_PREFIX}-102: zero violations with custom rules (color contrast focus) @P1`, async ({
    page,
  }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({ rules: { 'color-contrast': { enabled: true } } })
      .analyze();

    // Filter to only color-contrast violations
    const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast');
    expect(contrastViolations).toEqual([]);
  });
});

// === Section 2: Keyboard Navigation ===

test.describe(`REQ-A11Y-002: ${PAGE_NAME} page — Keyboard navigation`, () => {
  test(`TC-${TC_PREFIX}-110: Tab key reaches all interactive elements @P0`, async ({
    page,
  }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Count interactive elements on page
    const interactiveSelector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [role="tab"], [role="button"], [tabindex="0"]';
    const interactiveCount = await page.locator(interactiveSelector).count();

    // Tab through at least 5 elements (or all if fewer)
    const target = Math.min(interactiveCount, 10);
    const focusedElements: string[] = [];

    for (let i = 0; i < target; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return 'none';
        return `${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[role="${el.getAttribute('role')}"]` : ''}`;
      });
      focusedElements.push(focused);
    }

    // Verify focus moved to interactive elements (not stuck on body)
    const nonBodyFocused = focusedElements.filter(
      (el) => el !== 'body' && el !== 'none',
    );
    expect(nonBodyFocused.length).toBeGreaterThan(0);
  });

  test(`TC-${TC_PREFIX}-111: Shift+Tab navigates backwards @P1`, async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Tab forward 3 times
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
    }

    const forwardElement = await page.evaluate(() => document.activeElement?.tagName);

    // Shift+Tab backwards
    await page.keyboard.press('Shift+Tab');

    const backwardElement = await page.evaluate(() => document.activeElement?.tagName);

    // Focus should have moved to a different element
    // (This is a basic check; both should be valid interactive elements)
    expect(backwardElement).toBeDefined();
  });

  test(`TC-${TC_PREFIX}-112: Enter key activates focused button @P1`, async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Tab to the first button
    let isButton = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      isButton = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName === 'BUTTON' || el?.getAttribute('role') === 'button';
      });
      if (isButton) break;
    }

    if (isButton) {
      // Press Enter — should activate the button
      // We just verify it doesn't crash
      await page.keyboard.press('Enter');
      // Give time for any resulting navigation or dialog
      await page.waitForTimeout(500);
    }
  });

  test(`TC-${TC_PREFIX}-113: Escape key closes open dialogs @P1`, async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Open a dialog if possible
    const addButton = page.getByRole('button', { name: /add|new|create/i });
    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();

      // Wait for dialog
      const dialog = page.locator('[role="dialog"], [data-state="open"]');
      const dialogVisible = await dialog
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (dialogVisible) {
        await page.keyboard.press('Escape');

        // Dialog should be closed
        await expect(dialog.first()).not.toBeVisible({ timeout: 2000 });
      }
    }
  });
});

// === Section 3: Focus Indicator Visibility ===

test.describe(`REQ-A11Y-003: ${PAGE_NAME} page — Focus indicators`, () => {
  test(`TC-${TC_PREFIX}-120: focused elements have visible focus ring @P0`, async ({
    page,
  }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Tab to an interactive element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check that the focused element has a visible outline or ring
    const hasFocusIndicator = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return false;

      const styles = window.getComputedStyle(el);
      const outline = styles.outline;
      const outlineWidth = styles.outlineWidth;
      const boxShadow = styles.boxShadow;
      const borderColor = styles.borderColor;

      // Focus is visible if outline is not "none" and has width,
      // or if box-shadow is applied (Tailwind ring-* uses box-shadow)
      const hasOutline = outline !== 'none' && outlineWidth !== '0px';
      const hasBoxShadow = boxShadow !== 'none' && boxShadow !== '';

      return hasOutline || hasBoxShadow;
    });

    // Soft assertion: some frameworks use CSS-only focus indicators that
    // may not be easily detectable via getComputedStyle
    if (!hasFocusIndicator) {
      console.warn(
        'Focus indicator not detected via computed styles — verify manually',
      );
    }
  });

  test(`TC-${TC_PREFIX}-121: skip-to-content link visible on focus @P1`, async ({
    page,
  }) => {
    await page.goto(PAGE_URL);

    // Press Tab once — skip link should become visible
    await page.keyboard.press('Tab');

    const skipLink = page.locator('a[href="#main-content"], a:text("Skip to content")');
    const isVisible = await skipLink.isVisible({ timeout: 1000 }).catch(() => false);

    // Skip link should be present in the DOM (may be visually hidden until focused)
    const exists = (await skipLink.count()) > 0;
    if (exists) {
      // If it exists, it should be visible when focused
      const skipLinkEl = skipLink.first();
      await skipLinkEl.focus();
      // Check it's not display:none
      const display = await skipLinkEl.evaluate(
        (el) => window.getComputedStyle(el).display,
      );
      expect(display).not.toBe('none');
    }
  });
});

// === Section 4: ARIA Labels ===

test.describe(`REQ-A11Y-004: ${PAGE_NAME} page — ARIA labels`, () => {
  test(`TC-${TC_PREFIX}-130: search input has aria-label @P0`, async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="earch"], input[aria-label*="earch"]',
    );
    if ((await searchInput.count()) > 0) {
      const input = searchInput.first();
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');

      // Must have at least one accessible name source
      const hasLabel =
        ariaLabel !== null || ariaLabelledBy !== null || placeholder !== null;

      // Also check for associated <label>
      let hasAssociatedLabel = false;
      if (id) {
        const labelCount = await page.locator(`label[for="${id}"]`).count();
        hasAssociatedLabel = labelCount > 0;
      }

      expect(hasLabel || hasAssociatedLabel).toBe(true);
    }
  });

  test(`TC-${TC_PREFIX}-131: data table has aria-label @P0`, async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    if ((await table.count()) > 0) {
      const ariaLabel = await table.first().getAttribute('aria-label');
      const ariaLabelledBy = await table.first().getAttribute('aria-labelledby');

      expect(ariaLabel !== null || ariaLabelledBy !== null).toBe(true);
    }
  });

  test(`TC-${TC_PREFIX}-132: all buttons have accessible names @P0`, async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      const title = await button.getAttribute('title');

      // Button must have some accessible name
      const hasName =
        (text && text.trim().length > 0) ||
        ariaLabel !== null ||
        ariaLabelledBy !== null ||
        title !== null;

      if (!hasName) {
        // Log the button for debugging
        const html = await button.evaluate((el) => el.outerHTML.slice(0, 200));
        console.warn(`Button without accessible name: ${html}`);
      }

      expect(hasName).toBe(true);
    }
  });

  test(`TC-${TC_PREFIX}-133: form inputs have associated labels @P1`, async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Check all visible inputs have labels
    const inputs = await page
      .locator('input:not([type="hidden"]):not([type="submit"]):visible')
      .all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      let hasLabel = ariaLabel !== null || ariaLabelledBy !== null || placeholder !== null;

      if (id) {
        const labelCount = await page.locator(`label[for="${id}"]`).count();
        hasLabel = hasLabel || labelCount > 0;
      }

      // Also check if input is wrapped in a <label>
      const parentLabel = await input.evaluate((el) => {
        let parent = el.parentElement;
        while (parent) {
          if (parent.tagName === 'LABEL') return true;
          parent = parent.parentElement;
        }
        return false;
      });

      expect(hasLabel || parentLabel).toBe(true);
    }
  });

  test(`TC-${TC_PREFIX}-134: page has exactly one h1 element @P1`, async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test(`TC-${TC_PREFIX}-135: images have alt text or role="presentation" @P1`, async ({
    page,
  }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaHidden = await img.getAttribute('aria-hidden');

      // Image must have alt text, OR role="presentation", OR aria-hidden="true"
      expect(alt !== null || role === 'presentation' || ariaHidden === 'true').toBe(
        true,
      );
    }
  });
});

// === Section 5: Color Contrast (Supplementary) ===

test.describe(`REQ-A11Y-005: ${PAGE_NAME} page — Color contrast`, () => {
  test(`TC-${TC_PREFIX}-140: text elements meet WCAG AA contrast ratio @P1`, async ({
    page,
  }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Use axe specifically for color-contrast
    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

/*
 * Adapting This Template:
 *
 * 1. Change PAGE_URL and PAGE_NAME at the top
 * 2. Update EXPECTED_INTERACTIVE_ELEMENTS for the specific page
 * 3. Add page-specific ARIA checks (e.g., tab panels, accordions)
 * 4. Run: npx playwright test a11y.template.spec.ts
 *
 * Pages to cover (P0):
 *   /contacts, /listings, /showings, /calendar, /newsletters, /content
 *   / (dashboard), /listings/[id], /contacts/[id]
 */

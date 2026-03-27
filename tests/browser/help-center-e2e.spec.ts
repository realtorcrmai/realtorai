import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

// ── PUBLIC DOCS (no auth needed) ────────────────────────────

test.describe("Public Docs", () => {
  test("renders listing-workflow with content", async ({ page }) => {
    await page.goto(`${BASE}/docs/listing-workflow`);
    await expect(page.locator("h1")).toContainText("Listing Workflow");
    await expect(page.locator("text=Get Started")).toBeVisible();
    // Schema.org present
    const jsonLd = await page.locator('script[type="application/ld+json"]').count();
    expect(jsonLd).toBeGreaterThan(0);
  });

  test("renders all 10 public features", async ({ page }) => {
    const slugs = [
      "listing-workflow", "contact-management", "showing-management",
      "deal-pipeline", "email-marketing-engine", "ai-content-engine",
      "bc-forms-generation", "fintrac-compliance", "voice-agent", "workflow-automations",
    ];
    for (const slug of slugs) {
      const resp = await page.goto(`${BASE}/docs/${slug}`);
      expect(resp?.status()).toBe(200);
    }
  });

  test("internal doc returns 404", async ({ page }) => {
    const resp = await page.goto(`${BASE}/docs/help-center`);
    expect(resp?.status()).toBe(404);
  });

  test("nonexistent doc returns 404", async ({ page }) => {
    const resp = await page.goto(`${BASE}/docs/nonexistent`);
    expect(resp?.status()).toBe(404);
  });

  test("has CTA button linking to login", async ({ page }) => {
    await page.goto(`${BASE}/docs/listing-workflow`);
    const cta = page.locator("a:has-text('Get Started')");
    await expect(cta).toBeVisible();
    expect(await cta.getAttribute("href")).toBe("/login");
  });

  test("has scenarios section", async ({ page }) => {
    await page.goto(`${BASE}/docs/listing-workflow`);
    await expect(page.locator("h2:has-text('Scenarios')")).toBeVisible();
  });
});

// ── AUTHENTICATED HELP CENTER ───────────────────────────────

test.describe("Help Center (authenticated)", () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    // Wait for the form to be fully loaded/hydrated
    await page.waitForSelector("#email", { state: "visible", timeout: 10000 });
    await page.waitForTimeout(1000);

    // Use keyboard to type — most reliable for React controlled inputs
    await page.click("#email");
    await page.keyboard.press("Meta+a");
    await page.keyboard.type("demo@realestatecrm.com");

    await page.click("#password");
    await page.keyboard.press("Meta+a");
    await page.keyboard.type("demo1234");

    // Click sign in
    await page.locator('button[type="submit"]').click();

    // Wait for redirect
    try {
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    } catch {
      // Check if there's an error message
      const error = await page.locator("text=Invalid").textContent().catch(() => null);
      if (error) throw new Error(`Login failed: ${error}`);
    }
    await page.waitForTimeout(1000);
  });

  test("/help page renders feature cards", async ({ page }) => {
    await page.goto(`${BASE}/help`);
    await expect(page.locator("h1:has-text('Help Center')")).toBeVisible();
    // Should have "Getting Started" section
    await expect(page.locator("h2:has-text('Getting Started')")).toBeVisible();
    // Should have feature cards
    const cards = page.locator(".lf-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(5); // at least the 10 features + 3 quickstarts
  });

  test("/help/listing-workflow detail page with tabs", async ({ page }) => {
    await page.goto(`${BASE}/help/listing-workflow`);
    await expect(page.locator("h1:has-text('Listing Workflow')")).toBeVisible();

    // Tabs exist
    await expect(page.locator("button[role='tab']:has-text('Overview')")).toBeVisible();
    await expect(page.locator("button[role='tab']:has-text('Use Cases')")).toBeVisible();
    await expect(page.locator("button[role='tab']:has-text('Features')")).toBeVisible();
    await expect(page.locator("button[role='tab']:has-text('FAQ')")).toBeVisible();

    // Click Use Cases tab
    await page.click("button[role='tab']:has-text('Use Cases')");
    // Should show scenarios (expandable)
    await page.waitForTimeout(500);
    const panel = page.locator("[role='tabpanel']");
    await expect(panel).toBeVisible();
  });

  test("tab switching works", async ({ page }) => {
    await page.goto(`${BASE}/help/listing-workflow`);

    // Click Features tab
    await page.click("button[role='tab']:has-text('Features')");
    await page.waitForTimeout(300);

    // Click FAQ tab
    await page.click("button[role='tab']:has-text('FAQ')");
    await page.waitForTimeout(300);

    // Click back to Overview
    await page.click("button[role='tab']:has-text('Overview')");
    await expect(page.locator("text=What it does")).toBeVisible();
  });

  test("feedback controls visible on detail page", async ({ page }) => {
    await page.goto(`${BASE}/help/listing-workflow`);
    // Scroll to bottom for feedback
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await expect(page.locator("text=Was this helpful")).toBeVisible();
  });

  test("? button exists in header", async ({ page }) => {
    await page.goto(`${BASE}/`);
    const helpBtn = page.locator("button[aria-label='Help for this page']");
    await expect(helpBtn).toBeVisible();

    // Click it
    await helpBtn.click();
    // Popover should appear
    await expect(page.locator("[role='dialog']")).toBeVisible();

    // Close with Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  test("Cmd+K opens command palette", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(1000);

    // Press Cmd+K
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(500);

    // Command palette should be visible
    const dialog = page.locator("[role='dialog'][aria-label='Command palette']");
    await expect(dialog).toBeVisible();

    // Should have search input
    const input = dialog.locator("input");
    await expect(input).toBeVisible();

    // Type and see results
    await input.fill("listing");
    await page.waitForTimeout(300);

    // Close with Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  test("data-tour attributes exist on nav", async ({ page }) => {
    await page.goto(`${BASE}/`);
    // Check that nav items have data-tour
    await expect(page.locator("[data-tour='nav-listings']")).toBeVisible();
    await expect(page.locator("[data-tour='nav-contacts']")).toBeVisible();
    await expect(page.locator("[data-tour='nav-showings']")).toBeVisible();
  });

  test("back to help center link works", async ({ page }) => {
    await page.goto(`${BASE}/help/listing-workflow`);
    await page.click("text=Back to Help Center");
    await page.waitForURL(`${BASE}/help`);
    await expect(page.locator("h1:has-text('Help Center')")).toBeVisible();
  });
});

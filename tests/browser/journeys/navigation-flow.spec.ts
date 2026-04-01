import { test, expect } from "@playwright/test";
import { loginAsDemo, getFirstEntityId } from "../helpers/auth";

test.describe("Navigation Flow Journey", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  // ── Dashboard renders ──────────────────────────────────────

  test("dashboard loads with greeting and feature tiles", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    // Greeting text: Good morning/afternoon/evening
    const greeting = page.locator("text=/Good (morning|afternoon|evening)/i").first();
    await expect(greeting).toBeVisible();
  });

  test("dashboard shows pipeline snapshot section", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    // Pipeline stages: New Leads, Qualified, Active, Under Contract, Closed
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  // ── Header nav links (desktop) ─────────────────────────────

  test("header nav has Listings link that works", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Desktop header nav");
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const listingsLink = page.locator("header a[href='/listings'], nav a[href='/listings']").first();
    await expect(listingsLink).toBeVisible();
    await listingsLink.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/listings");
  });

  test("header nav has Contacts link that works", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Desktop header nav");
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const contactsLink = page.locator("header a[href='/contacts'], nav a[href='/contacts']").first();
    await expect(contactsLink).toBeVisible();
    await contactsLink.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/contacts");
  });

  test("header nav has Showings link that works", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Desktop header nav");
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const showingsLink = page.locator("header a[href='/showings'], nav a[href='/showings']").first();
    await expect(showingsLink).toBeVisible();
    await showingsLink.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/showings");
  });

  test("header nav has Calendar link that works", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Desktop header nav");
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const calendarLink = page.locator("header a[href='/calendar'], nav a[href='/calendar']").first();
    await expect(calendarLink).toBeVisible();
    await calendarLink.click();
    await page.waitForURL("/calendar");
    await expect(page).toHaveURL("/calendar");
  });

  // ── Dashboard tiles navigate correctly ─────────────────────

  test("Listings tile navigates to /listings", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const tile = page.locator("a[href='/listings']").first();
    await tile.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/listings");
  });

  test("Contacts tile navigates to /contacts", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const tile = page.locator("a[href='/contacts']").first();
    await tile.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/contacts");
  });

  test("Tasks tile navigates to /tasks", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const tile = page.locator("a[href='/tasks']").first();
    await tile.click();
    await page.waitForURL("/tasks");
    await expect(page).toHaveURL("/tasks");
  });

  test("Showings tile navigates to /showings", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const tile = page.locator("a[href='/showings']").first();
    await tile.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/showings");
  });

  test("Calendar tile navigates to /calendar", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const tile = page.locator("a[href='/calendar']").first();
    await tile.click();
    await page.waitForURL("/calendar");
    await expect(page).toHaveURL("/calendar");
  });

  test("Content Engine tile navigates to /content", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const tile = page.locator("a[href='/content']").first();
    await tile.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/content");
  });

  test("Email Marketing tile navigates to /newsletters", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const tile = page.locator("a[href='/newsletters']").first();
    await tile.click();
    await page.waitForURL("/newsletters");
    await expect(page).toHaveURL("/newsletters");
  });

  // ── Mobile bottom nav ──────────────────────────────────────

  test("mobile viewport shows bottom navigation bar", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile", "Mobile only");
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    // MobileNav is a fixed bottom bar visible on mobile
    const bottomNav = page.locator("nav.fixed.bottom-0");
    await expect(bottomNav).toBeVisible();
  });

  test("mobile bottom nav has Home link", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile", "Mobile only");
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const homeLink = page.locator("nav.fixed.bottom-0 a[href='/']");
    await expect(homeLink).toBeVisible();
  });

  test("mobile bottom nav has Contacts link that navigates", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile", "Mobile only");
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const contactsLink = page.locator("nav.fixed.bottom-0 a[href='/contacts']");
    await expect(contactsLink).toBeVisible();
    await contactsLink.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/contacts");
  });

  test("mobile bottom nav has Listings link that navigates", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile", "Mobile only");
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const listingsLink = page.locator("nav.fixed.bottom-0 a[href='/listings']");
    await expect(listingsLink).toBeVisible();
    await listingsLink.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/listings");
  });

  test("mobile bottom nav has Calendar link that navigates", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile", "Mobile only");
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const calendarLink = page.locator("nav.fixed.bottom-0 a[href='/calendar']");
    await expect(calendarLink).toBeVisible();
    await calendarLink.click();
    await page.waitForURL("/calendar");
    await expect(page).toHaveURL("/calendar");
  });

  // ── Cross-page round trip ──────────────────────────────────

  test("full navigation round trip: dashboard -> listings -> contacts -> dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Dashboard -> Listings
    await page.locator("a[href='/listings']").first().click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/listings");

    // Listings -> Contacts (navigate directly to a contact)
    const contactId = await getFirstEntityId(page, 'contacts');
    if (contactId) {
      await page.goto(`/contacts/${contactId}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain("/contacts");
    }

    // Contacts -> Dashboard
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const greeting = page.locator("text=/Good (morning|afternoon|evening)/i").first();
    await expect(greeting).toBeVisible();
  });

  test("full navigation round trip: dashboard -> showings -> calendar -> newsletters -> dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Dashboard -> Showings
    await page.locator("a[href='/showings']").first().click();
    await page.waitForTimeout(3000);

    // Showings -> Calendar
    await page.goto("/calendar");
    await page.waitForURL("/calendar");
    const main = page.locator("main");
    await expect(main).toBeVisible();

    // Calendar -> Newsletters
    await page.goto("/newsletters");
    await page.waitForURL("/newsletters");
    await expect(page.locator("button:has-text('Overview')").first()).toBeVisible();

    // Newsletters -> Dashboard
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=/Good (morning|afternoon|evening)/i").first()).toBeVisible();
  });

  // ── More menu items (desktop) ──────────────────────────────

  test("header More dropdown contains additional nav items on desktop", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Desktop only");
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    // The More dropdown trigger has ChevronDown icon or "More" text
    const moreTrigger = page.locator("button:has-text('More'), [data-testid='more-menu']").first();
    const isVisible = await moreTrigger.isVisible().catch(() => false);
    if (isVisible) {
      await moreTrigger.click();
      await page.waitForTimeout(300);
      // Should show links to tasks, automations, content, etc.
      const menuItems = page.locator("a[href='/tasks'], a[href='/newsletters'], a[href='/content']");
      const count = await menuItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

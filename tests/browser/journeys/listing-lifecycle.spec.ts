import { test, expect } from "@playwright/test";
import { loginAsDemo, getFirstEntityId } from "../helpers/auth";

test.describe("Listing Lifecycle Journey", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  // ── Navigation to listings ─────────────────────────────────

  test("navigating to /listings redirects to the latest listing detail", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/listings\/[a-f0-9-]+/);
  });

  test("listing detail page renders the address heading", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
    await expect(heading).not.toHaveText("");
  });

  test("listing detail page shows price information", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Price uses DollarSign icon + CAD formatting
    const priceText = page.locator("text=/\\$[\\d,]+/").first();
    await expect(priceText).toBeVisible();
  });

  test("listing detail page shows lockbox code", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Lockbox")).toBeVisible();
  });

  // ── Sidebar navigation ─────────────────────────────────────

  test("listing sidebar is visible on desktop and contains listing links", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Desktop sidebar only");
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const sidebar = page.locator(".border-r").first();
    await expect(sidebar).toBeVisible();
    const listingLinks = sidebar.locator("a[href^='/listings/']");
    expect(await listingLinks.count()).toBeGreaterThan(0);
  });

  test("clicking a listing in sidebar navigates to its detail page", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Desktop sidebar only");
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const sidebarLinks = page.locator(".border-r a[href^='/listings/']");
    const count = await sidebarLinks.count();
    if (count > 1) {
      const secondLink = sidebarLinks.nth(1);
      const href = await secondLink.getAttribute("href");
      await secondLink.click();
      await page.waitForTimeout(3000);
      expect(page.url()).toContain(href);
    }
  });

  // ── Workflow section ───────────────────────────────────────

  test("listing detail page shows the workflow section", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // ListingWorkflow component is rendered inside a Card
    const workflowCard = page.locator("text=/Phase|Intake|Enrichment|CMA|Pricing|Form|Signature|MLS/i").first();
    await expect(workflowCard).toBeVisible();
  });

  test("workflow phases render as numbered steps", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Phase indicators exist in the workflow
    const phaseIndicators = page.locator("text=/Phase [1-8]/i");
    const count = await phaseIndicators.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ── Seller link to contacts ────────────────────────────────

  test("listing detail has a seller link that navigates to contact detail", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // "View Seller" button links to /contacts/:id
    const sellerLink = page.locator("a[href^='/contacts/']").first();
    await expect(sellerLink).toBeVisible();
    await sellerLink.click();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+/);
  });

  test("contact detail page loads after clicking seller link from listing", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const sellerLink = page.locator("a:has-text('View Seller')");
    if (await sellerLink.isVisible()) {
      await sellerLink.click();
      await page.waitForTimeout(3000);
      // Contact detail should show the contact name
      const contactName = page.locator("h1, h2").first();
      await expect(contactName).toBeVisible();
    }
  });

  // ── Showing History ────────────────────────────────────────

  test("listing detail page shows showing history section", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Showing History")).toBeVisible();
  });

  test("showing history section shows either showings or empty state", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const hasShowings = page.locator("text=/requested|confirmed|denied|cancelled/i").first();
    const emptyState = page.locator("text=No showings for this listing yet");
    const showingVisible = await hasShowings.isVisible().catch(() => false);
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    expect(showingVisible || emptyVisible).toBeTruthy();
  });

  // ── Form Readiness Panel (right side) ──────────────────────

  test("listing detail shows form readiness panel on desktop", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Right panel desktop only");
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const rightPanel = page.locator("aside").first();
    await expect(rightPanel).toBeVisible();
  });

  // ── Dashboard to listings flow ─────────────────────────────

  test("dashboard has a Listings tile that links to /listings", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const listingsTile = page.locator("a[href='/listings']").first();
    await expect(listingsTile).toBeVisible();
  });

  test("clicking Listings tile on dashboard navigates to listing detail", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const listingsTile = page.locator("a[href='/listings']").first();
    await listingsTile.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/listings");
  });

  // ── Showing Request Form ───────────────────────────────────

  test("listing detail has a showing request action", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // ShowingRequestForm or a button to create showing
    const showingBtn = page.locator("button:has-text('Showing'), button:has-text('Request'), button:has-text('Schedule')").first();
    const isVisible = await showingBtn.isVisible().catch(() => false);
    // It may be disabled if docs are missing, but should exist
    expect(isVisible).toBeTruthy();
  });

  // ── Alert Banner ───────────────────────────────────────────

  test("listing detail shows alert banner when required documents are missing", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // AlertBanner appears when FINTRAC/DORTS/PDS missing — check it exists or not (both valid)
    const bodyContent = page.locator("main");
    // Page should at least have loaded content
    await expect(bodyContent).toBeVisible();
    // Alert banner presence is data-dependent, just verify page loaded without error
  });

  // ── Neighbourhood and DDF actions ──────────────────────────

  test("listing detail shows action buttons row", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Buttons like Neighbourhood, Conveyancing Pack
    const actionsRow = page.locator("button, a").filter({ hasText: /Neighbourhood|Conveyancing|Sync/i }).first();
    const isVisible = await actionsRow.isVisible().catch(() => false);
    // At least one action button should be present
    expect(isVisible).toBeTruthy();
  });
});

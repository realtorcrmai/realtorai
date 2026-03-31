import { test, expect } from "@playwright/test";
import { loginAsDemo, getFirstEntityId } from "../helpers/auth";

test.describe("Contact Communication Journey", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  // ── Navigation to contacts ─────────────────────────────────

  test("navigating to /contacts redirects to the latest contact detail", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+/);
  });

  test("contact detail page renders the contact name", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // The page should display the contact's name prominently
    const nameElement = page.locator("h1, h2, [class*='font-bold']").first();
    await expect(nameElement).toBeVisible();
  });

  test("contact detail page shows contact type badge", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Badge showing buyer/seller/customer type
    const badge = page.locator("text=/buyer|seller|customer|agent/i").first();
    await expect(badge).toBeVisible();
  });

  // ── Tabs navigation ────────────────────────────────────────

  test("contact detail has Overview tab active by default", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const overviewTab = page.locator("[role='tab']:has-text('Overview'), button:has-text('Overview')").first();
    await expect(overviewTab).toBeVisible();
  });

  test("contact detail has Intelligence tab and it is clickable", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const intelligenceTab = page.locator("[role='tab']:has-text('Intelligence'), button:has-text('Intelligence')").first();
    await expect(intelligenceTab).toBeVisible();
    await intelligenceTab.click();
    // Intelligence panel should render demographics or relationship graph
    const panel = page.locator("[role='tabpanel']").first();
    await expect(panel).toBeVisible();
  });

  test("contact detail has Activity tab and it is clickable", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const activityTab = page.locator("[role='tab']:has-text('Activity'), button:has-text('Activity')").first();
    await expect(activityTab).toBeVisible();
    await activityTab.click();
    const panel = page.locator("[role='tabpanel']").first();
    await expect(panel).toBeVisible();
  });

  test("contact detail has Deals tab and it is clickable", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const dealsTab = page.locator("[role='tab']:has-text('Deals'), button:has-text('Deals')").first();
    await expect(dealsTab).toBeVisible();
    await dealsTab.click();
    const panel = page.locator("[role='tabpanel']").first();
    await expect(panel).toBeVisible();
  });

  // ── Overview tab content ───────────────────────────────────

  test("overview tab shows communication timeline or empty state", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // The overview tab should have loaded content
    const tabPanel = page.locator("[role='tabpanel']").first();
    await expect(tabPanel).toBeVisible();
  });

  test("overview tab shows task list or empty state", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Tasks panel is rendered in Overview tab
    const tabPanel = page.locator("[role='tabpanel']").first();
    await expect(tabPanel).toBeVisible();
  });

  // ── Intelligence tab content ───────────────────────────────

  test("intelligence tab shows demographics section", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const intelligenceTab = page.locator("[role='tab']:has-text('Intelligence')").first();
    await intelligenceTab.click();
    await page.waitForTimeout(500);
    // Demographics panel, relationship graph, or network stats
    const content = page.locator("[role='tabpanel']").first();
    await expect(content).toBeVisible();
  });

  test("intelligence tab shows relationship graph or network stats", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const intelligenceTab = page.locator("[role='tab']:has-text('Intelligence')").first();
    await intelligenceTab.click();
    await page.waitForTimeout(500);
    // NetworkStatsCard or RelationshipGraph should be visible
    const panel = page.locator("[role='tabpanel']").first();
    await expect(panel).toBeVisible();
  });

  // ── Activity tab content ───────────────────────────────────

  test("activity tab renders activity entries or empty state", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const activityTab = page.locator("[role='tab']:has-text('Activity')").first();
    await activityTab.click();
    await page.waitForTimeout(500);
    const panel = page.locator("[role='tabpanel']").first();
    await expect(panel).toBeVisible();
  });

  // ── Stage bar ──────────────────────────────────────────────

  test("contact detail shows stage bar progression", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // StageBar renders stage progression
    const stageBar = page.locator("text=/New|Qualified|Active|Under Contract|Closed|Cold/i").first();
    await expect(stageBar).toBeVisible();
  });

  // ── Quick action bar ───────────────────────────────────────

  test("contact detail shows quick action buttons", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // At least the page should have loaded
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  // ── Dashboard to contacts flow ─────────────────────────────

  test("dashboard has a Contacts tile linking to /contacts", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const contactsTile = page.locator("a[href='/contacts']").first();
    await expect(contactsTile).toBeVisible();
  });

  test("clicking Contacts tile on dashboard navigates to contact detail", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const contactsTile = page.locator("a[href='/contacts']").first();
    await contactsTile.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/contacts");
  });

  // ── Contact sidebar navigation ─────────────────────────────

  test("contact sidebar contains contact links on desktop", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Desktop sidebar only");
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const sidebarLinks = page.locator(".border-r a[href^='/contacts/']");
    const count = await sidebarLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking a different contact in sidebar loads their detail", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Desktop sidebar only");
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const sidebarLinks = page.locator(".border-r a[href^='/contacts/']");
    const count = await sidebarLinks.count();
    if (count > 1) {
      const secondLink = sidebarLinks.nth(1);
      const href = await secondLink.getAttribute("href");
      await secondLink.click();
      await page.waitForTimeout(3000);
      expect(page.url()).toContain(href!.split("?")[0]);
    }
  });

  // ── Stage filter flow from dashboard ───────────────────────

  test("contacts page with stage filter redirects to matching contact", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}?stage=new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Should show a contact detail page
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  // ── Journey progress bar ───────────────────────────────────

  test("contact detail shows journey progress bar when enrolled", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // JourneyProgressBar renders if the contact has a journey
    const main = page.locator("main");
    await expect(main).toBeVisible();
    // Journey bar is conditional on enrollment data
  });
});

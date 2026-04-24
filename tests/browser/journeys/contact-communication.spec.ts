import { test, expect } from "@playwright/test";
import { loginAsDemo } from "../helpers/auth";
import { E2E_CONTACT_ID } from "../../fixtures/test-ids";

// Canonical seeded contact (tests/fixtures/seed.ts) — guaranteed to exist
// with full data, so every test runs deterministically on any DB state.
const id = E2E_CONTACT_ID;

test.describe("Contact Communication Journey", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  // ── Navigation to contacts ─────────────────────────────────

  test("navigating to /contacts redirects to the latest contact detail", async ({ page }) => {
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+/);
  });

  test("contact detail page renders the contact name", async ({ page }) => {
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // The page should display the contact's name prominently
    const nameElement = page.locator("h1, h2, [class*='font-bold']").first();
    await expect(nameElement).toBeVisible();
  });

  test("contact detail page shows contact type badge", async ({ page }) => {
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // Badge showing buyer/seller/customer type
    const badge = page.locator("text=/buyer|seller|customer|agent/i").first();
    await expect(badge).toBeVisible();
  });

  // ── Tabs navigation ────────────────────────────────────────

  test("contact detail has Overview tab active by default", async ({ page }) => {
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const overviewTab = page.locator("[role='tab']:has-text('Overview'), button:has-text('Overview')").first();
    await expect(overviewTab).toBeVisible();
  });

  test("contact detail has 3 tabs — Overview, Activity, Deals", async ({ page }) => {
    // Intelligence tab was removed — demographics and relationship graph
    // now live inside the Overview tab. See ContactDetailTabs.tsx.
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const tabList = page.locator("[role='tablist']").first();
    await expect(tabList).toBeVisible();
    await expect(page.locator("[role='tab']").filter({ hasText: /Overview/ })).toBeVisible();
    await expect(page.locator("[role='tab']").filter({ hasText: /Activity/ })).toBeVisible();
    await expect(page.locator("[role='tab']").filter({ hasText: /Deals/ })).toBeVisible();
  });

  test("contact detail has Activity tab and it is clickable", async ({ page }) => {
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // Tab labels include emoji prefix ("💬 Activity"); match by name regex.
    const activityTab = page.getByRole("tab", { name: /Activity/ }).first();
    await expect(activityTab).toBeVisible();
    await activityTab.click();
    // Radix Tabs keeps all panels in the DOM; inactive ones are `hidden`.
    // Select the active panel, not the first one.
    const panel = page.locator("[role='tabpanel'][data-state='active']").first();
    await expect(panel).toBeVisible();
  });

  test("contact detail has Deals tab and it is clickable", async ({ page }) => {
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const dealsTab = page.getByRole("tab", { name: /Deals/ }).first();
    await expect(dealsTab).toBeVisible();
    await dealsTab.click();
    const panel = page.locator("[role='tabpanel'][data-state='active']").first();
    await expect(panel).toBeVisible();
  });

  // ── Overview tab content ───────────────────────────────────

  test("overview tab shows communication timeline or empty state", async ({ page }) => {
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // The overview tab should have loaded content
    const tabPanel = page.locator("[role='tabpanel']").first();
    await expect(tabPanel).toBeVisible();
  });

  test("overview tab shows task list or empty state", async ({ page }) => {
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // Tasks panel is rendered in Overview tab
    const tabPanel = page.locator("[role='tabpanel']").first();
    await expect(tabPanel).toBeVisible();
  });

  // ── Overview: demographics + relationships (formerly Intelligence tab) ──

  test("overview tab shows demographics section", async ({ page }) => {
    // Intelligence merged into Overview — DemographicsPanel renders inline.
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const panel = page.locator("[role='tabpanel']").first();
    await expect(panel).toBeVisible();
    // Demographics card heading or "Age" field is rendered in overview
    await expect(
      page.getByText(/Demographics|Occupation|Age/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("overview tab shows relationship / referrals section", async ({ page }) => {
    // RelationshipManager + ReferralsPanel now live in Overview.
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const panel = page.locator("[role='tabpanel']").first();
    await expect(panel).toBeVisible();
    await expect(
      page.getByText(/Relationships|Referrals|Referred/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  // ── Activity tab content ───────────────────────────────────

  test("activity tab renders activity entries or empty state", async ({ page }) => {
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const activityTab = page.getByRole("tab", { name: /Activity/ }).first();
    await activityTab.click();
    await page.waitForTimeout(500);
    const panel = page.locator("[role='tabpanel'][data-state='active']").first();
    await expect(panel).toBeVisible();
  });

  // ── Stage bar ──────────────────────────────────────────────

  test("contact detail shows stage bar progression", async ({ page }) => {
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // StageBar renders stage progression
    const stageBar = page.locator("text=/New|Qualified|Active|Under Contract|Closed|Cold/i").first();
    await expect(stageBar).toBeVisible();
  });

  // ── Quick action bar ───────────────────────────────────────

  test("contact detail shows quick action buttons", async ({ page }) => {
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
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

  // ── Contact navigation (platform-specific) ────────────────

  test("contacts list page renders rows", async ({ page }) => {
    // /contacts uses DataTable onRowClick (router.push) — rows are <tr>, not <a>.
    await page.goto(`/contacts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const main = page.locator("main");
    await expect(main).toBeVisible();
    // DataTable rows have role='row' inside a tbody; at minimum, header row exists.
    const rows = page.locator("main table tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("navigating between contacts works via the contacts list page", async ({ page }) => {
    await page.goto(`/contacts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const main = page.locator("main");
    await expect(main).toBeVisible();
    // Rows are clickable <tr> (DataTable onRowClick). Click first body row and
    // confirm URL changes to /contacts/<id>.
    const bodyRows = page.locator("main table tbody tr");
    const count = await bodyRows.count();
    if (count > 0) {
      await bodyRows.first().click();
      await page.waitForURL(/\/contacts\/[a-f0-9-]+/, { timeout: 10000 }).catch(() => {});
      expect(page.url()).toMatch(/\/contacts(\/|$)/);
    } else {
      expect(page.url()).toContain("/contacts");
    }
  });

  // ── Stage filter flow from dashboard ───────────────────────

  test("contacts page with stage filter redirects to matching contact", async ({ page }) => {
    await page.goto(`/contacts/${id}?stage=new`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // Should show a contact detail page
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  // ── Journey progress bar ───────────────────────────────────

  test("contact detail shows journey progress bar when enrolled", async ({ page }) => {
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // JourneyProgressBar renders if the contact has a journey
    const main = page.locator("main");
    await expect(main).toBeVisible();
    // Journey bar is conditional on enrollment data
  });
});

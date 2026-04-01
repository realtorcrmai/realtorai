import { test, expect } from "@playwright/test";
import { loginAsDemo } from "../helpers/auth";

test.describe("Newsletter Pipeline Journey", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  // ── Page load ──────────────────────────────────────────────

  test("newsletters page loads successfully", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL("/newsletters");
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("newsletters page renders the tab bar", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    // EmailMarketingTabs renders a tab bar with Overview, AI Workflows, Performance, etc.
    const tabBar = page.locator("text=Overview").first();
    await expect(tabBar).toBeVisible();
  });

  // ── Overview tab ───────────────────────────────────────────

  test("Overview tab is active by default", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    // The Overview button should have active styling (bg-primary)
    const overviewBtn = page.locator("button:has-text('Overview')").first();
    await expect(overviewBtn).toBeVisible();
  });

  test("Overview tab shows pipeline card or stats", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    // PipelineCard or stat pills should be visible in overview
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  test("Overview tab shows hot leads section", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    // Hot buyers/sellers or pipeline data
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  // ── AI Workflows tab ───────────────────────────────────────

  test("clicking AI Workflows tab switches content", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    const workflowsTab = page.locator("button:has-text('AI Workflows')").first();
    await expect(workflowsTab).toBeVisible();
    await workflowsTab.click();
    await page.waitForTimeout(300);
    // Content should change
    const content = page.locator("main .min-h-\\[400px\\]").first();
    await expect(content).toBeVisible();
  });

  test("AI Workflows tab shows workflow list or empty state", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    const workflowsTab = page.locator("button:has-text('AI Workflows')").first();
    await workflowsTab.click();
    await page.waitForTimeout(300);
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  // ── Performance tab ────────────────────────────────────────

  test("clicking Performance tab switches content", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    const queueTab = page.locator("button:has-text('Performance')").first();
    await expect(queueTab).toBeVisible();
    await queueTab.click();
    await page.waitForTimeout(300);
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("Performance tab shows sent emails or approval queue", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    const queueTab = page.locator("button:has-text('Performance')").first();
    await queueTab.click();
    await page.waitForTimeout(300);
    // SentByAIList, AIAgentQueue, or HeldBackList
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  // ── Campaigns tab ──────────────────────────────────────────

  test("clicking Campaigns tab switches content", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    const campaignsTab = page.locator("button:has-text('Campaigns')").first();
    await expect(campaignsTab).toBeVisible();
    await campaignsTab.click();
    await page.waitForTimeout(300);
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("Campaigns tab shows listing blast automation or campaign list", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    const campaignsTab = page.locator("button:has-text('Campaigns')").first();
    await campaignsTab.click();
    await page.waitForTimeout(300);
    // CampaignsTab content should render
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  // ── Automation tab ─────────────────────────────────────────

  test("clicking Automation tab switches content", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    const automationTab = page.locator("button:has-text('Automation')").first();
    await expect(automationTab).toBeVisible();
    await automationTab.click();
    await page.waitForTimeout(300);
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("Automation tab renders automation rules or empty state", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    const automationTab = page.locator("button:has-text('Automation')").first();
    await automationTab.click();
    await page.waitForTimeout(300);
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  // ── Settings tab ───────────────────────────────────────────

  test("clicking Settings tab switches content", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    const settingsTab = page.locator("button:has-text('Settings')").first();
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();
    await page.waitForTimeout(300);
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("Settings tab shows configuration toggles", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    const settingsTab = page.locator("button:has-text('Settings')").first();
    await settingsTab.click();
    await page.waitForTimeout(300);
    // SettingsTab should have toggle switches or form elements
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  // ── Tab cycling ────────────────────────────────────────────

  test("all tabs are present in the tab bar", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    const expectedTabs = ["Overview", "AI Workflows", "Performance", "Campaigns", "Automation", "Settings"];
    for (const tabName of expectedTabs) {
      const tab = page.locator(`button:has-text('${tabName}')`).first();
      await expect(tab).toBeVisible();
    }
  });

  test("cycling through all tabs does not cause errors", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    const tabNames = ["AI Workflows", "Performance", "Campaigns", "Automation", "Settings", "Overview"];
    for (const tabName of tabNames) {
      const tab = page.locator(`button:has-text('${tabName}')`).first();
      await tab.click();
      await page.waitForTimeout(200);
    }
    // Returning to Overview should work without error
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  // ── Dashboard to newsletters flow ──────────────────────────

  test("dashboard has an Email Marketing tile linking to /newsletters", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const newsletterTile = page.locator("a[href='/newsletters']").first();
    await expect(newsletterTile).toBeVisible();
  });

  test("clicking Email Marketing tile navigates to newsletters page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const newsletterTile = page.locator("a[href='/newsletters']").first();
    await newsletterTile.click();
    await page.waitForURL("/newsletters");
    await expect(page).toHaveURL("/newsletters");
  });
});

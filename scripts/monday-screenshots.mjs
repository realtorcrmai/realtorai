import { chromium } from "@playwright/test";

const OUT = "/Users/bigbear/reality crm/guides/screenshots/monday";
const MONDAY_URL = "https://eramndeeps-team.monday.com";

async function run() {
  const browser = await chromium.launch({ headless: false }); // Need visible browser for auth
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Navigate to Monday.com - it will show login or the workspace
  await page.goto(MONDAY_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Take screenshot of whatever loads (login or workspace)
  await page.screenshot({ path: `${OUT}/01-landing.png`, fullPage: false });
  console.log("✓ landing page");

  // Try to navigate to the overview
  try {
    await page.goto(`${MONDAY_URL}/overviews/36463441`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/02-overview.png`, fullPage: false });
    console.log("✓ overview");
  } catch (e) {
    console.log("✗ overview:", e.message?.slice(0, 80));
  }

  // Try boards
  try {
    await page.goto(`${MONDAY_URL}/boards`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/03-boards.png`, fullPage: false });
    console.log("✓ boards");
  } catch (e) {
    console.log("✗ boards:", e.message?.slice(0, 80));
  }

  // Check if we're logged in by looking for common Monday.com elements
  const isLoggedIn = await page.$('.surface-header, .board-header, .workspace-content, [data-testid]').catch(() => null);
  console.log("Logged in:", !!isLoggedIn);

  // If logged in, take more screenshots
  if (isLoggedIn) {
    // Click through navigation items
    const navItems = await page.$$('.sidebar-item, .workspace-item, nav a');
    console.log(`Found ${navItems.length} nav items`);

    for (let i = 0; i < Math.min(navItems.length, 5); i++) {
      try {
        await navItems[i].click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${OUT}/04-nav-${i}.png`, fullPage: false });
        console.log(`✓ nav item ${i}`);
      } catch {}
    }
  }

  await browser.close();
  console.log(`\nScreenshots saved to: ${OUT}/`);
}

run().catch(e => console.error("Fatal:", e.message));

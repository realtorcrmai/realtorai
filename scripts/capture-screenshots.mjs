/**
 * Capture screenshots of all Email Marketing pages for the walkthrough guide.
 * Uses Playwright to login, navigate, and screenshot each page.
 *
 * Usage: npx playwright test scripts/capture-screenshots.mjs
 * Or:    node scripts/capture-screenshots.mjs
 */

import { chromium } from "playwright";
import { join } from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = join(process.cwd(), "../guides/screenshots");

const PAGES = [
  // Dashboard
  { name: "01-dashboard", path: "/", desc: "Main CRM Dashboard", waitFor: 3000 },

  // Newsletter Home
  { name: "02-newsletter-dashboard", path: "/newsletters", desc: "Newsletter & Journeys Dashboard", waitFor: 2000 },

  // Command Center tabs
  { name: "03-command-center", path: "/newsletters/control", desc: "Command Center — Email Activity", waitFor: 2000 },

  // Approval Queue
  { name: "04-approval-queue", path: "/newsletters/queue", desc: "AI Email Approval Queue", waitFor: 2000 },

  // Analytics
  { name: "05-analytics", path: "/newsletters/analytics", desc: "Newsletter Analytics", waitFor: 2000 },

  // Agent Activity Feed
  { name: "06-activity-feed", path: "/newsletters/activity", desc: "AI Agent Activity Feed", waitFor: 2000 },

  // Suppression Log
  { name: "07-suppressions", path: "/newsletters/suppressions", desc: "What the AI Held Back", waitFor: 2000 },

  // Ghost Mode
  { name: "08-ghost-mode", path: "/newsletters/ghost", desc: "Ghost Mode Comparison", waitFor: 2000 },

  // Insights
  { name: "09-insights", path: "/newsletters/insights", desc: "Agent Insights & Learning", waitFor: 2000 },

  // Walkthrough Guide
  { name: "10-guide", path: "/newsletters/guide", desc: "Interactive Walkthrough", waitFor: 2000 },

  // Contacts page
  { name: "11-contacts", path: "/contacts", desc: "Contacts List", waitFor: 2000 },

  // Automations
  { name: "12-automations", path: "/automations", desc: "Workflow Automations", waitFor: 2000 },
];

async function main() {
  console.log("🎬 Capturing screenshots for walkthrough guide...\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Login
  console.log("  🔑 Logging in...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Fill demo credentials
  try {
    await page.fill('input[name="email"], input[type="email"]', "demo@realestatecrm.com", { timeout: 5000 });
    await page.fill('input[name="password"], input[type="password"]', "demo1234", { timeout: 5000 });
    await page.click('button[type="submit"]', { timeout: 5000 });
    await page.waitForTimeout(3000);
    console.log("  ✅ Logged in\n");
  } catch (err) {
    console.log(`  ⚠️  Login form interaction failed: ${err.message}`);
    console.log("  Attempting direct navigation (may redirect to login)...\n");
  }

  // Capture each page
  for (const pg of PAGES) {
    try {
      console.log(`  📸 ${pg.desc} (${pg.path})`);
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(pg.waitFor || 2000);

      // Full page screenshot
      await page.screenshot({
        path: join(SCREENSHOT_DIR, `${pg.name}.png`),
        fullPage: true,
      });

      // Also take a viewport-only shot for above-the-fold
      await page.screenshot({
        path: join(SCREENSHOT_DIR, `${pg.name}-fold.png`),
        fullPage: false,
      });

      console.log(`     ✅ Saved ${pg.name}.png`);
    } catch (err) {
      console.log(`     ❌ Failed: ${err.message}`);
    }
  }

  // Special interactions: Command Center tabs
  console.log("\n  📸 Command Center — Tab Screenshots...");
  try {
    await page.goto(`${BASE_URL}/newsletters/control`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);

    // Click each tab and screenshot
    const tabs = [
      { label: "Workflows", name: "03b-workflows-tab" },
      { label: "Contact Journeys", name: "03c-contacts-tab" },
      { label: "Schedule", name: "03d-schedule-tab" },
    ];

    for (const tab of tabs) {
      try {
        await page.click(`button:has-text("${tab.label}")`, { timeout: 3000 });
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: join(SCREENSHOT_DIR, `${tab.name}.png`),
          fullPage: true,
        });
        console.log(`     ✅ ${tab.name}.png (${tab.label} tab)`);
      } catch {
        console.log(`     ⏭  ${tab.label} tab not found`);
      }
    }
  } catch (err) {
    console.log(`     ❌ Tab screenshots failed: ${err.message}`);
  }

  await browser.close();

  console.log(`\n✅ All screenshots saved to: ${SCREENSHOT_DIR}\n`);

  // List captured files
  const { readdirSync } = await import("fs");
  const files = readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith(".png")).sort();
  console.log(`📁 ${files.length} screenshots captured:`);
  files.forEach(f => console.log(`   ${f}`));
}

main().catch(console.error);

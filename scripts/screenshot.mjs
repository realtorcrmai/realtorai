import { chromium } from "@playwright/test";
import { readFileSync } from "fs";

// Load env
try {
  const env = readFileSync("/Users/bigbear/reality crm/realestate-crm/.env.local", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {}

const BASE = "http://localhost:3000";
const EMAIL = process.env.DEMO_EMAIL || "demo@realestatecrm.com";
const PASS = process.env.DEMO_PASSWORD || "demo123";
const OUT = "/Users/bigbear/reality crm/guides/screenshots";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Login
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Screenshots
  const pages = [
    ["/", "dashboard"],
    ["/newsletters", "email-marketing"],
    ["/settings", "settings"],
    ["/contacts", "contacts"],
    ["/automations", "automations"],
    ["/tasks", "tasks"],
    ["/pipeline", "pipeline"],
    ["/calendar", "calendar"],
  ];

  for (const [path, name] of pages) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
      console.log(`✓ ${name}`);
    } catch (e) {
      console.log(`✗ ${name}: ${e.message?.slice(0, 80)}`);
    }
  }

  // Email marketing tabs
  try {
    await page.goto(`${BASE}/newsletters`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1500);

    const tabs = ["AI Workflows", "Performance", "Campaigns", "Automation", "Settings"];
    for (const tab of tabs) {
      try {
        await page.click(`button:has-text("${tab}")`);
        await page.waitForTimeout(1000);
        const slug = tab.toLowerCase().replace(/ /g, "-");
        await page.screenshot({ path: `${OUT}/email-${slug}.png`, fullPage: false });
        console.log(`✓ email-${slug}`);
      } catch (e) {
        console.log(`✗ email-${tab}: ${e.message?.slice(0, 80)}`);
      }
    }
  } catch {}

  await browser.close();
  console.log(`\nScreenshots saved to: ${OUT}/`);
}

run().catch(e => console.error("Fatal:", e));

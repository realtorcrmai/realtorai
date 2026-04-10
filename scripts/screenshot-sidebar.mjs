import { chromium } from "@playwright/test";
import { readFileSync } from "fs";

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

  // Set sidebar layout in localStorage
  await page.evaluate(() => {
    localStorage.setItem("lf-layout-mode", "sidebar");
  });

  // Reload to apply
  await page.reload({ waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/sidebar-dashboard.png`, fullPage: false });
  console.log("✓ sidebar dashboard");

  await page.goto(`${BASE}/newsletters`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/sidebar-newsletters.png`, fullPage: false });
  console.log("✓ sidebar newsletters");

  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/sidebar-settings.png`, fullPage: false });
  console.log("✓ sidebar settings");

  await page.goto(`${BASE}/automations`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/sidebar-automations.png`, fullPage: false });
  console.log("✓ sidebar automations");

  await browser.close();
  console.log("Done!");
}

run().catch(e => console.error("Fatal:", e));

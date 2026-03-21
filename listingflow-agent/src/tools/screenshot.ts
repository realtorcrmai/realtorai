import { chromium, Browser } from "playwright";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

/**
 * Take screenshots of a URL at desktop and mobile sizes.
 * Returns base64-encoded PNG screenshots.
 */
export async function screenshotSite(url: string): Promise<{
  desktop: string;
  mobile: string;
  consoleErrors: string[];
}> {
  const b = await getBrowser();
  const consoleErrors: string[] = [];

  // Desktop screenshot
  const desktopPage = await b.newPage({
    viewport: { width: 1440, height: 900 },
  });
  desktopPage.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await desktopPage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  const desktopBuffer = await desktopPage.screenshot({ fullPage: true });
  await desktopPage.close();

  // Mobile screenshot
  const mobilePage = await b.newPage({
    viewport: { width: 375, height: 812 },
  });
  await mobilePage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  const mobileBuffer = await mobilePage.screenshot({ fullPage: true });
  await mobilePage.close();

  return {
    desktop: desktopBuffer.toString("base64"),
    mobile: mobileBuffer.toString("base64"),
    consoleErrors,
  };
}

/**
 * Take screenshots of raw HTML content using page.setContent() — no server needed.
 * Returns base64-encoded PNG screenshots at desktop and mobile sizes.
 */
export async function screenshotHTML(html: string): Promise<{
  desktop: string;
  mobile: string;
  consoleErrors: string[];
}> {
  const b = await getBrowser();
  const consoleErrors: string[] = [];

  // Desktop screenshot
  const desktopPage = await b.newPage({
    viewport: { width: 1440, height: 900 },
  });
  desktopPage.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await desktopPage.setContent(html, { waitUntil: "networkidle", timeout: 30000 });
  const desktopBuffer = await desktopPage.screenshot({ fullPage: true });
  await desktopPage.close();

  // Mobile screenshot
  const mobilePage = await b.newPage({
    viewport: { width: 375, height: 812 },
  });
  await mobilePage.setContent(html, { waitUntil: "networkidle", timeout: 30000 });
  const mobileBuffer = await mobilePage.screenshot({ fullPage: true });
  await mobilePage.close();

  return {
    desktop: desktopBuffer.toString("base64"),
    mobile: mobileBuffer.toString("base64"),
    consoleErrors,
  };
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

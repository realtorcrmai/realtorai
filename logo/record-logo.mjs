/**
 * Records the animated logo HTML as an MP4 video using Playwright.
 *
 * Usage: node record-logo.mjs
 * Output: logo-animated.webm (then convert to mp4 with ffmpeg)
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function recordLogo() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });

  // Create context with video recording
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1080 },
    recordVideo: {
      dir: join(__dirname),
      size: { width: 1080, height: 1080 },
    },
  });

  const page = await context.newPage();

  console.log('Loading logo page...');
  await page.goto('http://localhost:3000/logo-animated.html', {
    waitUntil: 'networkidle',
  });

  // Wait for entrance animation (1.8s) + a full rotation cycle (6s) + extra
  console.log('Recording animation (10 seconds)...');
  await page.waitForTimeout(10000);

  // Close to finalize video
  await page.close();

  const videoPath = await page.video().path();
  console.log(`Video saved: ${videoPath}`);

  await context.close();
  await browser.close();

  console.log('\nDone! Now convert to MP4:');
  console.log(`  ffmpeg -i "${videoPath}" -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow "${join(__dirname, 'logo-animated.mp4')}"`);
}

recordLogo().catch(console.error);

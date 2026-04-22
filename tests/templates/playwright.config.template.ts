import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Realtors360 CRM E2E tests.
 * Assumes Next.js dev server running on port 3000.
 * Demo auth: demo@realestatecrm.com / demo1234
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Test file pattern
  testMatch: '**/*.spec.ts',

  // Timeout per test
  timeout: 30_000,

  // Expect timeout
  expect: {
    timeout: 5_000,
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['list'],
  ],

  // Global setup — handles demo login and saves auth state
  globalSetup: './tests/e2e/global-setup.ts',

  // Shared settings for all projects
  use: {
    // Base URL for the Realtors360 CRM
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Use saved auth state from global setup
    storageState: './tests/e2e/.auth/demo-user.json',

    // Navigation timeout
    navigationTimeout: 15_000,

    // Action timeout
    actionTimeout: 10_000,
  },

  // Configure projects for different browsers/viewports
  projects: [
    // Desktop Chrome — primary testing browser
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // Desktop Firefox
    {
      name: 'desktop-firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    // Mobile Safari (iPhone 14) — tests mobile nav + bottom bar
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 14'],
      },
    },

    // Tablet (iPad) — tests responsive layout
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro 11'],
      },
    },

    // Accessibility testing project — axe-core integration
    {
      name: 'a11y',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: '**/*.a11y.spec.ts',
    },
  ],

  // Web server configuration — start Next.js dev server if not running
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

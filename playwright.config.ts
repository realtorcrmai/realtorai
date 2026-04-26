import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  globalSetup: "./tests/fixtures/global-setup.ts",
  timeout: 60000,
  retries: 0,
  // Next.js dev server is single-threaded; too many parallel workers cause
  // route-compile saturation and spurious goto timeouts. 2 workers is the
  // sweet spot we found empirically (8 → 2 cut failures 78 → 43, runtime 17m → 10m).
  workers: 2,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "on",
    trace: "on",
    video: "retain-on-failure",
  },
  outputDir: "test-results",
  projects: [
    // Login once — all other projects depend on this
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Warm up Turbopack chunks for every major route using the authenticated
    // session, so test workers don't race cold compiles and time out.
    {
      name: "warmup",
      testMatch: /warmup\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/browser/.auth/session.json",
      },
      dependencies: ["setup"],
    },
    // Desktop tests reuse the saved session (no per-test login)
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/browser/.auth/session.json",
      },
      dependencies: ["warmup"],
      testIgnore: /auth\.setup\.ts|warmup\.setup\.ts/,
    },
    // Mobile tests reuse the same session
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        storageState: "tests/browser/.auth/session.json",
      },
      dependencies: ["warmup"],
      testIgnore: /auth\.setup\.ts|warmup\.setup\.ts/,
    },
  ],
  reporter: [["list"], ["html", { open: "never" }]],
});

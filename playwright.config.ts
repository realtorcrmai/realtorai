import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    // Login once — all other projects depend on this
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Desktop tests reuse the saved session (no per-test login)
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/browser/.auth/session.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
    // Mobile tests reuse the same session
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        storageState: "tests/browser/.auth/session.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  reporter: [["list"], ["html", { open: "never" }]],
});

/**
 * Playwright global setup — runs exactly once before any project.
 *
 * Responsibilities:
 *   1. Load .env.local so SUPABASE_SERVICE_ROLE_KEY is available.
 *   2. Seed canonical fixture rows via seedAll().
 *
 * auth.setup.ts still runs after this (as a separate Playwright project)
 * to produce the storageState cookie. This file only guarantees data.
 */
import { config as loadEnv } from "dotenv";
import { seedAll } from "./seed";

export default async function globalSetup() {
  loadEnv({ path: ".env.local" });
  await seedAll();
}

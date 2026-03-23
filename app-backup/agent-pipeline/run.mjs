#!/usr/bin/env node

/**
 * Agent Pipeline — CLI entry point
 *
 * Usage:
 *   node agent-pipeline/run.mjs "build offer management feature"
 *   node agent-pipeline/run.mjs --dry-run "build offer management"
 *   node agent-pipeline/run.mjs --resume outputs/2026-03-21-offer-mgmt/ "offer management"
 *   node agent-pipeline/run.mjs --stage 2 "offer management"
 */

import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Forward all args to the TypeScript pipeline
const args = process.argv.slice(2).map((a) => `"${a}"`).join(" ");

try {
  execSync(`npx tsx src/pipeline.ts ${args}`, {
    cwd: __dirname,
    stdio: "inherit",
    env: { ...process.env },
  });
} catch (error) {
  process.exit(error.status || 1);
}

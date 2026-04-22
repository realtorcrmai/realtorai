#!/usr/bin/env node
/**
 * Runs the smoke harness for the current CODING:feature task.
 * Called by completion-gate.sh.
 *
 * Exit 0 = smoke passed (or no smoke needed), Exit 1 = smoke failed
 */

import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";

const TASK_FILE = ".claude/current-task.json";

if (!existsSync(TASK_FILE)) {
  // No task — no smoke needed
  process.exit(0);
}

const task = JSON.parse(readFileSync(TASK_FILE, "utf-8"));

if (task.type !== "CODING:feature") {
  process.exit(0);
}

const slug = task.slug;
if (!slug) {
  console.error("ERROR: CODING:feature task missing 'slug' field");
  process.exit(1);
}

const smokeFile = `tests/smoke/${slug}.smoke.ts`;
if (!existsSync(smokeFile)) {
  console.error(`ERROR: Smoke harness missing: ${smokeFile}`);
  console.error("Copy tests/smoke/TEMPLATE.ts and replace imports with your new code.");
  process.exit(1);
}

// Detect placeholder smoke files
const contents = readFileSync(smokeFile, "utf-8");
if (contents.includes("expect(true).toBe(true); // placeholder")) {
  console.error(`ERROR: Smoke harness ${smokeFile} still contains the template placeholder.`);
  console.error("Replace the placeholder with at least one real assertion against your new code.");
  process.exit(1);
}

// Run the smoke harness via vitest
try {
  execSync(`npx vitest run ${smokeFile} --reporter=basic`, {
    stdio: "inherit",
    timeout: 30000,
  });
} catch {
  console.error(`ERROR: Smoke harness failed.`);
  process.exit(1);
}

console.log(`Smoke passed: ${smokeFile}`);
process.exit(0);

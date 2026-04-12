#!/usr/bin/env node
/**
 * Deep docs audit — checks changed files against the docs-change-map
 * to determine which docs SHOULD have been updated in this PR.
 *
 * Usage:
 *   node scripts/audit-docs-deep.mjs          # check uncommitted + staged changes
 *   node scripts/audit-docs-deep.mjs --ci     # check PR diff (origin/dev..HEAD)
 *
 * Exit codes:
 *   0 — all required docs are updated (or no doc-triggering files changed)
 *   1 — docs need updating (details printed)
 *
 * This runs AFTER the basic audit-docs.mjs. The basic audit checks
 * structural consistency (are all scripts documented?). This deep audit
 * checks whether SPECIFIC changes in this PR require SPECIFIC doc updates.
 */

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const isCI = process.argv.includes("--ci");

// Load the change map
const changeMap = JSON.parse(
  readFileSync(resolve(ROOT, "scripts/docs-change-map.json"), "utf8")
);

// Get changed files
let changedFiles;
try {
  if (isCI) {
    // In CI: compare PR branch against base (origin/dev or origin/main)
    changedFiles = execSync("git diff --name-only origin/dev...HEAD 2>/dev/null || git diff --name-only origin/main...HEAD 2>/dev/null || echo ''", {
      cwd: ROOT, encoding: "utf8",
    }).trim().split("\n").filter(Boolean);
  } else {
    // Locally: staged + unstaged changes
    const staged = execSync("git diff --cached --name-only 2>/dev/null || echo ''", {
      cwd: ROOT, encoding: "utf8",
    }).trim().split("\n").filter(Boolean);

    const unstaged = execSync("git diff --name-only 2>/dev/null || echo ''", {
      cwd: ROOT, encoding: "utf8",
    }).trim().split("\n").filter(Boolean);

    const untracked = execSync("git ls-files --others --exclude-standard 2>/dev/null || echo ''", {
      cwd: ROOT, encoding: "utf8",
    }).trim().split("\n").filter(Boolean);

    changedFiles = [...new Set([...staged, ...unstaged, ...untracked])];
  }
} catch {
  changedFiles = [];
}

if (changedFiles.length === 0) {
  console.log("No changed files detected — skipping deep docs audit.");
  process.exit(0);
}

// Match changed files against rules
function matchesPattern(filePath, pattern) {
  // Simple glob matching
  if (pattern.includes("**")) {
    const prefix = pattern.split("**")[0];
    return filePath.startsWith(prefix);
  }
  if (pattern.includes("*")) {
    const parts = pattern.split("*");
    if (parts.length === 2) {
      return filePath.startsWith(parts[0]) && filePath.endsWith(parts[1]);
    }
    // Directory glob: src/components/*/
    const prefix = parts[0];
    return filePath.startsWith(prefix);
  }
  // Exact match or prefix
  return filePath === pattern || filePath.startsWith(pattern);
}

console.log(`=== Deep Docs Audit (${changedFiles.length} changed files) ===\n`);

const requiredUpdates = [];
const docsTouched = new Set(
  changedFiles.filter((f) => f.endsWith(".md"))
);

for (const rule of changeMap.rules) {
  const matchingFiles = changedFiles.filter((f) => matchesPattern(f, rule.pattern));

  if (matchingFiles.length === 0) continue;

  // Check if the required docs were also modified in this changeset
  for (const doc of rule.docs) {
    if (!docsTouched.has(doc)) {
      requiredUpdates.push({
        trigger: matchingFiles[0] + (matchingFiles.length > 1 ? ` (+${matchingFiles.length - 1} more)` : ""),
        pattern: rule.pattern,
        doc,
        section: rule.section,
        reason: rule.reason,
      });
    }
  }
}

if (requiredUpdates.length === 0) {
  console.log("✅ All changed files have corresponding doc updates (or no doc-triggering changes).\n");
  process.exit(0);
}

// Dedupe by doc
const byDoc = new Map();
for (const u of requiredUpdates) {
  if (!byDoc.has(u.doc)) byDoc.set(u.doc, []);
  byDoc.get(u.doc).push(u);
}

console.log(`⚠ ${requiredUpdates.length} doc update(s) needed:\n`);

for (const [doc, updates] of byDoc) {
  console.log(`  📄 ${doc}`);
  for (const u of updates) {
    console.log(`     ← ${u.trigger}`);
    console.log(`       Section: ${u.section}`);
    console.log(`       Why: ${u.reason}`);
  }
  console.log("");
}

console.log("Fix: update the docs listed above to reflect your changes, then commit them in the same PR.");
console.log("Run this check locally: node scripts/audit-docs-deep.mjs\n");

process.exit(1);

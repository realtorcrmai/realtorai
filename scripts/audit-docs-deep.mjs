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

// ── Self-declared doc headers ────────────────────────────────────
// Scan all .md files in docs/ and root for <!-- docs-audit: patterns --> tags.
// These are "self-declared" rules: each doc says what code it tracks.
// If a code change matches a doc's declared patterns, and the doc
// wasn't updated, the audit flags it. This makes the system
// self-maintaining — new docs just need the header tag.
import { readdirSync } from "node:fs";

function loadSelfDeclaredRules() {
  const rules = [];
  const scanDirs = [
    { dir: resolve(ROOT, "docs"), prefix: "docs/" },
    { dir: ROOT, prefix: "" },
  ];

  for (const { dir, prefix } of scanDirs) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const fullPath = resolve(dir, file);
      const content = readFileSync(fullPath, "utf8");
      const match = content.match(/<!--\s*docs-audit:\s*(.+?)\s*-->/);
      if (!match) continue;

      const patterns = match[1].split(",").map((p) => p.trim()).filter(Boolean);
      const docPath = prefix + file;

      for (const pattern of patterns) {
        rules.push({
          pattern,
          docs: [docPath],
          section: "self-declared",
          reason: `${docPath} declares it tracks changes in ${pattern}`,
        });
      }
    }
  }
  return rules;
}

const selfDeclaredRules = loadSelfDeclaredRules();
const allRules = [...changeMap.rules, ...selfDeclaredRules];

console.log(`=== Deep Docs Audit (${changedFiles.length} changed files, ${allRules.length} rules [${changeMap.rules.length} map + ${selfDeclaredRules.length} self-declared]) ===\n`);

const requiredUpdates = [];
const docsTouched = new Set(
  changedFiles.filter((f) => f.endsWith(".md"))
);

// Limit to high-value docs only — skip overly broad "src/**" self-declared
// rules that would trigger on every PR. Only flag specific-enough patterns.
const TOO_BROAD = new Set(["src/**", "docs/*"]);

for (const rule of allRules) {
  if (TOO_BROAD.has(rule.pattern)) continue;

  const matchingFiles = changedFiles.filter((f) => matchesPattern(f, rule.pattern));

  if (matchingFiles.length === 0) continue;

  // Check if the required docs were also modified in this changeset
  for (const doc of rule.docs) {
    if (!docsTouched.has(doc)) {
      requiredUpdates.push({
        trigger: matchingFiles[0] + (matchingFiles.length > 1 ? ` (+${matchingFiles.length - 1} more)` : ""),
        pattern: rule.pattern,
        doc,
        section: rule.section || "self-declared",
        reason: rule.reason || `${doc} tracks this code path`,
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

// ── Check for new docs without self-declaration headers ──────────
const untaggedDocs = [];
const docsDir = resolve(ROOT, "docs");
if (existsSync(docsDir)) {
  for (const file of readdirSync(docsDir).filter((f) => f.endsWith(".md"))) {
    const content = readFileSync(resolve(docsDir, file), "utf8");
    if (!content.includes("<!-- docs-audit:")) {
      untaggedDocs.push(`docs/${file}`);
    }
  }
}
if (untaggedDocs.length > 0) {
  console.log(`\n⚠ ${untaggedDocs.length} doc(s) missing self-declaration header:`);
  for (const d of untaggedDocs) {
    console.log(`  ${d} — add: <!-- docs-audit: <code-patterns-this-doc-tracks> -->`);
  }
}

process.exit(1);

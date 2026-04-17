#!/usr/bin/env node
/**
 * Auto-apply SQL migrations to a Supabase project via Management API.
 *
 * Modes:
 *   --new-only     Apply only migrations added in the latest commit (for CI)
 *   --all          Apply all migrations in order (for fresh DB setup)
 *   --file <path>  Apply a single file
 *
 * Required env vars:
 *   SUPABASE_ACCESS_TOKEN    Personal access token
 *   SUPABASE_PROJECT_REF     Target project ref (e.g. qcohfohjihazivkforsj)
 *
 * Optional:
 *   --dry-run    Print SQL file names but don't execute
 *
 * Exit codes:
 *   0 — all migrations applied (or nothing to apply)
 *   1 — one or more migrations failed
 *
 * Usage in CI:
 *   SUPABASE_ACCESS_TOKEN=${{ secrets.SUPABASE_ACCESS_TOKEN }}
 *   SUPABASE_PROJECT_REF=qcohfohjihazivkforsj
 *   node scripts/apply-migrations.mjs --new-only
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, basename } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MIG_DIR = resolve(ROOT, "supabase/migrations");
const SITES_MIG_DIR = resolve(ROOT, "listingflow-sites/supabase/migrations");

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const DRY_RUN = process.argv.includes("--dry-run");
const NEW_ONLY = process.argv.includes("--new-only");
const ALL = process.argv.includes("--all");
const FILE_IDX = process.argv.indexOf("--file");
const SINGLE_FILE = FILE_IDX !== -1 ? process.argv[FILE_IDX + 1] : null;

if (!TOKEN) {
  console.error("❌ SUPABASE_ACCESS_TOKEN env var required");
  console.error("   Generate at: https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}
if (!PROJECT_REF) {
  console.error("❌ SUPABASE_PROJECT_REF env var required");
  console.error("   Dev: qcohfohjihazivkforsj");
  console.error("   Prod: opbrqlmhhqvfomevvkon");
  process.exit(1);
}

async function applySql(sql, filename) {
  if (DRY_RUN) {
    console.log(`  [dry-run] would apply: ${filename}`);
    return { ok: true };
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

// ── Determine which files to apply ──────────────────────────

let filesToApply = [];

if (SINGLE_FILE) {
  const p = resolve(ROOT, SINGLE_FILE);
  if (!existsSync(p)) {
    console.error(`❌ File not found: ${SINGLE_FILE}`);
    process.exit(1);
  }
  filesToApply = [p];
} else if (NEW_ONLY) {
  // Find migration files added in the latest commit
  try {
    const diff = execSync(
      "git diff --name-only --diff-filter=A HEAD~1..HEAD 2>/dev/null || echo ''",
      { cwd: ROOT, encoding: "utf8" }
    ).trim();

    filesToApply = diff
      .split("\n")
      .filter((f) => f.match(/^supabase\/migrations\/.*\.sql$/) ||
                     f.match(/^listingflow-sites\/supabase\/migrations\/.*\.sql$/))
      .map((f) => resolve(ROOT, f))
      .filter((f) => existsSync(f));
  } catch {
    filesToApply = [];
  }
} else if (ALL) {
  // All migration files in order
  const main = existsSync(MIG_DIR)
    ? readdirSync(MIG_DIR).filter((f) => f.endsWith(".sql")).sort().map((f) => resolve(MIG_DIR, f))
    : [];
  const sites = existsSync(SITES_MIG_DIR)
    ? readdirSync(SITES_MIG_DIR).filter((f) => f.endsWith(".sql")).sort().map((f) => resolve(SITES_MIG_DIR, f))
    : [];
  filesToApply = [...main, ...sites];
} else {
  console.error("Usage: node scripts/apply-migrations.mjs --new-only | --all | --file <path>");
  console.error("  --dry-run   Print but don't execute");
  process.exit(1);
}

if (filesToApply.length === 0) {
  console.log("No new migration files to apply.");
  process.exit(0);
}

// ── Apply ───────────────────────────────────────────────────

console.log(`\n=== Applying ${filesToApply.length} migration(s) to ${PROJECT_REF} ===\n`);

let ok = 0;
let failed = 0;
const errors = [];

for (const file of filesToApply) {
  const filename = basename(file);
  const sql = readFileSync(file, "utf8");

  const result = await applySql(sql, filename);

  if (result.ok) {
    ok++;
    console.log(`  ✓ ${filename}`);
  } else {
    failed++;
    const errMsg = result.body?.slice(0, 200) || "unknown error";
    errors.push({ filename, error: errMsg });
    console.log(`  ❌ ${filename} — ${errMsg}`);
  }
}

console.log(`\nResult: ${ok} succeeded, ${failed} failed`);

if (errors.length > 0) {
  console.log("\nFailed migrations:");
  for (const e of errors) {
    console.log(`  ${e.filename}: ${e.error}`);
  }
  process.exit(1);
}

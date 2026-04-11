#!/usr/bin/env node
/**
 * apply-newsletter-migrations.mjs
 *
 * Applies Newsletter Engine v3 migrations (074, 075, 076) to the linked
 * Supabase project via the Management API. Direct DB access from this dev
 * environment is blocked by IPv6-only DNS for the project host (see
 * .claude/compliance-log.md 2026-04-02 entries), so the API is the only path.
 *
 * Required env vars:
 *   SUPABASE_ACCESS_TOKEN   - personal access token from Supabase dashboard
 *   SUPABASE_PROJECT_REF    - project ref (the subdomain of your supabase URL)
 *
 * Optional:
 *   --dry-run               - print SQL but don't execute
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... \
 *   SUPABASE_PROJECT_REF=qcohfohjihazivkforsj \
 *     node scripts/apply-newsletter-migrations.mjs
 *
 * The migrations themselves are idempotent (CREATE TABLE IF NOT EXISTS,
 * ON CONFLICT DO NOTHING), so this script is safe to re-run.
 */

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const MIGRATIONS = [
  "supabase/migrations/074_newsletter_engine_v3.sql",
  "supabase/migrations/075_newsletter_engine_v3_m2.sql",
  // M3-D: partial unique index on agent_recommendations to fix duplicate
  // pending recommendations from the 15-min agent-scoring cron loop.
  // Renumbered from 076 to 077 to avoid colliding with PR #111
  // (`076_property_co_ownership.sql` — unrelated feature, took 076 first).
  "supabase/migrations/077_agent_recommendations_unique_index.sql",
];

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const DRY_RUN = process.argv.includes("--dry-run");

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

if (!ACCESS_TOKEN) {
  fail("SUPABASE_ACCESS_TOKEN env var is required");
}
if (!PROJECT_REF) {
  fail(
    "SUPABASE_PROJECT_REF env var is required (the subdomain of your supabase URL)"
  );
}

async function runQuery(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Management API ${res.status}: ${body}`);
  }
  return res.json();
}

async function applyMigration(relPath) {
  const fullPath = join(ROOT, relPath);
  const sql = await readFile(fullPath, "utf8");

  console.log(`\n📄 ${relPath} (${sql.length} bytes)`);

  if (DRY_RUN) {
    console.log("   [dry-run] would execute via Management API");
    return;
  }

  const startedAt = Date.now();
  try {
    await runQuery(sql);
    console.log(`   ✅ applied in ${Date.now() - startedAt}ms`);
  } catch (err) {
    console.error(`   ❌ failed: ${err.message}`);
    throw err;
  }
}

async function main() {
  console.log("🚀 Newsletter Engine v3 — migration runner");
  console.log(`   Project ref: ${PROJECT_REF}`);
  console.log(`   Migrations:  ${MIGRATIONS.length}`);
  console.log(`   Mode:        ${DRY_RUN ? "DRY RUN" : "LIVE"}`);

  for (const m of MIGRATIONS) {
    await applyMigration(m);
  }

  if (!DRY_RUN) {
    // Verify the tables exist
    console.log("\n🔍 verifying tables...");
    const verify = await runQuery(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'email_events',
          'email_event_rules',
          'saved_searches',
          'market_stats_cache',
          'neighbourhood_data',
          'email_template_registry'
        )
      ORDER BY table_name;
    `);
    console.log(`   tables present: ${JSON.stringify(verify)}`);
  }

  console.log("\n✅ done");
}

main().catch((err) => {
  console.error("\n💥 fatal:", err.message);
  process.exit(1);
});

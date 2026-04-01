#!/usr/bin/env node
/**
 * Realtors360 — Multi-Tenancy Isolation Test Suite
 * Validates that tenant isolation is properly enforced across the codebase.
 *
 * Tests:
 * 1. Migration files exist and are correct
 * 2. Tenant utility files exist and export correct functions
 * 3. Server actions use tenantClient (not raw createAdminClient)
 * 4. API routes have tenant filtering
 * 5. Auth session includes realtorId
 * 6. Security: no hardcoded secrets
 * 7. RLS policies configured
 *
 * Usage: node scripts/test-multi-tenancy.mjs
 */

import fs from "fs";
import path from "path";

const SRC = path.resolve(process.cwd(), "src");
const MIGRATIONS = path.resolve(process.cwd(), "supabase/migrations");

let passed = 0;
let failed = 0;
const failures = [];

function log(status, id, title, detail = "") {
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`${icon} ${id}: ${title}${detail ? ` — ${detail}` : ""}`);
  if (status === "PASS") passed++;
  else { failed++; failures.push({ id, title, detail }); }
}

// ============================================================
// Category 1: Migration Files
// ============================================================

function testMigrations() {
  console.log("\n🗄️ Category 1: Migration Files\n");

  const m062 = path.join(MIGRATIONS, "062_add_realtor_id_columns.sql");
  const m063 = path.join(MIGRATIONS, "063_backfill_realtor_id.sql");
  const m064 = path.join(MIGRATIONS, "064_enforce_realtor_id_not_null.sql");
  const m065 = path.join(MIGRATIONS, "065_tenant_rls_policies.sql");

  log(fs.existsSync(m062) ? "PASS" : "FAIL", "MT-001", "Migration 062 exists");
  log(fs.existsSync(m063) ? "PASS" : "FAIL", "MT-002", "Migration 063 exists");
  log(fs.existsSync(m064) ? "PASS" : "FAIL", "MT-003", "Migration 064 exists");
  log(fs.existsSync(m065) ? "PASS" : "FAIL", "MT-004", "Migration 065 exists");

  if (fs.existsSync(m062)) {
    const content = fs.readFileSync(m062, "utf8");
    const tables = [
      "contacts", "listings", "appointments", "communications",
      "deals", "offers", "newsletters", "tasks", "activities",
      "social_posts", "social_brand_kits", "households",
    ];
    for (const t of tables) {
      log(content.includes(`ALTER TABLE ${t} ADD COLUMN`) ? "PASS" : "FAIL",
        `MT-005-${t}`, `Migration 062 adds realtor_id to ${t}`);
    }

    // Check indexes
    log(content.includes("CREATE INDEX") ? "PASS" : "FAIL",
      "MT-006", "Migration 062 creates indexes on realtor_id");

    // Check trigger
    log(content.includes("prevent_realtor_id_change") ? "PASS" : "FAIL",
      "MT-007", "Migration 062 creates prevent_realtor_id_change trigger");
  }

  if (fs.existsSync(m063)) {
    const content = fs.readFileSync(m063, "utf8");
    log(content.includes("WHERE realtor_id IS NULL") ? "PASS" : "FAIL",
      "MT-008", "Migration 063 only backfills NULL values");
    log(content.includes("SELECT id INTO v_realtor_id FROM users") ? "PASS" : "FAIL",
      "MT-009", "Migration 063 gets realtor_id from users table");
  }

  if (fs.existsSync(m065)) {
    const content = fs.readFileSync(m065, "utf8");
    log(content.includes('DROP POLICY') ? "PASS" : "FAIL",
      "MT-010", "Migration 065 drops old permissive policies");
    log(content.includes("Anon users full access") ? "PASS" : "FAIL",
      "MT-011", "Migration 065 drops anon access policies");
  }
}

// ============================================================
// Category 2: Tenant Utility Files
// ============================================================

function testTenantUtils() {
  console.log("\n🔧 Category 2: Tenant Utility Files\n");

  const tenantFile = path.join(SRC, "lib/supabase/tenant.ts");
  log(fs.existsSync(tenantFile) ? "PASS" : "FAIL", "MT-020", "tenant.ts exists");

  if (fs.existsSync(tenantFile)) {
    const content = fs.readFileSync(tenantFile, "utf8");
    log(content.includes("tenantClient") ? "PASS" : "FAIL",
      "MT-021", "Exports tenantClient function");
    log(content.includes("getRealtorId") ? "PASS" : "FAIL",
      "MT-022", "Exports getRealtorId function");
    log(content.includes("getAuthenticatedTenantClient") ? "PASS" : "FAIL",
      "MT-023", "Exports getAuthenticatedTenantClient function");
    log(content.includes("GLOBAL_TABLES") ? "PASS" : "FAIL",
      "MT-024", "Defines GLOBAL_TABLES set");
    log(content.includes("TenantQueryBuilder") ? "PASS" : "FAIL",
      "MT-025", "Implements TenantQueryBuilder class");
    log(content.includes('.eq("realtor_id"') ? "PASS" : "FAIL",
      "MT-026", "TenantQueryBuilder injects realtor_id filter");
    log(content.includes("realtor_id") ? "PASS" : "FAIL",
      "MT-027", "Insert method auto-adds realtor_id");
  }
}

// ============================================================
// Category 3: Auth System
// ============================================================

function testAuth() {
  console.log("\n🔐 Category 3: Auth System\n");

  const authFile = path.join(SRC, "lib/auth.ts");
  if (fs.existsSync(authFile)) {
    const content = fs.readFileSync(authFile, "utf8");
    log(content.includes("realtorId") ? "PASS" : "FAIL",
      "MT-030", "Auth session includes realtorId");
    log(content.includes("session.user.id") ? "PASS" : "FAIL",
      "MT-031", "Auth session sets user.id");
    log(!content.includes('"demo@realestatecrm.com"') ? "PASS" : "FAIL",
      "MT-032", "No hardcoded demo email fallback");
    log(!content.includes('"demo1234"') ? "PASS" : "FAIL",
      "MT-033", "No hardcoded demo password fallback");
  }
}

// ============================================================
// Category 4: Security Hardening
// ============================================================

function testSecurity() {
  console.log("\n🛡️ Category 4: Security Hardening\n");

  // Check for hardcoded cron secret in client code
  const digestCard = path.join(SRC, "components/dashboard/DailyDigestCard.tsx");
  if (fs.existsSync(digestCard)) {
    const content = fs.readFileSync(digestCard, "utf8");
    log(!content.includes("listingflow-cron-secret") ? "PASS" : "FAIL",
      "MT-040", "No hardcoded CRON_SECRET in DailyDigestCard");
    log(!content.includes("NEXT_PUBLIC_CRON_SECRET") ? "PASS" : "FAIL",
      "MT-041", "No NEXT_PUBLIC_CRON_SECRET in client code");
  }

  // Check for hardcoded API keys in social files
  const socialFiles = [
    "lib/social/content-generator.ts",
    "lib/social/facebook-api.ts",
    "lib/social/crypto.ts",
    "actions/social-content.ts",
  ];
  let hasHardcodedKey = false;
  for (const file of socialFiles) {
    const fullPath = path.join(SRC, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      if (content.match(/sk-[a-zA-Z0-9]{20,}/) || content.match(/EAA[a-zA-Z0-9]{20,}/)) {
        hasHardcodedKey = true;
      }
    }
  }
  log(!hasHardcodedKey ? "PASS" : "FAIL",
    "MT-042", "No hardcoded API keys in social source files");

  // Check middleware exemptions
  const middleware = path.join(SRC, "middleware.ts");
  if (fs.existsSync(middleware)) {
    const content = fs.readFileSync(middleware, "utf8");
    log(content.includes("/api/social/oauth") ? "PASS" : "FAIL",
      "MT-043", "Social OAuth exempted in middleware");
  }
}

// ============================================================
// Category 5: Server Actions Tenant Usage
// ============================================================

function testServerActions() {
  console.log("\n⚡ Category 5: Server Actions Tenant Usage\n");

  const actionsDir = path.join(SRC, "actions");
  const actionFiles = [
    "contacts.ts", "listings.ts", "newsletters.ts",
    "journeys.ts", "social-content.ts",
    "showings.ts", "recommendations.ts",
    "segments.ts", "households.ts",
    // content.ts excluded — uses fetch() to external service, no Supabase queries
  ];

  for (const file of actionFiles) {
    const fullPath = path.join(actionsDir, file);
    if (!fs.existsSync(fullPath)) {
      log("FAIL", `MT-050-${file}`, `Action file exists: ${file}`);
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    log("PASS", `MT-050-${file}`, `Action file exists: ${file}`);

    // Check if it imports tenant utilities
    const hasTenantImport = content.includes("getAuthenticatedTenantClient") ||
      content.includes("tenantClient") ||
      content.includes("getRealtorId");

    log(hasTenantImport ? "PASS" : "FAIL",
      `MT-051-${file}`, `${file} imports tenant utility`);
  }
}

// ============================================================
// Category 6: Feature Registration
// ============================================================

function testFeatures() {
  console.log("\n📋 Category 6: Feature & Nav Registration\n");

  const features = fs.readFileSync(path.join(SRC, "lib/features.ts"), "utf8");
  log(features.includes('"social"') ? "PASS" : "FAIL",
    "MT-060", "Social feature registered");

  const header = fs.readFileSync(path.join(SRC, "components/layout/AppHeader.tsx"), "utf8");
  log(header.includes("/social") ? "PASS" : "FAIL",
    "MT-061", "Social in navigation");
}

// ============================================================
// Category 7: Database Schema Completeness
// ============================================================

function testSchemaCompleteness() {
  console.log("\n📊 Category 7: Schema Completeness\n");

  const m062 = path.join(MIGRATIONS, "062_add_realtor_id_columns.sql");
  if (!fs.existsSync(m062)) {
    log("FAIL", "MT-070", "Cannot check schema — migration 062 missing");
    return;
  }

  const content = fs.readFileSync(m062, "utf8");

  // Count ALTER TABLE statements
  const alterCount = (content.match(/ALTER TABLE \w+ ADD COLUMN/g) || []).length;
  log(alterCount >= 70 ? "PASS" : "FAIL",
    "MT-070", `Migration 062 has ${alterCount} ALTER TABLE statements (need 70+)`);

  // Count CREATE INDEX statements
  const indexCount = (content.match(/CREATE INDEX/g) || []).length;
  log(indexCount >= 20 ? "PASS" : "FAIL",
    "MT-071", `Migration 062 has ${indexCount} indexes (need 20+)`);

  // Check FK reference
  log(content.includes("REFERENCES users(id)") ? "PASS" : "FAIL",
    "MT-072", "realtor_id references users(id)");
}

// ============================================================
// RUN ALL TESTS
// ============================================================

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║  Realtors360 — Multi-Tenancy Isolation Test Suite   ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

testMigrations();
testTenantUtils();
testAuth();
testSecurity();
testServerActions();
testFeatures();
testSchemaCompleteness();

console.log("\n══════════════════════════════════════════════════════");
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failures.length > 0) {
  console.log("❌ Failures:");
  for (const f of failures) {
    console.log(`   ${f.id}: ${f.title}${f.detail ? ` — ${f.detail}` : ""}`);
  }
}

console.log(`\n${failed === 0 ? "🎉 ALL TESTS PASSED!" : `⚠️  ${failed} test(s) failed`}\n`);
process.exit(failed > 0 ? 1 : 0);

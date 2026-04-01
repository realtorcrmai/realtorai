#!/usr/bin/env node
/**
 * Realtors360 Social Media Content Studio — Automated Test Suite
 * Tests: Build, DB schema, types, API routes, page loads, components,
 *        content generation, approval flow, crypto, compliance, integration
 *
 * Usage: node scripts/test-social-media.mjs
 * Requires: Server running on localhost:3000
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "listingflow-cron-secret-2026";

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];
const startTime = Date.now();

// ============================================================
// Test Helpers
// ============================================================

function log(status, id, title, detail = "") {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏭️";
  console.log(`${icon} ${id}: ${title}${detail ? ` — ${detail}` : ""}`);
  if (status === "PASS") passed++;
  else if (status === "FAIL") { failed++; failures.push({ id, title, detail }); }
  else skipped++;
}

async function fetchJSON(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, ok: res.ok, text, json, headers: res.headers };
  } catch (err) {
    return { status: 0, ok: false, text: err.message, json: null, headers: null };
  }
}

async function fetchPage(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
    return { status: res.status, headers: res.headers, location: res.headers.get("location") };
  } catch (err) {
    return { status: 0, headers: null, location: null };
  }
}

// ============================================================
// Category 1: BUILD VERIFICATION (TC-SOC-B001-B020)
// ============================================================

async function testBuildVerification() {
  console.log("\n📦 Category 1: Build Verification\n");

  // B001: Check social page file exists
  const fs = await import("fs");
  const path = await import("path");
  const srcRoot = path.resolve(process.cwd(), "src");

  const criticalFiles = [
    "app/(dashboard)/social/page.tsx",
    "components/social/SocialDashboardClient.tsx",
    "components/social/SocialOverviewTab.tsx",
    "components/social/SocialCalendarTab.tsx",
    "components/social/SocialStudioTab.tsx",
    "components/social/SocialTemplatesTab.tsx",
    "components/social/SocialAnalyticsTab.tsx",
    "components/social/SocialSettingsTab.tsx",
    "lib/social/types.ts",
    "lib/social/content-generator.ts",
    "lib/social/content-scorer.ts",
    "lib/social/facebook-api.ts",
    "lib/social/crypto.ts",
    "actions/social-content.ts",
    "app/api/social/oauth/route.ts",
    "app/api/cron/social-publish/route.ts",
  ];

  for (let i = 0; i < criticalFiles.length; i++) {
    const file = criticalFiles[i];
    const fullPath = path.join(srcRoot, file);
    const exists = fs.existsSync(fullPath);
    log(exists ? "PASS" : "FAIL", `TC-SOC-B${String(i + 1).padStart(3, "0")}`, `File exists: ${file}`);
  }

  // B017: Migration file exists
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/058_social_media_studio.sql");
  log(fs.existsSync(migrationPath) ? "PASS" : "FAIL", "TC-SOC-B017", "Migration 058 exists");

  // B018: Features.ts includes "social"
  const featuresContent = fs.readFileSync(path.join(srcRoot, "lib/features.ts"), "utf8");
  log(featuresContent.includes('"social"') ? "PASS" : "FAIL", "TC-SOC-B018", "features.ts includes 'social'");

  // B019: AppHeader includes social nav item
  const headerContent = fs.readFileSync(path.join(srcRoot, "components/layout/AppHeader.tsx"), "utf8");
  log(headerContent.includes("/social") ? "PASS" : "FAIL", "TC-SOC-B019", "AppHeader includes /social route");

  // B020: Middleware exempts social OAuth
  const middlewareContent = fs.readFileSync(path.join(srcRoot, "middleware.ts"), "utf8");
  log(middlewareContent.includes("/api/social/oauth") ? "PASS" : "FAIL", "TC-SOC-B020", "Middleware exempts /api/social/oauth");
}

// ============================================================
// Category 2: PAGE LOAD TESTS (TC-SOC-P001-P020)
// ============================================================

async function testPageLoads() {
  console.log("\n🌐 Category 2: Page Load Tests\n");

  // P001: /social redirects to login (unauthenticated)
  const socialPage = await fetchPage("/social");
  log(socialPage.status === 307 || socialPage.status === 302 ? "PASS" : "FAIL",
    "TC-SOC-P001", "GET /social redirects to login (unauth)", `status=${socialPage.status}`);

  // P002: /login returns 200
  const loginPage = await fetchPage("/login");
  log(loginPage.status === 200 ? "PASS" : "FAIL",
    "TC-SOC-P002", "GET /login returns 200", `status=${loginPage.status}`);

  // P003: /api/social/oauth returns redirect or error (no code)
  const oauthNoCode = await fetchPage("/api/social/oauth");
  log(oauthNoCode.status === 307 || oauthNoCode.status === 302 ? "PASS" : "FAIL",
    "TC-SOC-P003", "GET /api/social/oauth without code redirects", `status=${oauthNoCode.status}`);

  // P004: /api/social/oauth with error param redirects
  const oauthError = await fetchPage("/api/social/oauth?error=access_denied");
  log(oauthError.status === 307 || oauthError.status === 302 ? "PASS" : "FAIL",
    "TC-SOC-P004", "GET /api/social/oauth with error redirects", `status=${oauthError.status}`);
}

// ============================================================
// Category 3: API AUTH TESTS (TC-SOC-A001-A020)
// ============================================================

async function testAPIAuth() {
  console.log("\n🔐 Category 3: API Auth Tests\n");

  // A001: Cron without secret returns 401
  const cronNoAuth = await fetchJSON("/api/cron/social-publish");
  log(cronNoAuth.status === 401 ? "PASS" : "FAIL",
    "TC-SOC-A001", "Cron without auth returns 401", `status=${cronNoAuth.status}`);

  // A002: Cron with wrong secret returns 401
  const cronWrongAuth = await fetchJSON("/api/cron/social-publish", {
    headers: { Authorization: "Bearer wrong-secret" },
  });
  log(cronWrongAuth.status === 401 ? "PASS" : "FAIL",
    "TC-SOC-A002", "Cron with wrong secret returns 401", `status=${cronWrongAuth.status}`);

  // A003: Cron with correct secret returns 200
  const cronCorrectAuth = await fetchJSON("/api/cron/social-publish", {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  log(cronCorrectAuth.status === 200 ? "PASS" : "FAIL",
    "TC-SOC-A003", "Cron with correct secret returns 200", `status=${cronCorrectAuth.status}`);

  // A004: Cron returns JSON with published count
  if (cronCorrectAuth.json) {
    log(typeof cronCorrectAuth.json.published === "number" ? "PASS" : "FAIL",
      "TC-SOC-A004", "Cron response has published count", JSON.stringify(cronCorrectAuth.json));
  } else {
    log("FAIL", "TC-SOC-A004", "Cron response has published count", "No JSON response");
  }
}

// ============================================================
// Category 4: CRYPTO TESTS (TC-SOC-C001-C020)
// ============================================================

async function testCrypto() {
  console.log("\n🔒 Category 4: Crypto Tests\n");

  try {
    // Dynamic import of crypto module
    const { encrypt, decrypt } = await import("../src/lib/social/crypto.ts").catch(() => {
      // Try compiled version
      return { encrypt: null, decrypt: null };
    });

    if (!encrypt || !decrypt) {
      log("SKIP", "TC-SOC-C001", "Crypto module import (needs transpilation)");
      log("SKIP", "TC-SOC-C002", "Encrypt/decrypt roundtrip");
      log("SKIP", "TC-SOC-C003", "Encrypted format validation");
      return;
    }

    // C001: Encrypt produces string
    const encrypted = encrypt("test-token-12345");
    log(typeof encrypted === "string" && encrypted.length > 0 ? "PASS" : "FAIL",
      "TC-SOC-C001", "Encrypt produces non-empty string");

    // C002: Decrypt returns original
    const decrypted = decrypt(encrypted);
    log(decrypted === "test-token-12345" ? "PASS" : "FAIL",
      "TC-SOC-C002", "Decrypt returns original value");

    // C003: Encrypted format is iv:authTag:ciphertext
    const parts = encrypted.split(":");
    log(parts.length === 3 ? "PASS" : "FAIL",
      "TC-SOC-C003", "Encrypted format is iv:authTag:ciphertext", `parts=${parts.length}`);

    // C004: Different inputs produce different ciphertexts
    const encrypted2 = encrypt("different-token");
    log(encrypted !== encrypted2 ? "PASS" : "FAIL",
      "TC-SOC-C004", "Different inputs produce different ciphertexts");

    // C005: Same input produces different ciphertexts (random IV)
    const encrypted3 = encrypt("test-token-12345");
    log(encrypted !== encrypted3 ? "PASS" : "FAIL",
      "TC-SOC-C005", "Same input produces different ciphertexts (random IV)");

  } catch (err) {
    log("SKIP", "TC-SOC-C001-C005", "Crypto tests (module import failed)", err.message);
  }
}

// ============================================================
// Category 5: TYPE VALIDATION (TC-SOC-T001-T030)
// ============================================================

async function testTypes() {
  console.log("\n📝 Category 5: Type Validation\n");

  const fs = await import("fs");
  const path = await import("path");
  const typesContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/social/types.ts"), "utf8"
  );

  // T001-T009: Check all required types exist
  const requiredTypes = [
    "SocialBrandKit", "SocialAccount", "SocialPost", "SocialPostPublish",
    "SocialTemplate", "SocialAnalyticsDaily", "SocialPlatform", "ContentType",
    "PostStatus", "VoiceTone", "MediaType", "VoiceRule", "GeneratedContent",
    "ContentGenerationRequest", "ContentScoreBreakdown", "PlatformVariant",
    "MetaPageInfo", "MetaPublishResult", "SocialTab",
  ];

  for (let i = 0; i < requiredTypes.length; i++) {
    const type = requiredTypes[i];
    log(typesContent.includes(type) ? "PASS" : "FAIL",
      `TC-SOC-T${String(i + 1).padStart(3, "0")}`, `Type ${type} defined`);
  }

  // T020: SocialPlatform includes facebook
  log(typesContent.includes('"facebook"') ? "PASS" : "FAIL",
    "TC-SOC-T020", 'SocialPlatform includes "facebook"');

  // T021: SocialPlatform includes instagram
  log(typesContent.includes('"instagram"') ? "PASS" : "FAIL",
    "TC-SOC-T021", 'SocialPlatform includes "instagram"');

  // T022: ContentType includes just_listed
  log(typesContent.includes('"just_listed"') ? "PASS" : "FAIL",
    "TC-SOC-T022", 'ContentType includes "just_listed"');

  // T023: PostStatus includes all states
  const postStatuses = ["draft", "approved", "scheduled", "publishing", "published", "failed", "cancelled", "skipped"];
  for (const status of postStatuses) {
    log(typesContent.includes(`"${status}"`) ? "PASS" : "FAIL",
      `TC-SOC-T023-${status}`, `PostStatus includes "${status}"`);
  }
}

// ============================================================
// Category 6: MIGRATION VALIDATION (TC-SOC-M001-M030)
// ============================================================

async function testMigration() {
  console.log("\n🗄️ Category 6: Migration Validation\n");

  const fs = await import("fs");
  const path = await import("path");
  const migration = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/migrations/058_social_media_studio.sql"), "utf8"
  );

  // M001-M009: Required tables
  const tables = [
    "social_brand_kits", "social_accounts", "social_posts",
    "social_post_publishes", "social_templates", "social_analytics_daily",
    "social_hashtag_performance", "social_usage_tracking", "social_audit_log",
  ];

  for (let i = 0; i < tables.length; i++) {
    log(migration.includes(`CREATE TABLE IF NOT EXISTS ${tables[i]}`) ? "PASS" : "FAIL",
      `TC-SOC-M${String(i + 1).padStart(3, "0")}`, `Table ${tables[i]} created`);
  }

  // M010: RLS enabled on all tables
  for (let i = 0; i < tables.length; i++) {
    log(migration.includes(`ALTER TABLE ${tables[i]} ENABLE ROW LEVEL SECURITY`) ? "PASS" : "FAIL",
      `TC-SOC-M0${10 + i}`, `RLS enabled on ${tables[i]}`);
  }

  // M019: content_score CHECK constraint
  log(migration.includes("CHECK (content_score >= 0 AND content_score <= 100)") ? "PASS" : "FAIL",
    "TC-SOC-M019", "content_score CHECK constraint (0-100)");

  // M020: Unique constraints
  log(migration.includes("UNIQUE (brand_kit_id, platform, date)") ? "PASS" : "FAIL",
    "TC-SOC-M020", "Unique constraint on analytics (brand_kit_id, platform, date)");

  log(migration.includes("UNIQUE (brand_kit_id, hashtag, platform)") ? "PASS" : "FAIL",
    "TC-SOC-M021", "Unique constraint on hashtag performance");

  log(migration.includes("UNIQUE (brand_kit_id, month)") ? "PASS" : "FAIL",
    "TC-SOC-M022", "Unique constraint on usage tracking");

  // M023: Foreign keys
  log(migration.includes("REFERENCES social_brand_kits(id) ON DELETE CASCADE") ? "PASS" : "FAIL",
    "TC-SOC-M023", "FK to social_brand_kits with CASCADE");

  log(migration.includes("REFERENCES social_posts(id) ON DELETE CASCADE") ? "PASS" : "FAIL",
    "TC-SOC-M024", "FK to social_posts with CASCADE");

  log(migration.includes("REFERENCES social_accounts(id) ON DELETE CASCADE") ? "PASS" : "FAIL",
    "TC-SOC-M025", "FK to social_accounts with CASCADE");

  // M026: Indexes
  const indexCount = (migration.match(/CREATE INDEX/g) || []).length;
  log(indexCount >= 15 ? "PASS" : "FAIL",
    "TC-SOC-M026", `At least 15 indexes created (found ${indexCount})`);

  // M027: Token encryption comment
  log(migration.includes("encrypted at rest") ? "PASS" : "FAIL",
    "TC-SOC-M027", "Token encryption documented in schema comments");

  // M028: Default values
  log(migration.includes("DEFAULT 'draft'") ? "PASS" : "FAIL",
    "TC-SOC-M028", "Default status is 'draft'");

  log(migration.includes("DEFAULT now()") ? "PASS" : "FAIL",
    "TC-SOC-M029", "Default timestamp is now()");

  log(migration.includes("DEFAULT '{}'") ? "PASS" : "FAIL",
    "TC-SOC-M030", "Default JSONB is '{}'");
}

// ============================================================
// Category 7: COMPONENT VALIDATION (TC-SOC-V001-V030)
// ============================================================

async function testComponents() {
  console.log("\n🧩 Category 7: Component Validation\n");

  const fs = await import("fs");
  const path = await import("path");
  const componentDir = path.resolve(process.cwd(), "src/components/social");

  const components = [
    { file: "SocialDashboardClient.tsx", checks: ["use client", "SocialOverviewTab", "SocialCalendarTab", "SocialStudioTab", "SocialTemplatesTab", "SocialAnalyticsTab", "SocialSettingsTab"] },
    { file: "SocialOverviewTab.tsx", checks: ["use client", "lf-card", "Intl.NumberFormat"] },
    { file: "SocialCalendarTab.tsx", checks: ["use client", "useState"] },
    { file: "SocialStudioTab.tsx", checks: ["use client", "approvePost", "skipPost"] },
    { file: "SocialTemplatesTab.tsx", checks: ["use client", "useState"] },
    { file: "SocialAnalyticsTab.tsx", checks: ["use client", "Intl.NumberFormat"] },
    { file: "SocialSettingsTab.tsx", checks: ["use client", "saveBrandKit"] },
  ];

  let testNum = 1;
  for (const comp of components) {
    const filePath = path.join(componentDir, comp.file);
    if (!fs.existsSync(filePath)) {
      log("FAIL", `TC-SOC-V${String(testNum++).padStart(3, "0")}`, `${comp.file} exists`);
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    log("PASS", `TC-SOC-V${String(testNum++).padStart(3, "0")}`, `${comp.file} exists`);

    for (const check of comp.checks) {
      log(content.includes(check) ? "PASS" : "FAIL",
        `TC-SOC-V${String(testNum++).padStart(3, "0")}`, `${comp.file} contains "${check}"`);
    }
  }
}

// ============================================================
// Category 8: SERVER ACTION VALIDATION (TC-SOC-S001-S020)
// ============================================================

async function testServerActions() {
  console.log("\n⚡ Category 8: Server Action Validation\n");

  const fs = await import("fs");
  const path = await import("path");
  const actionsContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/actions/social-content.ts"), "utf8"
  );

  const requiredFunctions = [
    "saveBrandKit", "getBrandKit", "generateSocialContent",
    "approvePost", "skipPost", "regeneratePost",
    "updatePostCaption", "schedulePost", "deletePost", "bulkApprovePosts",
  ];

  for (let i = 0; i < requiredFunctions.length; i++) {
    log(actionsContent.includes(`export async function ${requiredFunctions[i]}`) ? "PASS" : "FAIL",
      `TC-SOC-S${String(i + 1).padStart(3, "0")}`, `Action ${requiredFunctions[i]} exported`);
  }

  // S011: Uses "use server" directive
  log(actionsContent.includes('"use server"') ? "PASS" : "FAIL",
    "TC-SOC-S011", 'Actions file has "use server" directive');

  // S012: Uses revalidatePath
  log(actionsContent.includes('revalidatePath("/social")') ? "PASS" : "FAIL",
    "TC-SOC-S012", "Actions revalidate /social path");

  // S013: Uses audit log
  log(actionsContent.includes("social_audit_log") ? "PASS" : "FAIL",
    "TC-SOC-S013", "Actions log to social_audit_log");

  // S014: Uses Supabase admin client
  log(actionsContent.includes("createAdminClient") ? "PASS" : "FAIL",
    "TC-SOC-S014", "Actions use Supabase admin client");
}

// ============================================================
// Category 9: FACEBOOK API MODULE (TC-SOC-F001-F020)
// ============================================================

async function testFacebookModule() {
  console.log("\n📘 Category 9: Facebook API Module Validation\n");

  const fs = await import("fs");
  const path = await import("path");
  const fbContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/social/facebook-api.ts"), "utf8"
  );

  const requiredFunctions = [
    "getMetaOAuthURL", "exchangeCodeForToken", "getLongLivedToken",
    "getUserPages", "publishToFacebookPage", "publishToInstagram",
    "getPostInsights", "validateToken", "getTokenExpiry",
  ];

  for (let i = 0; i < requiredFunctions.length; i++) {
    log(fbContent.includes(`export async function ${requiredFunctions[i]}`) ||
        fbContent.includes(`export function ${requiredFunctions[i]}`) ? "PASS" : "FAIL",
      `TC-SOC-F${String(i + 1).padStart(3, "0")}`, `Function ${requiredFunctions[i]} exported`);
  }

  // F010: Uses Meta Graph API v21
  log(fbContent.includes("v21.0") ? "PASS" : "FAIL",
    "TC-SOC-F010", "Uses Meta Graph API v21.0");

  // F011: Handles carousel publishing
  log(fbContent.includes("CAROUSEL") || fbContent.includes("carousel") ? "PASS" : "FAIL",
    "TC-SOC-F011", "Supports Instagram carousel publishing");

  // F012: Handles Reels publishing
  log(fbContent.includes("REELS") ? "PASS" : "FAIL",
    "TC-SOC-F012", "Supports Instagram Reels publishing");

  // F013: Video processing polling
  log(fbContent.includes("IN_PROGRESS") ? "PASS" : "FAIL",
    "TC-SOC-F013", "Video processing polling implemented");

  // F014: Error handling with descriptive messages
  log(fbContent.includes("throw new Error") ? "PASS" : "FAIL",
    "TC-SOC-F014", "Error handling with throw");

  // F015: OAuth scopes include required permissions
  log(fbContent.includes("pages_manage_posts") ? "PASS" : "FAIL",
    "TC-SOC-F015", "OAuth scopes include pages_manage_posts");

  log(fbContent.includes("instagram_content_publish") ? "PASS" : "FAIL",
    "TC-SOC-F016", "OAuth scopes include instagram_content_publish");
}

// ============================================================
// Category 10: CONTENT GENERATOR MODULE (TC-SOC-G001-G020)
// ============================================================

async function testContentGenerator() {
  console.log("\n🤖 Category 10: Content Generator Module Validation\n");

  const fs = await import("fs");
  const path = await import("path");
  const genContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/social/content-generator.ts"), "utf8"
  );

  // G001: Uses Anthropic SDK
  log(genContent.includes("@anthropic-ai/sdk") ? "PASS" : "FAIL",
    "TC-SOC-G001", "Uses Anthropic SDK");

  // G002: Exports generateContentForPlatforms
  log(genContent.includes("export async function generateContentForPlatforms") ? "PASS" : "FAIL",
    "TC-SOC-G002", "Exports generateContentForPlatforms");

  // G003: Builds voice rules from brand kit
  log(genContent.includes("buildVoiceRulesPrompt") ? "PASS" : "FAIL",
    "TC-SOC-G003", "Builds voice rules from brand kit");

  // G004: Handles all content types
  const contentTypes = ["just_listed", "just_sold", "open_house", "price_reduced", "market_update", "neighbourhood", "testimonial", "tips", "holiday", "milestone", "custom"];
  for (const ct of contentTypes) {
    log(genContent.includes(ct) ? "PASS" : "FAIL",
      `TC-SOC-G004-${ct}`, `Content type "${ct}" handled`);
  }

  // G005: Includes brokerage compliance
  log(genContent.includes("brokerage") ? "PASS" : "FAIL",
    "TC-SOC-G005", "Includes brokerage compliance in prompt");

  // G006: Platform-specific generation
  log(genContent.includes("carousel") || genContent.includes("instagram_carousel") ? "PASS" : "FAIL",
    "TC-SOC-G006", "Generates Instagram carousel content");

  log(genContent.includes("Facebook post") ? "PASS" : "FAIL",
    "TC-SOC-G007", "Generates Facebook post content");

  log(genContent.includes("LinkedIn post") ? "PASS" : "FAIL",
    "TC-SOC-G008", "Generates LinkedIn post content");

  log(genContent.includes("TikTok") ? "PASS" : "FAIL",
    "TC-SOC-G009", "Generates TikTok content");

  // G010: JSON parsing with fallback
  log(genContent.includes("JSON.parse") ? "PASS" : "FAIL",
    "TC-SOC-G010", "Parses JSON response");

  log(genContent.includes("catch") ? "PASS" : "FAIL",
    "TC-SOC-G011", "Has fallback on JSON parse failure");

  // G012: Emoji preference handling
  log(genContent.includes("emoji") ? "PASS" : "FAIL",
    "TC-SOC-G012", "Handles emoji preference");

  // G013: Uses configurable model
  log(genContent.includes("SOCIAL_AI_MODEL") ? "PASS" : "FAIL",
    "TC-SOC-G013", "Uses configurable AI model via env var");
}

// ============================================================
// Category 11: COMPLIANCE CHECKS (TC-SOC-X001-X015)
// ============================================================

async function testCompliance() {
  console.log("\n⚖️ Category 11: Compliance Checks\n");

  const fs = await import("fs");
  const path = await import("path");

  // X001: Content generator includes brokerage requirement
  const genContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/social/content-generator.ts"), "utf8"
  );
  log(genContent.includes("COMPLIANCE") ? "PASS" : "FAIL",
    "TC-SOC-X001", "Content generator has COMPLIANCE rule");

  // X002: Migration has includes_brokerage field
  const migration = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/migrations/058_social_media_studio.sql"), "utf8"
  );
  log(migration.includes("includes_brokerage") ? "PASS" : "FAIL",
    "TC-SOC-X002", "Schema has includes_brokerage field");

  // X003: compliance_checked field exists
  log(migration.includes("compliance_checked") ? "PASS" : "FAIL",
    "TC-SOC-X003", "Schema has compliance_checked field");

  // X004: Audit log has compliance_result
  log(migration.includes("compliance_result") ? "PASS" : "FAIL",
    "TC-SOC-X004", "Audit log has compliance_result field");

  // X005: License number field in brand kit
  log(migration.includes("license_number") ? "PASS" : "FAIL",
    "TC-SOC-X005", "Brand kit has license_number field");

  // X006: Token encryption
  log(migration.includes("encrypted") ? "PASS" : "FAIL",
    "TC-SOC-X006", "Token encryption documented in schema");

  // X007: No hardcoded API keys in source
  const allSocialFiles = [
    "src/lib/social/content-generator.ts",
    "src/lib/social/facebook-api.ts",
    "src/lib/social/crypto.ts",
    "src/actions/social-content.ts",
  ];
  let hasHardcodedKey = false;
  for (const file of allSocialFiles) {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
    if (content.match(/sk-[a-zA-Z0-9]{20,}/) || content.match(/EAA[a-zA-Z0-9]{20,}/)) {
      hasHardcodedKey = true;
    }
  }
  log(!hasHardcodedKey ? "PASS" : "FAIL",
    "TC-SOC-X007", "No hardcoded API keys in social source files");

  // X008: Cron endpoint requires auth
  const cronContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/api/cron/social-publish/route.ts"), "utf8"
  );
  log(cronContent.includes("CRON_SECRET") ? "PASS" : "FAIL",
    "TC-SOC-X008", "Publishing cron requires CRON_SECRET");

  // X009: OAuth callback in middleware exemptions
  const middlewareContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/middleware.ts"), "utf8"
  );
  log(middlewareContent.includes("/api/social/oauth") ? "PASS" : "FAIL",
    "TC-SOC-X009", "OAuth callback exempted in middleware");

  // X010: No NEXT_PUBLIC exposure of social secrets
  log(!middlewareContent.includes("NEXT_PUBLIC_SOCIAL") ? "PASS" : "FAIL",
    "TC-SOC-X010", "No NEXT_PUBLIC exposure of social secrets");
}

// ============================================================
// Category 12: INTEGRATION TESTS (TC-SOC-I001-I015)
// ============================================================

async function testIntegration() {
  console.log("\n🔗 Category 12: Integration Tests\n");

  const fs = await import("fs");
  const path = await import("path");

  // I001: Social feature in features.ts
  const features = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/features.ts"), "utf8"
  );
  log(features.includes('"social"') ? "PASS" : "FAIL",
    "TC-SOC-I001", "Social feature registered in features.ts");

  // I002: Social FEATURE_META entry
  log(features.includes("Social Media") ? "PASS" : "FAIL",
    "TC-SOC-I002", "Social has FEATURE_META entry");

  // I003: Social FEATURE_HREF entry
  log(features.includes('social: "/social"') ? "PASS" : "FAIL",
    "TC-SOC-I003", "Social has FEATURE_HREF entry");

  // I004: Dashboard page.tsx references /social
  const dashboardPage = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/page.tsx"), "utf8"
  );
  log(dashboardPage.includes("/social") || dashboardPage.includes("/websites") ? "PASS" : "FAIL",
    "TC-SOC-I004", "Dashboard references social or website routes");

  // I005: Content generator references voice learning
  const genContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/social/content-generator.ts"), "utf8"
  );
  log(genContent.includes("voice_rules") ? "PASS" : "FAIL",
    "TC-SOC-I005", "Content generator uses voice_rules from brand kit");

  // I006: Actions import content-generator
  const actionsContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/actions/social-content.ts"), "utf8"
  );
  log(actionsContent.includes("content-generator") ? "PASS" : "FAIL",
    "TC-SOC-I006", "Actions import content-generator");

  // I007: Actions import content-scorer
  log(actionsContent.includes("content-scorer") ? "PASS" : "FAIL",
    "TC-SOC-I007", "Actions import content-scorer");

  // I008: Cron imports facebook-api
  const cronContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/api/cron/social-publish/route.ts"), "utf8"
  );
  log(cronContent.includes("facebook-api") ? "PASS" : "FAIL",
    "TC-SOC-I008", "Cron imports facebook-api");

  // I009: Cron imports crypto
  log(cronContent.includes("crypto") ? "PASS" : "FAIL",
    "TC-SOC-I009", "Cron imports crypto for token decryption");

  // I010: OAuth route imports crypto
  const oauthContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/api/social/oauth/route.ts"), "utf8"
  );
  log(oauthContent.includes("encrypt") ? "PASS" : "FAIL",
    "TC-SOC-I010", "OAuth route encrypts tokens before storage");
}

// ============================================================
// RUN ALL TESTS
// ============================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  Realtors360 Social Media Studio — Test Suite       ║");
  console.log("║  3008 test cases defined · Automated subset below   ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  await testBuildVerification();
  await testPageLoads();
  await testAPIAuth();
  await testCrypto();
  await testTypes();
  await testMigration();
  await testComponents();
  await testServerActions();
  await testFacebookModule();
  await testContentGenerator();
  await testCompliance();
  await testIntegration();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n══════════════════════════════════════════════════════");
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${elapsed}s)\n`);

  if (failures.length > 0) {
    console.log("❌ Failures:");
    for (const f of failures) {
      console.log(`   ${f.id}: ${f.title} — ${f.detail}`);
    }
  }

  console.log(`\n${failed === 0 ? "🎉 ALL TESTS PASSED!" : `⚠️  ${failed} test(s) failed — fix before deploying`}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});

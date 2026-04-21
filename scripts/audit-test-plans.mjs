#!/usr/bin/env node
/**
 * Realtors360 — Test Plan Freshness Auditor
 *
 * 7 checks:
 *   A. API endpoints without test cases
 *   B. Pages without UI test cases
 *   C. Server actions without test coverage
 *   D. Email templates without send tests
 *   E. Components without a11y tests
 *   F. Test plan freshness (last-verified date)
 *   G. Test count accuracy (claimed vs actual)
 *
 * Usage: node scripts/audit-test-plans.mjs
 * Exit: 0 = all in sync, 1 = issues found
 */

import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { resolve, basename, relative } from "path";
import { execSync } from "child_process";

const ROOT = resolve(import.meta.dirname, "..");
const read = (p) => {
  try { return readFileSync(resolve(ROOT, p), "utf8"); } catch { return ""; }
};
const exists = (p) => existsSync(resolve(ROOT, p));

let issues = 0;
const warnings = [];

function warn(check, msg) {
  issues++;
  warnings.push({ check, msg });
  console.log(`  ⚠ ${msg}`);
}
function ok(msg) { console.log(`  ✓ ${msg}`); }

// ── Scan helpers ──────────────────────────────────────────

function globDir(dir, pattern) {
  const results = [];
  const fullDir = resolve(ROOT, dir);
  if (!exists(dir)) return results;
  try {
    const out = execSync(
      `find "${fullDir}" -name "${pattern}" -type f 2>/dev/null`,
      { encoding: "utf8", timeout: 10000 }
    ).trim();
    if (out) results.push(...out.split("\n").map(f => relative(ROOT, f)));
  } catch { /* empty */ }
  return results;
}

function extractExports(filePath) {
  const content = read(filePath);
  const exports = [];
  const re = /export\s+(?:async\s+)?function\s+(\w+)/g;
  let m;
  while ((m = re.exec(content))) exports.push(m[1]);
  return exports;
}

// ── Load test plan docs ───────────────────────────────────

const TEST_PLANS = [
  "docs/TEST_PLAN_1000.md",
  "docs/TEST_PLAN_UI_UX_Features.md",
  "docs/TEST_PLAN_SOCIAL_3000.md",
  "docs/TEST_PLAN_Workflow_Trigger_Engine.md",
  "docs/TESTPLAN_Browser_UX.md",
  "docs/TEST_NEWSLETTER_INTEGRATION.md",
  "docs/TESTING_STRATEGY.md",
  "docs/TEST_PLAN_Listing_Property_Details.md",
].filter(p => exists(p));

const planContents = {};
for (const p of TEST_PLANS) {
  planContents[p] = read(p).toLowerCase();
}

function mentionedInPlan(planPath, term) {
  const content = planContents[planPath] || "";
  const normalized = term.toLowerCase().replace(/[-_]/g, "[-_ ]?");
  try {
    return new RegExp(normalized).test(content);
  } catch {
    return content.includes(term.toLowerCase());
  }
}

function mentionedInAnyPlan(term) {
  return TEST_PLANS.some(p => mentionedInPlan(p, term));
}

// ── Parse metadata tags from docs ─────────────────────────

function parseMetadata(planPath) {
  const content = read(planPath);
  const meta = {};

  // <!-- last-verified: YYYY-MM-DD -->
  const lvMatch = content.match(/<!--\s*last-verified:\s*(\d{4}-\d{2}-\d{2})\s*-->/);
  if (lvMatch) meta.lastVerified = lvMatch[1];

  // <!-- test-count: N -->
  const tcMatch = content.match(/<!--\s*test-count:\s*(\d+)\s*-->/);
  if (tcMatch) meta.claimedCount = parseInt(tcMatch[1]);

  // Count actual test items: ### XXXX-NNN lines, or `- [ ]` checkboxes, or table rows with test IDs
  const lines = content.split("\n");
  let actualCount = 0;
  for (const line of lines) {
    // H3 test case headers: ### AUTH-001: ...
    if (/^###\s+[A-Z]+-\d{2,4}/.test(line)) actualCount++;
    // Checkbox items: - [ ] or - [x]
    if (/^\s*-\s*\[[ x]\]/.test(line)) actualCount++;
    // Numbered test in tables: | 1. or | TEST-
    if (/^\|\s*\d+\.\s/.test(line) || /^\|\s*[A-Z]+-\d{2,4}/.test(line)) actualCount++;
  }
  meta.actualCount = actualCount;

  return meta;
}

// ═══════════════════════════════════════════════════════════
// CHECK A: API endpoints without test cases
// ═══════════════════════════════════════════════════════════
console.log("\n=== Test Plan Freshness Audit ===\n");
console.log("1. API endpoint coverage");

const apiRoutes = globDir("src/app/api", "route.ts");
const SKIP_API = new Set(["src/app/api/auth", "src/app/api/health", "src/app/api/test"]);
const testableRoutes = apiRoutes.filter(r => {
  return !Array.from(SKIP_API).some(skip => r.startsWith(skip));
});

const tp1 = "docs/TEST_PLAN_1000.md";
let apiTested = 0;
let apiTotal = 0;
for (const route of testableRoutes) {
  apiTotal++;
  // Extract the API path from file path: src/app/api/contacts/route.ts → /api/contacts
  const apiPath = "/" + route
    .replace("src/app/", "")
    .replace("/route.ts", "")
    .replace(/\[([^\]]+)\]/g, ":$1");

  const shortName = apiPath.replace("/api/", "");
  if (mentionedInAnyPlan(shortName) || mentionedInAnyPlan(apiPath)) {
    apiTested++;
  } else {
    warn("api", `${apiPath} (${route}) — no test case in any test plan`);
  }
}
ok(`${apiTested}/${apiTotal} API endpoints have test cases`);

// ═══════════════════════════════════════════════════════════
// CHECK B: Pages without UI test cases
// ═══════════════════════════════════════════════════════════
console.log("\n2. Page route coverage");

const pageFiles = globDir("src/app/(dashboard)", "page.tsx");
const SKIP_PAGES = new Set(["loading.tsx", "error.tsx", "not-found.tsx"]);
const testablePages = pageFiles.filter(p => !SKIP_PAGES.has(basename(p)));

const uiPlan = "docs/TEST_PLAN_UI_UX_Features.md";
const browserPlan = "docs/TESTPLAN_Browser_UX.md";
let pageTested = 0;
let pageTotal = 0;
for (const page of testablePages) {
  pageTotal++;
  // Extract route: src/app/(dashboard)/contacts/page.tsx → /contacts
  const route = "/" + page
    .replace("src/app/(dashboard)/", "")
    .replace("/page.tsx", "")
    .replace(/\[([^\]]+)\]/g, ":$1");

  const routeName = route === "/" ? "dashboard" : route.replace(/^\//, "").split("/")[0];
  if (mentionedInAnyPlan(routeName)) {
    pageTested++;
  } else {
    warn("page", `${route} (${page}) — no test case in UI test plans`);
  }
}
ok(`${pageTested}/${pageTotal} dashboard pages have test cases`);

// ═══════════════════════════════════════════════════════════
// CHECK C: Server actions without test coverage
// ═══════════════════════════════════════════════════════════
console.log("\n3. Server action coverage");

const actionFiles = globDir("src/actions", "*.ts");
const SKIP_ACTIONS = new Set(["types.ts", "index.ts"]);
let actionTested = 0;
let actionTotal = 0;
for (const af of actionFiles) {
  const name = basename(af, ".ts");
  if (SKIP_ACTIONS.has(basename(af))) continue;
  actionTotal++;
  if (mentionedInAnyPlan(name)) {
    actionTested++;
  } else {
    warn("action", `${af} — no test cases in any test plan`);
  }
}
ok(`${actionTested}/${actionTotal} action files have test cases`);

// ═══════════════════════════════════════════════════════════
// CHECK D: Email templates without send tests
// ═══════════════════════════════════════════════════════════
console.log("\n4. Email template coverage");

const emailFiles = globDir("src/emails", "*.tsx");
const SKIP_EMAILS = new Set(["index.tsx", "BaseLayout.tsx"]);
const nlPlan = "docs/TEST_NEWSLETTER_INTEGRATION.md";
let emailTested = 0;
let emailTotal = 0;
for (const ef of emailFiles) {
  const name = basename(ef, ".tsx");
  if (SKIP_EMAILS.has(basename(ef)) || name.startsWith("blocks")) continue;
  emailTotal++;
  if (mentionedInPlan(nlPlan, name) || mentionedInAnyPlan(name)) {
    emailTested++;
  } else {
    warn("email", `${name}.tsx — no test case in TEST_NEWSLETTER_INTEGRATION.md`);
  }
}
ok(`${emailTested}/${emailTotal} email templates have test cases`);

// ═══════════════════════════════════════════════════════════
// CHECK E: Components without a11y tests
// ═══════════════════════════════════════════════════════════
console.log("\n5. Component a11y coverage");

const componentDirs = [];
const compRoot = resolve(ROOT, "src/components");
if (exists("src/components")) {
  for (const entry of readdirSync(compRoot)) {
    const full = resolve(compRoot, entry);
    if (statSync(full).isDirectory() && entry !== "ui" && entry !== "brand") {
      componentDirs.push(entry);
    }
  }
}

let compTested = 0;
for (const dir of componentDirs) {
  if (mentionedInAnyPlan(dir)) {
    compTested++;
  } else {
    warn("component", `src/components/${dir}/ — no a11y test cases in UI test plans`);
  }
}
ok(`${compTested}/${componentDirs.length} component directories documented`);

// ═══════════════════════════════════════════════════════════
// CHECK F: Test plan freshness (last-verified date)
// ═══════════════════════════════════════════════════════════
console.log("\n6. Test plan freshness");

const MAX_AGE_DAYS = 14;
const now = Date.now();
let freshnessOk = 0;
for (const plan of TEST_PLANS) {
  const meta = parseMetadata(plan);
  if (meta.lastVerified) {
    const verifiedDate = new Date(meta.lastVerified);
    const ageDays = Math.floor((now - verifiedDate.getTime()) / 86400000);
    if (ageDays > MAX_AGE_DAYS) {
      warn("freshness", `${basename(plan)} — last verified ${ageDays} days ago (max ${MAX_AGE_DAYS})`);
    } else {
      freshnessOk++;
    }
  } else {
    warn("freshness", `${basename(plan)} — missing <!-- last-verified: YYYY-MM-DD --> tag`);
  }
}
ok(`${freshnessOk}/${TEST_PLANS.length} test plans verified within ${MAX_AGE_DAYS} days`);

// ═══════════════════════════════════════════════════════════
// CHECK G: Test count accuracy
// ═══════════════════════════════════════════════════════════
console.log("\n7. Test count accuracy");

let countOk = 0;
for (const plan of TEST_PLANS) {
  const meta = parseMetadata(plan);
  if (meta.claimedCount && meta.actualCount) {
    const drift = Math.abs(meta.claimedCount - meta.actualCount) / meta.claimedCount;
    if (drift > 0.10) {
      warn("count", `${basename(plan)} claims ${meta.claimedCount} but has ${meta.actualCount} items (${Math.round(drift * 100)}% drift)`);
    } else {
      countOk++;
    }
  } else if (meta.claimedCount) {
    // Has claimed count but parser couldn't count items (different format)
    countOk++; // Don't flag — format may not be parseable
  } else {
    // No claimed count tag — skip (advisory)
    countOk++;
  }
}
ok(`${countOk}/${TEST_PLANS.length} test plans have accurate counts`);

// ═══════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════
console.log("\n" + "=".repeat(50));
if (issues === 0) {
  console.log("✅ All test plans are in sync with the codebase.");
} else {
  console.log(`⚠ ${issues} issue(s) found. Fix test plans before creating PR.`);
  console.log("");
  for (const w of warnings) {
    console.log(`  [${w.check}] ${w.msg}`);
  }
}
console.log("=".repeat(50));

process.exit(issues > 0 ? 1 : 0);

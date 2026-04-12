#!/usr/bin/env node
/**
 * Docs freshness auditor.
 *
 * Compares the codebase against CONTRIBUTING.md, ENVIRONMENTS.md, and
 * .env.local.example to find stale references. Run by GitHub Actions
 * weekly or manually via `node scripts/audit-docs.mjs`.
 *
 * Exit codes:
 *   0 — everything in sync
 *   1 — stale docs found (details printed to stdout)
 *
 * When run in CI with --fix, generates a patch file at /tmp/docs-audit.patch
 * that the workflow can use to open a PR.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const read = (rel) => {
  const p = resolve(ROOT, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
};

const findings = [];
const warn = (category, msg) => {
  findings.push({ category, msg });
  console.log(`  ⚠ [${category}] ${msg}`);
};

console.log("=== Docs Freshness Audit ===\n");

// ─────────────────────────────────────────────────────────────
// 1. package.json scripts vs CONTRIBUTING.md
// ─────────────────────────────────────────────────────────────
console.log("1. package.json scripts");
const pkg = JSON.parse(read("package.json"));
const contributing = read("CONTRIBUTING.md") || "";
const scriptNames = Object.keys(pkg.scripts || {});

for (const name of scriptNames) {
  // Check if the script name appears anywhere in CONTRIBUTING.md
  // Skip obvious internal scripts that don't need docs
  const skipScripts = ["start", "audit", "postinstall", "prepare"];
  if (!contributing.includes(name) && !skipScripts.includes(name)) {
    warn("scripts", `"${name}" in package.json but not mentioned in CONTRIBUTING.md`);
  }
}
if (findings.filter((f) => f.category === "scripts").length === 0) {
  console.log("  ✓ all scripts documented");
}

// ─────────────────────────────────────────────────────────────
// 2. .env.local.example vs CONTRIBUTING.md
// ─────────────────────────────────────────────────────────────
console.log("\n2. Environment variables");
const envExample = read(".env.local.example") || "";
const envVars = [...envExample.matchAll(/^([A-Z][A-Z_0-9]+)=/gm)].map((m) => m[1]);

// Check env vars by SERVICE GROUP, not individual names.
// CONTRIBUTING.md documents them by category (e.g. "Supabase", "Twilio")
// rather than listing every var. So we check for the service keyword.
const envServiceMap = {
  NEXT_PUBLIC_SUPABASE: "Supabase", SUPABASE_SERVICE: "Supabase",
  NEXTAUTH: "NextAuth", GOOGLE_CLIENT: "Google", TWILIO: "Twilio",
  ANTHROPIC: "Anthropic", RESEND: "Resend", DEMO_: "demo",
  CRON_SECRET: "cron", NEXT_PUBLIC_APP_URL: "APP_URL",
  NEXT_PUBLIC_VOICE: "voice", FORM_SERVER: "form",
};
for (const v of envVars) {
  const serviceKey = Object.keys(envServiceMap).find((k) => v.startsWith(k));
  const service = serviceKey ? envServiceMap[serviceKey] : v;
  const inDocs = contributing.includes(v) ||
    contributing.toLowerCase().includes(service.toLowerCase()) ||
    (read("docs/ENVIRONMENTS.md") || "").includes(v);
  if (!inDocs) {
    warn("env", `${v} in .env.local.example but not in CONTRIBUTING.md or ENVIRONMENTS.md`);
  }
}
if (findings.filter((f) => f.category === "env").length === 0) {
  console.log("  ✓ all env vars documented");
}

// ─────────────────────────────────────────────────────────────
// 3. Migration file count
// ─────────────────────────────────────────────────────────────
console.log("\n3. Migration files");
const migDir = resolve(ROOT, "supabase/migrations");
const migFiles = existsSync(migDir)
  ? readdirSync(migDir).filter((f) => f.endsWith(".sql"))
  : [];
const envDoc = read("docs/ENVIRONMENTS.md") || "";

// Check if ENVIRONMENTS.md mentions the migration count approximately
const migCountMatch = envDoc.match(/(\d+)\s*migration/i);
if (migCountMatch) {
  const docCount = parseInt(migCountMatch[1], 10);
  if (Math.abs(docCount - migFiles.length) > 5) {
    warn(
      "migrations",
      `ENVIRONMENTS.md says ${docCount} migrations but there are ${migFiles.length} files`
    );
  } else {
    console.log(`  ✓ migration count roughly matches (${migFiles.length} files)`);
  }
} else {
  console.log(`  ✓ ${migFiles.length} migration files (no count claim in docs to check)`);
}

// ─────────────────────────────────────────────────────────────
// 4. New directories not in project structure
// ─────────────────────────────────────────────────────────────
console.log("\n4. Project structure");
const srcDirs = readdirSync(resolve(ROOT, "src"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const dir of srcDirs) {
  if (!contributing.includes(`src/${dir}`) && !contributing.includes(dir + "/")) {
    // Only flag meaningful directories, not internal ones
    if (!["__tests__", "styles", "types", "config"].includes(dir)) {
      warn("structure", `src/${dir}/ exists but not in CONTRIBUTING.md project structure`);
    }
  }
}
if (findings.filter((f) => f.category === "structure").length === 0) {
  console.log("  ✓ all src/ directories documented");
}

// ─────────────────────────────────────────────────────────────
// 5. Service ports consistency
// ─────────────────────────────────────────────────────────────
console.log("\n5. Service ports");
const portsInDocs = [...contributing.matchAll(/(\d{4})\s*\|/g)].map((m) => m[1]);
const expectedPorts = ["3000", "8080", "8768", "8767"];
for (const port of expectedPorts) {
  if (!portsInDocs.includes(port)) {
    warn("ports", `Port ${port} expected but not in CONTRIBUTING.md service table`);
  }
}
if (findings.filter((f) => f.category === "ports").length === 0) {
  console.log("  ✓ all service ports documented");
}

// ─────────────────────────────────────────────────────────────
// 6. VS Code launch configs match services
// ─────────────────────────────────────────────────────────────
console.log("\n6. VS Code launch configs");
const launchJson = read(".vscode/launch.json");
if (launchJson) {
  const launch = JSON.parse(launchJson);
  const configNames = (launch.configurations || []).map((c) => c.name);
  console.log(`  ✓ ${configNames.length} configurations: ${configNames.join(", ")}`);
} else {
  warn("vscode", ".vscode/launch.json missing");
}

// ─────────────────────────────────────────────────────────────
// 7. Check CLAUDE.md points to CONTRIBUTING.md
// ─────────────────────────────────────────────────────────────
console.log("\n7. CLAUDE.md references");
const claudeMd = read("CLAUDE.md") || "";
if (!claudeMd.includes("CONTRIBUTING.md")) {
  warn("claude", "CLAUDE.md does not reference CONTRIBUTING.md");
}
if (!claudeMd.includes("ENVIRONMENTS.md")) {
  warn("claude", "CLAUDE.md does not reference docs/ENVIRONMENTS.md");
}
if (findings.filter((f) => f.category === "claude").length === 0) {
  console.log("  ✓ CLAUDE.md references both docs");
}

// ─────────────────────────────────────────────────────────────
// 8. Dead links in docs
// ─────────────────────────────────────────────────────────────
console.log("\n8. Dead file references in CONTRIBUTING.md");
const fileRefs = [
  ...contributing.matchAll(/`((?:src|docs|scripts|supabase|\.claude|\.vscode)\/[^\s`]+)`/g),
].map((m) => m[1]);

let deadLinks = 0;
for (const ref of fileRefs) {
  const fullPath = resolve(ROOT, ref);
  if (!existsSync(fullPath)) {
    // Check if it's a pattern (contains *)
    // Skip example/template paths (your-page, your-domain, <same_number>)
    if (!ref.includes("*") && !ref.includes("{") && !ref.includes("<") &&
        !ref.includes("your-") && !ref.includes("your_")) {
      warn("links", `${ref} referenced in CONTRIBUTING.md but does not exist`);
      deadLinks++;
    }
  }
}
if (deadLinks === 0) {
  console.log(`  ✓ all ${fileRefs.length} file references valid`);
}

// ─────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(50));
if (findings.length === 0) {
  console.log("✅ All docs are in sync with the codebase.");
  process.exit(0);
} else {
  console.log(`⚠ ${findings.length} stale doc(s) found:\n`);
  for (const f of findings) {
    console.log(`  [${f.category}] ${f.msg}`);
  }
  console.log(
    "\nFix these manually or run the docs-audit GitHub Action to auto-generate a PR."
  );
  process.exit(1);
}

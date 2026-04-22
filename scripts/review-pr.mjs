#!/usr/bin/env node
/**
 * review-pr.mjs — Automated PR code review (static analysis)
 *
 * Runs 10 checks on changed files vs origin/dev. No AI — pure grep/regex.
 * Exit 0 = pass (warnings/info only), Exit 1 = errors found.
 *
 * Usage:
 *   node scripts/review-pr.mjs          # local dev
 *   node scripts/review-pr.mjs --ci     # CI mode (used in GitHub Actions)
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { dirname, basename, join } from "path";

const isCI = process.argv.includes("--ci");

// ── Get changed files ────────────────────────────────────────────────
function getChangedFiles() {
  try {
    const base = isCI ? "origin/dev" : "origin/dev";
    const raw = execSync(`git diff --name-only ${base}...HEAD`, {
      encoding: "utf-8",
    }).trim();
    if (!raw) return [];
    return raw.split("\n").filter((f) => existsSync(f));
  } catch {
    // Fallback: diff against dev branch directly
    try {
      const raw = execSync("git diff --name-only dev...HEAD", {
        encoding: "utf-8",
      }).trim();
      if (!raw) return [];
      return raw.split("\n").filter((f) => existsSync(f));
    } catch {
      console.error("Could not determine changed files. Are you on a feature branch?");
      process.exit(0);
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────
function isProductionCode(file) {
  return (
    file.startsWith("src/") &&
    (file.endsWith(".ts") || file.endsWith(".tsx")) &&
    !file.includes(".test.") &&
    !file.includes(".spec.") &&
    !file.includes("__tests__")
  );
}

function isScript(file) {
  return file.startsWith("scripts/") || file.includes("/scripts/");
}

function isTsxFile(file) {
  return file.endsWith(".tsx") && file.startsWith("src/");
}

function isApiRoute(file) {
  return file.startsWith("src/app/api/");
}

function isCronOrWebhook(file) {
  return file.includes("/cron/") || file.includes("/webhook");
}

function isServerAction(file) {
  return file.startsWith("src/actions/") && file.endsWith(".ts");
}

function isPageFile(file) {
  return basename(file) === "page.tsx" && file.startsWith("src/");
}

function readFileSafe(file) {
  try {
    return readFileSync(file, "utf-8");
  } catch {
    return "";
  }
}

function getLineNumber(content, index) {
  return content.substring(0, index).split("\n").length;
}

// ── Findings ─────────────────────────────────────────────────────────
const findings = []; // { severity, file, line, message, check }

function addFinding(severity, file, line, message, check) {
  findings.push({ severity, file, line, message, check });
}

// ── Checks ───────────────────────────────────────────────────────────
const changedFiles = getChangedFiles();
const prodFiles = changedFiles.filter((f) => isProductionCode(f) && !isScript(f));

if (prodFiles.length === 0 && changedFiles.length === 0) {
  console.log("No changed files to review.");
  process.exit(0);
}

// 1. console.log in production code
for (const file of prodFiles) {
  const content = readFileSafe(file);
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/console\.log\s*\(/.test(line) && !/\/\/\s*eslint-disable/.test(line)) {
      addFinding("warning", file, i + 1, "console.log left in production code", 1);
    }
  }
}

// 2. `any` type usage
for (const file of prodFiles) {
  const content = readFileSafe(file);
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments and eslint-disable lines
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    // Skip lines with eslint-disable for this specific rule
    const prevLine = i > 0 ? lines[i - 1].trim() : "";
    if (prevLine.includes("eslint-disable") && prevLine.includes("no-explicit-any")) continue;
    if (line.includes("eslint-disable") && line.includes("no-explicit-any")) continue;
    if (/\bas\s+any\b|:\s*any\b|<any>/.test(line)) {
      addFinding("error", file, i + 1, "`any` type usage — use a specific type", 2);
    }
  }
}

// 3. Missing error check after Supabase mutation
for (const file of prodFiles) {
  const content = readFileSafe(file);
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/\.(insert|update|delete)\s*\(/.test(lines[i]) && !/supabase/.test(lines[i]) === false) {
      // Check if `{ error }` or `.error` appears within 3 lines after
      const window = lines.slice(i, i + 4).join("\n");
      if (
        /\.(insert|update|delete)\s*\(/.test(window) &&
        /supabase|from\(/.test(lines.slice(Math.max(0, i - 3), i + 1).join("\n"))
      ) {
        if (!/\{\s*error\s*\}|\.error\b|error\s*[=!]/.test(window)) {
          addFinding(
            "error",
            file,
            i + 1,
            `Supabase .${lines[i].match(/\.(insert|update|delete)/)?.[1] || "mutation"}() without error check`,
            3
          );
        }
      }
    }
  }
}

// 4. createAdminClient() in user-facing API routes (exempt: auth routes — no session exists)
function isAuthRoute(file) {
  return file.startsWith("src/app/api/auth/");
}
for (const file of prodFiles) {
  if (!isApiRoute(file) || isCronOrWebhook(file) || isAuthRoute(file)) continue;
  const content = readFileSafe(file);
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/createAdminClient\s*\(/.test(lines[i])) {
      addFinding(
        "error",
        file,
        i + 1,
        "createAdminClient() in user-facing API route — use tenant client",
        4
      );
    }
  }
}

// 5. Missing revalidatePath after mutation in server actions
for (const file of prodFiles) {
  if (!isServerAction(file)) continue;
  const content = readFileSafe(file);
  const hasMutation = /\.(insert|update|delete)\s*\(/.test(content);
  const hasRevalidate = /revalidatePath\s*\(/.test(content);
  if (hasMutation && !hasRevalidate) {
    addFinding(
      "warning",
      file,
      null,
      "Server action has mutations but no revalidatePath call",
      5
    );
  }
}

// 6. Inline styles in .tsx files
for (const file of prodFiles) {
  if (!isTsxFile(file)) continue;
  const content = readFileSafe(file);
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/style=\{\{/.test(lines[i])) {
      addFinding("error", file, i + 1, "Inline style — use Tailwind or lf-* classes", 6);
    }
  }
}

// 7. Missing loading/error state for new pages
for (const file of changedFiles) {
  if (!isPageFile(file)) continue;
  const dir = dirname(file);
  const loadingFile = join(dir, "loading.tsx");
  if (!existsSync(loadingFile)) {
    addFinding("info", file, null, "New page without loading.tsx sibling", 7);
  }
}

// 8. force-dynamic on pages without Supabase query
for (const file of prodFiles) {
  if (!isPageFile(file)) continue;
  const content = readFileSafe(file);
  if (/force-dynamic/.test(content)) {
    if (!/supabase|from\(|createClient|createServerClient/.test(content)) {
      addFinding("info", file, null, "force-dynamic but no Supabase query found", 8);
    }
  }
}

// 9. Large file (>500 lines)
for (const file of prodFiles) {
  const content = readFileSafe(file);
  const lineCount = content.split("\n").length;
  if (lineCount > 500) {
    addFinding("info", file, null, `Large file (${lineCount} lines) — consider splitting`, 9);
  }
}

// 10. Unhandled promise — .then() without .catch()
for (const file of prodFiles) {
  const content = readFileSafe(file);
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/\.then\s*\(/.test(lines[i])) {
      // Check if .catch appears within 3 lines after .then
      const window = lines.slice(i, i + 4).join("\n");
      if (!/\.catch\s*\(/.test(window)) {
        addFinding("warning", file, i + 1, ".then() without .catch() — handle rejection", 10);
      }
    }
  }
}

// ── Output ───────────────────────────────────────────────────────────
const errors = findings.filter((f) => f.severity === "error");
const warnings = findings.filter((f) => f.severity === "warning");
const infos = findings.filter((f) => f.severity === "info");

const totalFiles = changedFiles.length;
console.log(`=== PR Code Review (${totalFiles} changed files) ===\n`);

if (errors.length > 0) {
  console.log(`\u274C ERROR (${errors.length}):`);
  for (const f of errors) {
    const loc = f.line ? `${f.file}:${f.line}` : f.file;
    console.log(`  ${loc} \u2014 ${f.message}`);
  }
  console.log();
}

if (warnings.length > 0) {
  console.log(`\u26A0 WARNING (${warnings.length}):`);
  for (const f of warnings) {
    const loc = f.line ? `${f.file}:${f.line}` : f.file;
    console.log(`  ${loc} \u2014 ${f.message}`);
  }
  console.log();
}

if (infos.length > 0) {
  console.log(`\u2139 INFO (${infos.length}):`);
  for (const f of infos) {
    const loc = f.line ? `${f.file}:${f.line}` : f.file;
    console.log(`  ${loc} \u2014 ${f.message}`);
  }
  console.log();
}

if (findings.length === 0) {
  console.log("\u2705 All checks passed — no issues found.\n");
}

console.log(
  `=== ${errors.length} errors, ${warnings.length} warnings, ${infos.length} info ===`
);

if (errors.length > 0) {
  console.log("Recommendation: REQUEST CHANGES (" + errors.length + " errors must be fixed)");
  process.exit(1);
} else if (warnings.length > 0) {
  console.log("Recommendation: APPROVE with warnings");
  process.exit(0);
} else {
  console.log("Recommendation: APPROVE");
  process.exit(0);
}

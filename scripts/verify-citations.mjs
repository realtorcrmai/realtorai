#!/usr/bin/env node
/**
 * HC-13 Citation Verifier
 *
 * Extracts file:line references from markdown files in the PR diff,
 * verifies each cited file exists and the line number is valid.
 * Used by review-gate or completion-gate to block invalid citations.
 *
 * Usage: node scripts/verify-citations.mjs [--file path/to/doc.md]
 *        node scripts/verify-citations.mjs --diff  (checks all changed .md files)
 *
 * Exit 0 = all citations valid (or no citations found)
 * Exit 1 = invalid citations found
 */

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const args = process.argv.slice(2);
let files = [];

if (args.includes("--diff")) {
  // Check all changed .md files in the PR
  try {
    const raw = execSync("git diff --name-only origin/dev...HEAD", { encoding: "utf-8" }).trim();
    files = raw.split("\n").filter(f => f.endsWith(".md") && existsSync(f));
  } catch {
    files = [];
  }
} else if (args.includes("--file")) {
  const idx = args.indexOf("--file");
  if (args[idx + 1]) files = [args[idx + 1]];
} else {
  // Default: check docs/ and usecases/
  try {
    const raw = execSync("git diff --name-only origin/dev...HEAD", { encoding: "utf-8" }).trim();
    files = raw.split("\n").filter(f =>
      (f.startsWith("docs/") || f.startsWith("usecases/")) && f.endsWith(".md") && existsSync(f)
    );
  } catch {
    files = [];
  }
}

if (files.length === 0) {
  process.exit(0);
}

// Match patterns like `src/lib/foo.ts:123` or `path/to/file.ts:45`
const CITATION_RE = /(?<![`\w\/])([a-zA-Z][\w\-./]*\.(?:ts|tsx|js|jsx|mjs|sql|sh|py|json)):(\d+)/g;

let totalCitations = 0;
let invalidCitations = [];

for (const file of files) {
  const content = readFileSync(file, "utf-8");
  let match;

  while ((match = CITATION_RE.exec(content)) !== null) {
    const [full, citedFile, lineStr] = match;
    const lineNum = parseInt(lineStr, 10);
    totalCitations++;

    // Check file exists
    if (!existsSync(citedFile)) {
      invalidCitations.push({ source: file, citation: full, reason: `file not found: ${citedFile}` });
      continue;
    }

    // Check line number is valid
    const lines = readFileSync(citedFile, "utf-8").split("\n");
    if (lineNum > lines.length || lineNum < 1) {
      invalidCitations.push({
        source: file,
        citation: full,
        reason: `line ${lineNum} out of range (file has ${lines.length} lines)`
      });
    }
  }
}

if (invalidCitations.length === 0) {
  if (totalCitations > 0) {
    console.log(`✅ ${totalCitations} citation(s) verified across ${files.length} file(s).`);
  }
  process.exit(0);
}

console.error(`❌ ${invalidCitations.length} invalid citation(s) found:\n`);
for (const inv of invalidCitations) {
  console.error(`  ${inv.source}: ${inv.citation} — ${inv.reason}`);
}
console.error(`\nFix: update citations to match current file paths and line numbers.`);
process.exit(1);

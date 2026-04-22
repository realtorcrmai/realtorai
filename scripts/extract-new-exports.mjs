#!/usr/bin/env node
/**
 * Extracts newly exported symbols from the PR diff (vs origin/dev).
 * Outputs JSON array of { file, symbol } for use by completion-gate.sh.
 *
 * Scope: .ts and .tsx files in src/ only. Ignores tests, __tests__, .test., .spec.
 *
 * Usage: node scripts/extract-new-exports.mjs > /tmp/new-exports.json
 * Exit 0 always; empty array is valid output.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";

function getChangedProdFiles() {
  try {
    const raw = execSync("git diff --name-only origin/dev...HEAD", {
      encoding: "utf-8",
    }).trim();
    if (!raw) return [];
    return raw
      .split("\n")
      .filter((f) =>
        f.startsWith("src/") &&
        (f.endsWith(".ts") || f.endsWith(".tsx")) &&
        !f.includes(".test.") &&
        !f.includes(".spec.") &&
        !f.includes("__tests__") &&
        existsSync(f)
      );
  } catch {
    return [];
  }
}

function getNewExports(file) {
  // Get the diff of this file. Only look at ADDED lines (start with +).
  let addedLines;
  try {
    addedLines = execSync(`git diff origin/dev...HEAD -- "${file}"`, {
      encoding: "utf-8",
    })
      .split("\n")
      .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
      .map((l) => l.substring(1));
  } catch {
    return [];
  }

  const exports = [];
  // Match: export function foo, export async function foo,
  // export const foo, export class foo, export type foo, export interface foo
  const patterns = [
    /^export\s+(?:async\s+)?function\s+(\w+)/,
    /^export\s+(?:const|let|var)\s+(\w+)/,
    /^export\s+class\s+(\w+)/,
    /^export\s+(?:type|interface)\s+(\w+)/,
  ];
  for (const line of addedLines) {
    for (const re of patterns) {
      const m = line.match(re);
      if (m) exports.push({ file, symbol: m[1] });
    }
  }
  return exports;
}

const files = getChangedProdFiles();
const allExports = files.flatMap(getNewExports);
console.log(JSON.stringify(allExports, null, 2));

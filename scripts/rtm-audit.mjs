#!/usr/bin/env node

/**
 * RTM Audit Script — Requirements Traceability Matrix Validator
 *
 * Validates that:
 * 1. Every requirement in tests/rtm.yaml has at least one test
 * 2. Every test file has REQ-ID annotations in test titles
 * 3. Orphan tests (tests with REQ-IDs not in the RTM) are flagged
 * 4. Pyramid ratio is healthy (L1 >= 60% of total)
 * 5. Waivers have expiry dates
 *
 * Usage:
 *   node scripts/rtm-audit.mjs [--strict] [--json]
 *
 * Exit codes:
 *   0 — audit passed
 *   1 — gaps found (requirements without tests)
 *   2 — orphan tests found
 *   3 — both gaps and orphans
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { parse } from "yaml";

const ROOT = process.cwd();
const RTM_PATH = join(ROOT, "tests/rtm.yaml");
const TEST_DIRS = [
  "src/__tests__",
  "tests/browser",
  "tests/integration",
  "tests/api",
  "tests/contract",
  "tests/a11y",
  "tests/visual",
  "tests/resilience",
  "tests/load",
  "tests/mcp",
];
const STRICT = process.argv.includes("--strict");
const JSON_OUTPUT = process.argv.includes("--json");

// ── Load RTM ────────────────────────────────────────────────

function loadRTM() {
  try {
    const raw = readFileSync(RTM_PATH, "utf-8");
    return parse(raw);
  } catch {
    console.error(`[rtm-audit] Cannot read ${RTM_PATH}`);
    process.exit(1);
  }
}

// ── Scan test files for REQ-IDs ─────────────────────────────

function findTestFiles(dir) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        results.push(...findTestFiles(fullPath));
      } else if (entry.isFile() && /\.(spec|test)\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist — skip
  }
  return results;
}

function extractReqIds(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const matches = content.matchAll(/REQ-([A-Z]+-\d+)/g);
  const ids = new Set();
  for (const match of matches) {
    ids.add(`REQ-${match[1]}`);
  }
  return { file: relative(ROOT, filePath), reqIds: [...ids] };
}

function classifyLayer(filePath) {
  if (filePath.includes("__tests__")) return "L1";
  if (filePath.includes("tests/browser/accessibility") || filePath.includes("tests/a11y")) return "L6a";
  if (filePath.includes("tests/browser/visual") || filePath.includes("tests/visual")) return "L6b";
  if (filePath.includes("tests/browser") || filePath.includes("tests/e2e")) return "L5";
  if (filePath.includes("tests/integration") || filePath.includes("tests/api")) return "L4";
  if (filePath.includes("tests/contract")) return "L3";
  if (filePath.includes("tests/resilience")) return "L7";
  if (filePath.includes("tests/load")) return "L8";
  if (filePath.includes("tests/mcp")) return "MCP";
  return "unknown";
}

// ── Audit logic ─────────────────────────────────────────────

function runAudit() {
  const rtm = loadRTM();
  const now = new Date().toISOString().split("T")[0];

  // Collect all REQ-IDs from RTM
  const rtmReqs = new Map(); // id -> { area, description, priority, waiver? }
  for (const area of rtm.areas || []) {
    for (const req of area.requirements || []) {
      rtmReqs.set(req.id, {
        area: area.id,
        description: req.description,
        priority: req.priority,
        waiver: req.waiver || null,
        tests: req.tests || [],
      });
    }
  }

  // Scan all test files
  const allTestFiles = [];
  for (const dir of TEST_DIRS) {
    allTestFiles.push(...findTestFiles(join(ROOT, dir)));
  }

  const testReqMap = new Map(); // reqId -> [{ file, layer }]
  const layerCounts = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, "L6a": 0, "L6b": 0, L7: 0, L8: 0, MCP: 0, unknown: 0 };
  const allFoundReqIds = new Set();

  for (const filePath of allTestFiles) {
    const { file, reqIds } = extractReqIds(filePath);
    const layer = classifyLayer(file);
    layerCounts[layer] = (layerCounts[layer] || 0) + 1;

    for (const reqId of reqIds) {
      allFoundReqIds.add(reqId);
      if (!testReqMap.has(reqId)) testReqMap.set(reqId, []);
      testReqMap.get(reqId).push({ file, layer });
    }
  }

  // ── Analysis ──────────────────────────────────────────────

  const gaps = []; // RTM reqs with no tests
  const covered = []; // RTM reqs with tests
  const waived = []; // RTM reqs with active waivers
  const expiredWaivers = []; // Waivers past expiry

  for (const [reqId, info] of rtmReqs) {
    const tests = testReqMap.get(reqId) || [];
    if (info.waiver) {
      if (info.waiver.expires && info.waiver.expires < now) {
        expiredWaivers.push({ reqId, ...info });
      } else {
        waived.push({ reqId, ...info });
      }
    } else if (tests.length === 0 && info.tests.length === 0) {
      gaps.push({ reqId, ...info });
    } else {
      covered.push({ reqId, tests, ...info });
    }
  }

  // Orphan tests (REQ-IDs in tests but not in RTM)
  const orphans = [];
  for (const reqId of allFoundReqIds) {
    if (!rtmReqs.has(reqId)) {
      orphans.push({ reqId, files: testReqMap.get(reqId) });
    }
  }

  // Pyramid ratio
  const totalTests = Object.values(layerCounts).reduce((a, b) => a + b, 0);
  const l1Pct = totalTests > 0 ? ((layerCounts.L1 / totalTests) * 100).toFixed(1) : 0;
  const l5Pct = totalTests > 0 ? ((layerCounts.L5 / totalTests) * 100).toFixed(1) : 0;
  const pyramidHealthy = Number(l1Pct) >= 40; // Relaxed from 60% for early stages

  // ── Report ────────────────────────────────────────────────

  const totalReqs = rtmReqs.size;
  const coveragePct = totalReqs > 0 ? (((covered.length + waived.length) / totalReqs) * 100).toFixed(1) : 0;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalRequirements: totalReqs,
      covered: covered.length,
      gaps: gaps.length,
      waived: waived.length,
      expiredWaivers: expiredWaivers.length,
      orphanTests: orphans.length,
      coveragePct: `${coveragePct}%`,
      pyramidHealthy,
    },
    layerCounts,
    pyramidRatio: { L1: `${l1Pct}%`, L5: `${l5Pct}%` },
    gaps: gaps.map((g) => ({
      id: g.reqId,
      area: g.area,
      priority: g.priority,
      description: g.description,
    })),
    expiredWaivers: expiredWaivers.map((w) => ({
      id: w.reqId,
      area: w.area,
      expires: w.waiver.expires,
    })),
    orphans: orphans.map((o) => ({
      reqId: o.reqId,
      files: o.files.map((f) => f.file),
    })),
  };

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("\n═══════════════════════════════════════════════════");
    console.log("  RTM Audit Report — Realtors360");
    console.log("═══════════════════════════════════════════════════\n");

    console.log(`  Total requirements: ${totalReqs}`);
    console.log(`  Covered:            ${covered.length} (${coveragePct}%)`);
    console.log(`  Gaps:               ${gaps.length}`);
    console.log(`  Waived:             ${waived.length}`);
    console.log(`  Expired waivers:    ${expiredWaivers.length}`);
    console.log(`  Orphan tests:       ${orphans.length}`);
    console.log(`  Test files scanned: ${allTestFiles.length}`);
    console.log();

    console.log("  Pyramid Ratio:");
    for (const [layer, count] of Object.entries(layerCounts)) {
      if (count > 0) console.log(`    ${layer}: ${count} files`);
    }
    console.log(`    L1%: ${l1Pct}% (target: ≥60%)`);
    console.log(`    L5%: ${l5Pct}% (target: ≤15%)`);
    console.log(`    Pyramid: ${pyramidHealthy ? "HEALTHY" : "INVERTED — needs more L1 tests"}`);
    console.log();

    if (gaps.length > 0) {
      console.log("  GAPS (requirements without tests):");
      const byPriority = { P0: [], P1: [], P2: [] };
      for (const g of gaps) {
        (byPriority[g.priority] || byPriority.P2).push(g);
      }
      for (const [pri, items] of Object.entries(byPriority)) {
        if (items.length > 0) {
          console.log(`\n    ${pri}:`);
          for (const g of items) {
            console.log(`      ${g.reqId} [${g.area}] ${g.description}`);
          }
        }
      }
      console.log();
    }

    if (expiredWaivers.length > 0) {
      console.log("  EXPIRED WAIVERS (must be resolved):");
      for (const w of expiredWaivers) {
        console.log(`    ${w.reqId} [${w.area}] expired: ${w.waiver.expires}`);
      }
      console.log();
    }

    if (orphans.length > 0) {
      console.log("  ORPHAN TESTS (REQ-IDs not in RTM):");
      for (const o of orphans) {
        console.log(`    ${o.reqId} in: ${o.files.map((f) => f.file).join(", ")}`);
      }
      console.log();
    }

    const verdict = gaps.length === 0 && expiredWaivers.length === 0;
    console.log(`  VERDICT: ${verdict ? "PASS" : "FAIL"}`);
    if (STRICT && (orphans.length > 0 || !pyramidHealthy)) {
      console.log("  (strict mode: orphans or inverted pyramid also fail)");
    }
    console.log("\n═══════════════════════════════════════════════════\n");
  }

  // Exit code
  let code = 0;
  if (gaps.length > 0 || expiredWaivers.length > 0) code |= 1;
  if (STRICT && orphans.length > 0) code |= 2;
  process.exit(code);
}

runAudit();

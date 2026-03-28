#!/usr/bin/env node

/**
 * Telemetry Report Generator
 *
 * Reads .claude/telemetry.jsonl and produces a weekly summary.
 * Run: node scripts/telemetry-report.mjs [--days 7] [--developer claude] [--json]
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const TELEMETRY_PATH = resolve(process.cwd(), '.claude/telemetry.jsonl');
const COST_PER_1M = {
  'haiku': { input: 0.25, output: 1.25 },
  'sonnet': { input: 3.0, output: 15.0 },
  'opus': { input: 15.0, output: 75.0 },
};

// --- Parse args ---
const args = process.argv.slice(2);
const days = parseInt(args[args.indexOf('--days') + 1]) || 7;
const devFilter = args.includes('--developer') ? args[args.indexOf('--developer') + 1] : null;
const jsonOutput = args.includes('--json');
const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// --- Load data ---
if (!existsSync(TELEMETRY_PATH)) {
  console.log('No telemetry data found at', TELEMETRY_PATH);
  console.log('Telemetry logging must be enabled in the agent playbook.');
  console.log('Each task appends a JSON line to .claude/telemetry.jsonl');
  process.exit(0);
}

const raw = readFileSync(TELEMETRY_PATH, 'utf-8').trim();
if (!raw) {
  console.log('Telemetry file is empty. No tasks logged yet.');
  process.exit(0);
}

const entries = raw.split('\n').map((line, i) => {
  try { return JSON.parse(line); }
  catch { console.warn(`Line ${i + 1}: invalid JSON, skipped`); return null; }
}).filter(Boolean);

// --- Filter ---
const filtered = entries.filter(e => {
  const date = new Date(e.date);
  if (date < cutoff) return false;
  if (devFilter && e.developer !== devFilter) return false;
  return true;
});

if (filtered.length === 0) {
  console.log(`No telemetry entries in the last ${days} days.`);
  process.exit(0);
}

// --- Compute metrics ---

// 1. Tasks per developer
const byDev = {};
filtered.forEach(e => {
  byDev[e.developer] = byDev[e.developer] || { tasks: 0, pass: 0, fail: 0, tokens_in: 0, tokens_out: 0, cost: 0, tool_calls: 0, tool_errors: 0, safety_flags: 0, latency: 0 };
  const d = byDev[e.developer];
  d.tasks++;
  if (e.playbook_followed) d.pass++; else d.fail++;
  d.tokens_in += e.tokens_in || 0;
  d.tokens_out += e.tokens_out || 0;
  d.tool_calls += e.tool_calls || 0;
  d.tool_errors += e.tool_errors || 0;
  d.safety_flags += e.safety_flags || 0;
  d.latency += e.latency_seconds || 0;

  const model = (e.model || 'sonnet').toLowerCase();
  const tier = model.includes('haiku') ? 'haiku' : model.includes('opus') ? 'opus' : 'sonnet';
  const rates = COST_PER_1M[tier];
  d.cost += ((e.tokens_in || 0) / 1_000_000 * rates.input) + ((e.tokens_out || 0) / 1_000_000 * rates.output);
});

// 2. Tasks per type
const byType = {};
filtered.forEach(e => {
  const t = e.task_type || 'unknown';
  byType[t] = (byType[t] || 0) + 1;
});

// 3. Model usage
const byModel = {};
filtered.forEach(e => {
  const m = e.model || 'unknown';
  byModel[m] = (byModel[m] || 0) + 1;
});

// 4. Alerts
const alerts = [];

// Safety flags
filtered.forEach(e => {
  if (e.safety_flags > 0) {
    alerts.push({ level: 'CRITICAL', message: `Safety flag on ${e.date} by ${e.developer}: ${e.task_summary}`, entry: e });
  }
});

// Token budget overruns (>50% over budget)
const BUDGETS = {
  'INFO_QA': 50000, 'CODING:trivial': 30000, 'CODING:feature': 200000,
  'DESIGN_SPEC': 300000, 'RAG_KB': 100000, 'ORCHESTRATION': 150000,
};
filtered.forEach(e => {
  const budget = BUDGETS[e.task_type] || 150000;
  if ((e.tokens_in || 0) > budget * 1.5) {
    alerts.push({ level: 'WARNING', message: `Token overrun: ${e.task_type} used ${e.tokens_in} tokens (budget: ${budget}) on ${e.date}` });
  }
});

// 3+ tool errors in single task
filtered.forEach(e => {
  if ((e.tool_errors || 0) >= 3) {
    alerts.push({ level: 'WARNING', message: `${e.tool_errors} tool errors in single task on ${e.date}: ${e.task_summary}` });
  }
});

// Compliance rate per developer
Object.entries(byDev).forEach(([dev, data]) => {
  const rate = data.pass / data.tasks;
  if (rate < 0.9) {
    alerts.push({ level: 'WARNING', message: `${dev} compliance rate: ${(rate * 100).toFixed(0)}% (${data.pass}/${data.tasks}) — below 90% threshold` });
  }
});

// --- Total cost ---
const totalCost = Object.values(byDev).reduce((s, d) => s + d.cost, 0);

// --- Output ---
if (jsonOutput) {
  console.log(JSON.stringify({ period: { days, from: cutoff.toISOString(), to: new Date().toISOString() }, total_tasks: filtered.length, total_cost_usd: Math.round(totalCost * 100) / 100, by_developer: byDev, by_task_type: byType, by_model: byModel, alerts }, null, 2));
  process.exit(0);
}

// Human-readable output
console.log(`\n${'═'.repeat(60)}`);
console.log(`  TELEMETRY REPORT — Last ${days} days`);
console.log(`  ${cutoff.toISOString().split('T')[0]} → ${new Date().toISOString().split('T')[0]}`);
console.log(`${'═'.repeat(60)}\n`);

// Alerts first
if (alerts.length > 0) {
  console.log(`⚠️  ALERTS (${alerts.length})`);
  console.log(`${'─'.repeat(40)}`);
  alerts.forEach(a => console.log(`  [${a.level}] ${a.message}`));
  console.log();
}

// Summary
console.log(`📊 SUMMARY`);
console.log(`${'─'.repeat(40)}`);
console.log(`  Total tasks:     ${filtered.length}`);
console.log(`  Total cost:      $${totalCost.toFixed(2)}`);
console.log(`  Avg cost/task:   $${(totalCost / filtered.length).toFixed(3)}`);
console.log();

// By developer
console.log(`👤 BY DEVELOPER`);
console.log(`${'─'.repeat(40)}`);
Object.entries(byDev).sort((a, b) => b[1].tasks - a[1].tasks).forEach(([dev, d]) => {
  const rate = ((d.pass / d.tasks) * 100).toFixed(0);
  const avgLatency = d.tasks > 0 ? (d.latency / d.tasks).toFixed(0) : 0;
  console.log(`  ${dev}:`);
  console.log(`    Tasks: ${d.tasks} (✅ ${d.pass} / ❌ ${d.fail}) — ${rate}% compliance`);
  console.log(`    Tokens: ${(d.tokens_in / 1000).toFixed(1)}K in / ${(d.tokens_out / 1000).toFixed(1)}K out`);
  console.log(`    Cost: $${d.cost.toFixed(2)} | Tools: ${d.tool_calls} calls, ${d.tool_errors} errors`);
  console.log(`    Avg latency: ${avgLatency}s | Safety flags: ${d.safety_flags}`);
  console.log();
});

// By task type
console.log(`📋 BY TASK TYPE`);
console.log(`${'─'.repeat(40)}`);
Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});
console.log();

// By model
console.log(`🤖 BY MODEL`);
console.log(`${'─'.repeat(40)}`);
Object.entries(byModel).sort((a, b) => b[1] - a[1]).forEach(([model, count]) => {
  console.log(`  ${model}: ${count}`);
});
console.log();

console.log(`${'═'.repeat(60)}`);
console.log(`  Run: node scripts/telemetry-report.mjs --days 30`);
console.log(`  JSON: node scripts/telemetry-report.mjs --json`);
console.log(`  Filter: node scripts/telemetry-report.mjs --developer claude`);
console.log(`${'═'.repeat(60)}\n`);

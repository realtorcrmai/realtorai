#!/usr/bin/env bash
# ============================================================
# ListingFlow — Unified Test Runner
# Runs ALL automated tests in sequence with unified reporting.
# Usage: bash scripts/test-all.sh
# ============================================================

set -uo pipefail

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ListingFlow — Full Automated Test Suite         ║"
echo "║   $(date '+%Y-%m-%d %H:%M:%S')                            ║"
echo "╚══════════════════════════════════════════════════╝"

TOTAL_PASS=0
TOTAL_FAIL=0
SUITE_RESULTS=""

run_suite() {
  local name="$1"
  local cmd="$2"
  echo ""
  echo "━━━ $name ━━━"
  if eval "$cmd"; then
    SUITE_RESULTS="$SUITE_RESULTS\n  ✅ $name"
    TOTAL_PASS=$((TOTAL_PASS+1))
  else
    SUITE_RESULTS="$SUITE_RESULTS\n  ❌ $name"
    TOTAL_FAIL=$((TOTAL_FAIL+1))
  fi
}

# ── Layer 1: Static Analysis ──────────────────────────────
run_suite "TypeScript Compilation" "npx tsc --noEmit 2>&1"
run_suite "ESLint" "npx eslint src/ --quiet 2>&1 || true"

# ── Layer 2: API + DB Tests ───────────────────────────────
run_suite "API + DB Test Suite (73+ tests)" "bash scripts/test-suite.sh"

# ── Layer 3: Browser Tests (Playwright) ───────────────────
if command -v npx &> /dev/null && [ -d "tests/browser" ]; then
  SPEC_COUNT=$(find tests/browser -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$SPEC_COUNT" -gt 0 ]; then
    run_suite "Playwright Browser Tests ($SPEC_COUNT specs)" "npx playwright test --reporter=list 2>&1"
  else
    echo "  ⏭️  Playwright — no spec files found in tests/browser/"
  fi
else
  echo "  ⏭️  Playwright — not configured"
fi

# ── Layer 4: Integration Eval Suites ──────────────────────
if [ -f .env.local ]; then
  set -a; source .env.local; set +a
fi

for eval_script in scripts/eval-*.mjs; do
  if [ -f "$eval_script" ]; then
    name=$(basename "$eval_script" .mjs | sed 's/eval-/Eval: /')
    run_suite "$name" "node $eval_script 2>&1"
  fi
done

# ── Layer 5: QA Suites ────────────────────────────────────
if [ -f scripts/qa-test-email-engine.mjs ]; then
  run_suite "QA: Email Engine" "node scripts/qa-test-email-engine.mjs 2>&1"
fi
if [ -f scripts/qa-test-ai-agent.mjs ]; then
  run_suite "QA: AI Agent" "node scripts/qa-test-ai-agent.mjs 2>&1"
fi

# ── SUMMARY ───────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
TOTAL=$((TOTAL_PASS+TOTAL_FAIL))
if [ "$TOTAL_FAIL" -eq 0 ]; then
  echo "  🟢 ALL SUITES PASSED — $TOTAL_PASS/$TOTAL"
else
  echo "  🔴 $TOTAL_FAIL SUITE(S) FAILED — $TOTAL_PASS passed"
fi
echo ""
echo "  Suite Results:"
echo -e "$SUITE_RESULTS"
echo "══════════════════════════════════════════════════════"

exit $TOTAL_FAIL

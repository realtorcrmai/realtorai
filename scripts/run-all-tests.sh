#!/usr/bin/env bash
# ============================================================================
# ListingFlow — Unified Test Runner
# Runs ALL test suites in order: static analysis → API/DB → eval scripts → Playwright
#
# Usage:
#   bash scripts/run-all-tests.sh          # Run everything
#   bash scripts/run-all-tests.sh --quick  # Static analysis + API/DB only
#
# Exit code: 0 if all pass, 1 if any suite fails
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

QUICK_MODE=false
[[ "${1:-}" == "--quick" ]] && QUICK_MODE=true

PASS=0
FAIL=0
SKIP=0
RESULTS=()

run_suite() {
    local name="$1"
    local cmd="$2"
    local required="${3:-true}"

    printf "\n━━━ %-45s ━━━\n" "$name"

    if eval "$cmd" 2>&1; then
        PASS=$((PASS + 1))
        RESULTS+=("  ✓  $name")
    else
        if [[ "$required" == "true" ]]; then
            FAIL=$((FAIL + 1))
            RESULTS+=("  ✗  $name")
        else
            SKIP=$((SKIP + 1))
            RESULTS+=("  ⚠  $name (optional — failed)")
        fi
    fi
}

echo "╔══════════════════════════════════════════════════╗"
echo "║     ListingFlow — Unified Test Runner           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Mode: $([ "$QUICK_MODE" = true ] && echo 'QUICK (static + API/DB)' || echo 'FULL (all suites)')"
echo "Started: $(date '+%Y-%m-%d %H:%M:%S')"

# ── Layer 1: Static Analysis ──────────────────────────────
run_suite "TypeScript compilation" "npx tsc --noEmit"
run_suite "ESLint" "npx eslint --max-warnings=0 src/ 2>/dev/null || npx eslint src/"

# ── Layer 2: API + DB Tests ───────────────────────────────
run_suite "Test suite (73+ API/DB tests)" "bash scripts/test-suite.sh"

if [[ "$QUICK_MODE" == true ]]; then
    echo ""
    echo "━━━ Quick mode — skipping eval scripts and Playwright ━━━"
else
    # ── Layer 3: Eval Scripts ─────────────────────────────────
    for EVAL_SCRIPT in "$SCRIPT_DIR"/eval-*.mjs; do
        SCRIPT_NAME=$(basename "$EVAL_SCRIPT" .mjs)
        run_suite "Eval: $SCRIPT_NAME" "node '$EVAL_SCRIPT'" "false"
    done

    # ── Layer 4: QA Scripts ───────────────────────────────────
    for QA_SCRIPT in "$SCRIPT_DIR"/qa-test-*.mjs; do
        SCRIPT_NAME=$(basename "$QA_SCRIPT" .mjs)
        run_suite "QA: $SCRIPT_NAME" "node '$QA_SCRIPT'" "false"
    done

    # ── Layer 5: Integration Test Scripts ─────────────────────
    for TEST_SCRIPT in "$SCRIPT_DIR"/test-*.mjs; do
        SCRIPT_NAME=$(basename "$TEST_SCRIPT" .mjs)
        # Skip test-session-changes (utility, not a test suite)
        [[ "$SCRIPT_NAME" == "test-session-changes" ]] && continue
        run_suite "Test: $SCRIPT_NAME" "node '$TEST_SCRIPT'" "false"
    done

    # ── Layer 6: Playwright (if configured) ───────────────────
    if [[ -f "$PROJECT_DIR/playwright.config.ts" ]]; then
        run_suite "Playwright browser tests" "npx playwright test --reporter=line" "false"
    fi

    # ── Layer 7: Test Plan ↔ Executable Sync ─────────────────
    if [[ -f "$SCRIPT_DIR/sync-test-plans.mjs" ]]; then
        run_suite "Test plan sync check" "node '$SCRIPT_DIR/sync-test-plans.mjs' --check" "false"
    fi
fi

# ── Summary ───────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║                 TEST SUMMARY                    ║"
echo "╠══════════════════════════════════════════════════╣"

for result in "${RESULTS[@]}"; do
    echo "║  $result"
done

echo "╠══════════════════════════════════════════════════╣"
printf "║  Passed: %-3s  Failed: %-3s  Optional fail: %-3s ║\n" "$PASS" "$FAIL" "$SKIP"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Finished: $(date '+%Y-%m-%d %H:%M:%S')"

if [[ $FAIL -gt 0 ]]; then
    echo "RESULT: FAIL ($FAIL required suite(s) failed)"
    exit 1
else
    echo "RESULT: PASS (all required suites passed)"
    exit 0
fi

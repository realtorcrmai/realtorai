#!/bin/bash
# Run all Playwright suites and report results
cd "$(dirname "$0")/.."

SUITES=(
  "tests/browser/security/"
  "tests/browser/performance/"
  "tests/browser/accessibility/"
  "tests/browser/visual/"
  "tests/browser/components/"
  "tests/browser/journeys/"
)

TOTAL_PASS=0
TOTAL_FAIL=0
IDX=0
TOTAL=${#SUITES[@]}

for suite in "${SUITES[@]}"; do
  IDX=$((IDX + 1))
  PCT=$((IDX * 100 / TOTAL))
  echo ""
  echo "━━━ [$IDX/$TOTAL] ($PCT%) $suite ━━━"

  OUTPUT=$(npx playwright test "$suite" --reporter=line --project=desktop 2>&1)

  PASSED=$(echo "$OUTPUT" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo "0")
  FAILED=$(echo "$OUTPUT" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo "0")

  [[ -z "$PASSED" ]] && PASSED=0
  [[ -z "$FAILED" ]] && FAILED=0

  TOTAL_PASS=$((TOTAL_PASS + PASSED))
  TOTAL_FAIL=$((TOTAL_FAIL + FAILED))

  if [[ "$FAILED" -gt 0 ]]; then
    echo "  RESULT: $PASSED passed, $FAILED FAILED"
    echo "$OUTPUT" | grep -E "^\s+\[desktop\].*›.*›" | head -10
  else
    echo "  RESULT: $PASSED passed ✓"
  fi
done

echo ""
echo "╔══════════════════════════════════════╗"
echo "  TOTAL: $TOTAL_PASS passed, $TOTAL_FAIL failed"
echo "╚══════════════════════════════════════╝"

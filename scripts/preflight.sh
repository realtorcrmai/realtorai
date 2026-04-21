#!/usr/bin/env bash
# scripts/preflight.sh
#
# Runs before any test-authoring session or PR submission.
# Fails fast and loudly. Every check is cheap (<30s total).
# Exit codes:
#   0 = ready to work
#   1 = environment problem (fix before proceeding)
#   2 = rule violation found in working tree
#
# Required by TESTING.md. Do not bypass.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

fail() { echo -e "${RED}FAIL: $1${NC}" >&2; exit "${2:-1}"; }
pass() { echo -e "${GREEN}OK${NC} $1"; }
warn() { echo -e "${YELLOW}!!${NC} $1"; }

echo "-- Realtors360 test preflight --"

# 1. Node version check
CURRENT_NODE=$(node -v 2>/dev/null | tr -d 'v' || echo "none")
if [[ "$CURRENT_NODE" == "none" ]]; then
  fail "Node.js not found. Install Node 20+."
fi
NODE_MAJOR=$(echo "$CURRENT_NODE" | cut -d. -f1)
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  fail "Node version too old: $CURRENT_NODE. Need 20+."
fi
pass "Node $CURRENT_NODE"

# 2. Dependencies installed
if [[ ! -d node_modules ]]; then
  fail "node_modules missing. Run 'npm ci'."
fi
pass "Dependencies installed"

# 3. Environment variables present
REQUIRED_VARS=(NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY NEXTAUTH_SECRET)
MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    MISSING+=("$var")
  fi
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
  warn "Missing env vars: ${MISSING[*]} (needed for L4+ tests)"
else
  pass "Required env vars set"
fi

# 4. Test infrastructure files present
for f in tests/rtm.yaml TESTING.md docs/testing.md; do
  [[ -f "$f" ]] || fail "Required file missing: $f"
done
pass "Test infrastructure files present"

# 5. TypeScript compiles
if ! npx tsc --noEmit >/dev/null 2>&1; then
  fail "TypeScript errors. Run 'npx tsc --noEmit' for details." 2
fi
pass "TypeScript strict compile"

# 6. Lint clean
if ! npx next lint --quiet >/dev/null 2>&1; then
  warn "ESLint warnings present. Run 'npm run lint' for details."
else
  pass "Lint clean"
fi

# 7. Secrets scan (only staged/working-tree files)
if command -v gitleaks >/dev/null 2>&1; then
  if ! gitleaks protect --staged --no-banner --redact >/dev/null 2>&1; then
    fail "Secrets detected in staged changes. Run 'gitleaks protect --staged' to review." 2
  fi
  pass "No secrets in staged changes"
else
  warn "gitleaks not installed -- skipping secret scan"
fi

# 8. Test title regex enforcement on changed test files
CHANGED_TESTS=$(git diff --name-only --diff-filter=AM HEAD 2>/dev/null | grep -E '\.(test|spec)\.(ts|tsx|js)$' || true)
if [[ -n "$CHANGED_TESTS" ]]; then
  BAD=0
  while IFS= read -r file; do
    while IFS= read -r line; do
      if echo "$line" | grep -qE '^\s*(it|test)\(' && ! echo "$line" | grep -qE '^\s*(it|test)\(\s*['"'"'"`]REQ-[A-Z]+-[0-9]+'; then
        echo -e "${RED}  FAIL $file: $(echo "$line" | sed 's/^[[:space:]]*//')${NC}"
        BAD=1
      fi
    done < "$file"
  done <<< "$CHANGED_TESTS"
  if [[ "$BAD" -eq 1 ]]; then
    fail "Test titles violate TESTING.md Rule 1. Fix titles to: REQ-X-N TC-Y-N: description @p0" 2
  fi
  pass "Test titles match regex ($(echo "$CHANGED_TESTS" | wc -l | tr -d ' ') files checked)"
fi

# 9. RTM audit (if script exists)
if [[ -f scripts/rtm-audit.mjs ]]; then
  if ! node scripts/rtm-audit.mjs --mode=preflight >/dev/null 2>&1; then
    warn "RTM audit has gaps. Run 'npm run test:rtm' for details."
  else
    pass "RTM audit clean"
  fi
else
  warn "RTM audit script not found -- skipping"
fi

# 10. Dev server reachable (optional, for E2E readiness)
if curl -s --max-time 2 http://localhost:3000 >/dev/null 2>&1; then
  pass "Dev server running on :3000"
else
  warn "Dev server not running -- L5 E2E tests will fail"
fi

echo ""
echo -e "${GREEN}-- preflight complete --${NC}"
echo "You may now write tests. Remember: rtm.yaml entry BEFORE test code."

#!/bin/bash
# ============================================================================
# Verify Playbook Enforcement — Run to check your setup is complete
#
# Usage: bash scripts/verify-enforcement.sh
# ============================================================================

echo "╔══════════════════════════════════════════════╗"
echo "║  Realtors360 — Playbook Enforcement Check    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0

check() {
    local name="$1"
    local result="$2"
    if [[ "$result" == "ok" ]]; then
        echo "  ✅ $name"
        PASS=$((PASS + 1))
    else
        echo "  ❌ $name — $result"
        FAIL=$((FAIL + 1))
    fi
}

echo "=== Layer 1: AI Tool Configuration ==="
[[ -f .claude/settings.json ]] && check "Claude Code settings.json" "ok" || check "Claude Code settings.json" "MISSING — pull latest dev"
[[ -f .cursorrules ]] && check "Cursor rules" "ok" || check "Cursor rules" "MISSING — pull latest dev"
[[ -f .github/copilot-instructions.md ]] && check "Copilot instructions" "ok" || check "Copilot instructions" "MISSING — pull latest dev"
[[ -f .windsurfrules ]] && check "Windsurf rules" "ok" || check "Windsurf rules" "MISSING — pull latest dev"
[[ -f AGENTS.md ]] && check "AGENTS.md (universal)" "ok" || check "AGENTS.md" "MISSING"

echo ""
echo "=== Layer 2: Git Hooks ==="
[[ -x .git/hooks/pre-commit ]] && check "Git pre-commit hook" "ok" || check "Git pre-commit hook" "NOT INSTALLED — run: bash scripts/install-git-hooks.sh"

echo ""
echo "=== Layer 3: Claude Code Hooks (if using Claude Code) ==="
HOOK_COUNT=$(grep -c '"command".*hooks' .claude/settings.json 2>/dev/null || echo "0")
[[ "$HOOK_COUNT" -ge 7 ]] && check "Claude Code hooks registered ($HOOK_COUNT)" "ok" || check "Claude Code hooks" "Only $HOOK_COUNT of 7 registered"
for hook in playbook-gate git-protection secret-scan auto-lint subagent-suggest playbook-reminder completion-gate; do
    [[ -x .claude/hooks/$hook.sh ]] && check "  $hook.sh (executable)" "ok" || check "  $hook.sh" "NOT EXECUTABLE — run: chmod +x .claude/hooks/*.sh"
done

echo ""
echo "=== Layer 4: Dependencies ==="
command -v jq >/dev/null && check "jq installed" "ok" || check "jq" "NOT INSTALLED — brew install jq (macOS) or apt install jq (Linux)"
command -v npx >/dev/null && check "npx available" "ok" || check "npx" "NOT AVAILABLE — install Node.js"
[[ -d node_modules ]] && check "node_modules installed" "ok" || check "node_modules" "NOT INSTALLED — run: npm install"

echo ""
echo "=== Layer 5: Playbook Files ==="
[[ -f .claude/agent-playbook.md ]] && check "Agent playbook" "ok" || check "Agent playbook" "MISSING"
[[ -f .claude/quick-reference.md ]] && check "Quick reference card" "ok" || check "Quick reference" "MISSING"
[[ -f .claude/compliance-log.md ]] && check "Compliance log" "ok" || check "Compliance log" "MISSING"
[[ -f .claude/WIP.md ]] && check "WIP board" "ok" || check "WIP board" "MISSING"
[[ -d .claude/agents ]] && check "Subagent definitions" "ok" || check "Subagent definitions" "MISSING"
[[ -d .claude/rules ]] && check "Domain rules" "ok" || check "Domain rules" "MISSING"
[[ -d tests/agent-evals ]] && check "Agent eval tests" "ok" || check "Agent eval tests" "MISSING"

echo ""
echo "=== Layer 6: PR Template ==="
[[ -f .github/pull_request_template.md ]] && check "PR template" "ok" || check "PR template" "MISSING — pull latest dev"

echo ""
echo "═══════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
if [[ $FAIL -eq 0 ]]; then
    echo "  ✅ All enforcement mechanisms active!"
else
    echo "  ❌ Fix the items above for full enforcement"
    echo ""
    echo "  Quick fix:"
    echo "    git pull origin dev              # Get latest configs"
    echo "    npm install                      # Install dependencies"
    echo "    chmod +x .claude/hooks/*.sh      # Make hooks executable"
    echo "    bash scripts/install-git-hooks.sh # Install git pre-commit hook"
    [[ ! $(command -v jq) ]] && echo "    brew install jq                  # Install jq (macOS)"
fi
echo "═══════════════════════════════════════════════"

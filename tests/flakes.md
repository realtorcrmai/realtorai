# Flake Registry

> Track intermittent test failures. Flakes are defects — quarantine within 24h, fix within 7 days.

| Date | Test ID | File | Symptoms | Root Cause | Fix | Status |
|------|---------|------|----------|-----------|-----|--------|
| — | — | — | No flakes recorded yet | — | — | — |

## Process

1. **Detect:** CI flags a test that fails non-deterministically (passes on retry)
2. **Quarantine:** Move to `tests/quarantine/` within 24h. Add entry here.
3. **Diagnose:** Run 10x in isolation. Check for: timing dependencies, shared state, DB pollution, external service delays
4. **Fix:** Address root cause. Never add retries as a first fix.
5. **Restore:** Move back from quarantine. Verify 10/10 green.
6. **Close:** Update status to "fixed" with date.

## Flake budget

Target: <1% flake rate (flaky runs / total runs over 30 days).
Current: 0% (no flakes tracked).

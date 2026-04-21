# Performing a Test Audit

## Purpose

A test audit validates that the test suite accurately reflects the system's requirements. Run quarterly, after major feature launches, or when escape rate increases.

---

## Step 1: Load the RTM

Open `docs/testing/rtm.md` and import the current state:
- Total REQ-IDs
- Total TC-IDs
- Coverage status per requirement

---

## Step 2: Scan Test Files for REQ-ID Annotations

Run a scan across all test files to extract REQ-ID references:

```bash
# Find all REQ-ID references in test files
grep -rn "REQ-" tests/ --include="*.test.*" --include="*.spec.*" | \
  grep -oP "REQ-[A-Z]+-\d+" | sort -u > /tmp/test-req-ids.txt

# Find all REQ-IDs in RTM
grep -oP "REQ-[A-Z]+-\d+" docs/testing/rtm.md | sort -u > /tmp/rtm-req-ids.txt
```

---

## Step 3: Diff — Find Gaps and Orphans

### Gaps: Requirements without tests

```bash
# REQ-IDs in RTM that have no test implementation
comm -23 /tmp/rtm-req-ids.txt /tmp/test-req-ids.txt
```

Each gap is a **coverage hole** — a requirement the test suite does not verify.

### Orphan tests: Tests without requirements

```bash
# REQ-IDs in tests that are not in RTM
comm -13 /tmp/rtm-req-ids.txt /tmp/test-req-ids.txt
```

Each orphan is either:
- A test that needs a corresponding RTM entry (add it)
- A test for deleted functionality (remove it, log in `tests/removed-tests.md`)

### Tests without any REQ-ID

```bash
# Test files with no REQ- annotation
for f in $(find tests/ -name "*.test.*" -o -name "*.spec.*"); do
  if ! grep -q "REQ-" "$f"; then
    echo "NO REQ-ID: $f"
  fi
done
```

These violate Absolute Rule #1 and must be annotated or removed.

---

## Step 4: Check Pyramid Ratio

Count tests by layer:

```bash
L0=$(find tests/ -path "*/static/*" -name "*.test.*" | wc -l)
L1=$(find tests/ -path "*/unit/*" -name "*.test.*" | wc -l)
L2=$(find tests/ -path "*/components/*" -name "*.test.*" | wc -l)
L3=$(find tests/ -path "*/contract/*" -name "*.test.*" | wc -l)
L4=$(find tests/ -path "*/integration/*" -name "*.test.*" | wc -l)
L5=$(find tests/ -path "*/e2e/*" -name "*.spec.*" | wc -l)
L6=$(find tests/ -path "*/a11y/*" -path "*/visual/*" -name "*.spec.*" | wc -l)
L7=$(find tests/ -path "*/resilience/*" -name "*.test.*" | wc -l)
L8=$(find tests/ -path "*/load/*" -name "*.js" | wc -l)
```

**Target ratio:** L0-L1: 70% | L2-L4: 20% | L5-L9: 10%

If the ratio is inverted (more E2E than unit tests), flag as a structural problem.

---

## Step 5: Check Flake Rate

Review `tests/flakes.md`:
- How many flakes in the audit period?
- How many are still in quarantine (unresolved)?
- What's the flake rate? (flaky runs / total CI runs)

**Target:** < 1% flake rate

**Red flags:**
- Same test flaking repeatedly (root cause not addressed)
- Flakes in quarantine > 30 days (abandoned)
- Flake rate trending upward

---

## Step 6: Check Mutation Score

Run Stryker on core modules:

```bash
npx stryker run --mutate "src/lib/**/*.ts"
```

**Target:** > 80% mutation score on `src/lib/`

**Interpretation:**
- High mutation score = tests are specific and catch real bugs
- Low mutation score = tests pass regardless of code changes (weak assertions)
- Focus on modules with < 60% as priority fixes

---

## Step 7: Check Test Execution Time

Review CI logs for timing:

| Gate | Target | Actual |
|------|--------|--------|
| G0 (pre-commit) | < 30s | ? |
| G1 (PR) | < 5min | ? |
| G2 (merge) | < 15min | ? |

**Red flags:**
- G0 > 60s (developers will skip pre-commit hooks)
- G1 > 10min (slow feedback loop)
- Individual test > 30s (likely integration/E2E that could be unit)

---

## Step 8: Produce Audit Report

### Template:

```markdown
# Test Audit Report — {date}

## Summary
- **RTM Requirements:** {count}
- **Requirements covered:** {count} ({percentage}%)
- **Requirements uncovered (gaps):** {count}
- **Orphan tests:** {count}
- **Tests without REQ-ID:** {count}

## Pyramid Ratio
- L0-L1 (unit): {count} ({percentage}%)
- L2-L4 (integration): {count} ({percentage}%)
- L5-L9 (system): {count} ({percentage}%)
- **Status:** {Healthy / Inverted / Skewed}

## Flake Health
- **Flakes this period:** {count}
- **Currently quarantined:** {count}
- **Flake rate:** {percentage}%
- **Status:** {Healthy / Warning / Critical}

## Mutation Score
- **Overall:** {percentage}%
- **Lowest module:** {module} at {percentage}%
- **Status:** {Healthy / Below threshold}

## Execution Time
- G0: {time} ({status})
- G1: {time} ({status})
- G2: {time} ({status})

## Top Priority Actions
1. {action — gap to fill}
2. {action — orphan to resolve}
3. {action — flake to fix}
4. {action — mutation score to improve}

## Domain Coverage Breakdown
| Domain | REQ Count | Covered | Gaps |
|--------|-----------|---------|------|
| Auth | {n} | {n} | {n} |
| Contacts | {n} | {n} | {n} |
| Listings | {n} | {n} | {n} |
| Showings | {n} | {n} | {n} |
| Workflow | {n} | {n} | {n} |
| Newsletters | {n} | {n} | {n} |
| Content/AI | {n} | {n} | {n} |
| Calendar | {n} | {n} | {n} |
```

**File location:** `docs/testing/audits/{date}-audit.md`

---

## Audit Cadence

| Trigger | Scope |
|---------|-------|
| Quarterly (scheduled) | Full audit — all steps |
| After major feature launch | Domain-specific — steps 1-3 for that domain |
| After P0/P1 incident | Targeted — check if the gap exists elsewhere |
| Flake rate > 3% | Flake-focused — steps 5 + remediation |
| New team member onboard | Read-only — familiarize with coverage state |

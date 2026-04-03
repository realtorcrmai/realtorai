# Contributing to Realtors360 CRM

## Git Workflow

Both `dev` and `main` are **protected branches**. No direct pushes allowed. All changes go through pull requests.

```
feature branch  ──PR──→  dev (integration)  ──PR──→  main (production)
hotfix branch   ──PR──→  main (urgent fix)  ──merge──→  dev (sync back)
```

---

## Branch Types

### 1. Feature Branches (new work)

**Branch from:** `dev`
**PR to:** `dev`
**When:** New features, enhancements, non-urgent bug fixes

```bash
# 1. Start from latest dev
git checkout dev && git pull origin dev

# 2. Create feature branch
git checkout -b <your-name>/<short-description>
# Examples: rahul/voice-agent-tts, claude/playbook-fix

# 3. Work, commit, push
git add <files>
git commit -m "feat: description of change"
git push origin <your-name>/<short-description>

# 4. Create PR to dev
gh pr create --base dev

# 5. Merge (no approval needed for dev), then clean up
git checkout dev && git pull origin dev
git branch -d <your-name>/<short-description>
```

### 2. Hotfix Branches (production bugs)

**Branch from:** `main`
**PR to:** `main`
**When:** Bugs found on production that need immediate fixing

```bash
# 1. Start from latest main
git checkout main && git pull origin main

# 2. Create hotfix branch
git checkout -b hotfix/<short-description>
# Examples: hotfix/bcryptjs-missing, hotfix/auth-redirect-loop

# 3. Fix the issue, commit, push
git add <files>
git commit -m "fix: description of fix"
git push origin hotfix/<short-description>

# 4. Create PR to main
gh pr create --base main

# 5. After merge — SYNC BACK TO DEV (critical!)
git checkout dev && git pull origin dev
git merge main
git push origin dev
```

### 3. Release Branches (dev → main)

**When:** Dev is stable and ready for production

```bash
# Create PR from dev to main
gh pr create --base main --head dev --title "Release: dev → main sync"

# After merge — pull main locally
git checkout main && git pull origin main
```

---

## Decision Flowchart: Where Do I Fix This?

```
Found a bug?
│
├─ Is it broken on production (main)?
│  │
│  ├─ YES, urgent → Hotfix branch from main
│  │                 PR → main
│  │                 Then merge main → dev
│  │
│  └─ YES, not urgent → Feature branch from dev
│                        PR → dev
│                        Fix ships with next release
│
├─ Is it only on dev (not yet in main)?
│  │
│  └─ Feature branch from dev → PR → dev
│
└─ Is it only on a feature branch?
   │
   └─ Fix it on that feature branch
```

## Why This Matters

| Scenario | Wrong approach | Problem | Right approach |
|----------|---------------|---------|----------------|
| Bug on main | Fix on dev, merge dev→main | Drags unreleased features into production | Hotfix from main, sync back to dev |
| Bug on main | Fix directly on main | Branch is protected, push rejected | Hotfix branch, PR to main |
| New feature | Branch from main | Missing dev-only changes, merge conflicts | Branch from dev |
| After hotfix | Forget to sync dev | Dev diverges, future merges break | Always merge main→dev after hotfix |

---

## CI Enforcement

The CI pipeline (`ci.yml`) automatically enforces branch policy on every PR:

- **PRs to main** — only allowed from `dev` or `hotfix/*` branches
- **PRs to dev** — blocked from `hotfix/*` branches (those must go to main)
- **Feature branches to main** — CI fails with clear error message

If CI blocks your PR, check the branch policy rules above.

---

## Branch Naming

| Type | Pattern | Examples |
|------|---------|----------|
| Feature | `<name>/<description>` | `rahul/voice-agent-tts`, `claude/playbook-fix` |
| Hotfix | `hotfix/<description>` | `hotfix/bcryptjs-missing`, `hotfix/auth-loop` |
| Release | PR from `dev` to `main` | No branch needed — use PR |

## Branch Protection Rules

| Branch | PR Required | Approvals Needed | Who Can Merge |
|--------|-------------|-----------------|---------------|
| `dev` | Yes | 0 (self-merge) | Any contributor |
| `main` | Yes | 1 approval | After review |

---

## Pre-Merge Checklist

Before merging ANY PR:

- [ ] `npm run build` passes (no TypeScript errors)
- [ ] `bash scripts/test-suite.sh` passes (73+ tests)
- [ ] No missing dependencies (`npm install` runs clean)
- [ ] No hardcoded secrets or API keys
- [ ] CLAUDE.md updated if new files/tables added

---

## Development Setup

```bash
# Install dependencies
npm install

# Start CRM dev server
npm run dev                          # → localhost:3000

# Start voice agent (separate terminal)
python3 voice_agent/server/main.py   # → localhost:8768

# Run tests
bash scripts/test-suite.sh           # 73+ functional tests
bash scripts/health-check.sh         # Environment check
```

## Code Standards

- **TypeScript** for all frontend/API code
- Use `lf-*` CSS classes (Realtors360 design system)
- Server Actions for mutations (`src/actions/`)
- API routes for GETs and webhooks (`src/app/api/`)
- Zod v4 for all validation

## Agent Playbook

If you're an AI developer (Claude, etc.), follow `.claude/agent-playbook.md` for every task. It covers task classification, execution checklists, and compliance logging.

## Questions?

Check `CLAUDE.md` for full project documentation, or ask in the team channel.

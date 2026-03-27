# Contributing to ListingFlow CRM

## Git Workflow

Both `dev` and `main` are **protected branches**. No direct pushes allowed. All changes go through pull requests.

```
your feature branch  ──PR──→  dev (integration)  ──PR──→  main (production)
```

### Quick Start

```bash
# 1. Start from latest dev
git checkout dev
git pull origin dev

# 2. Create your feature branch
git checkout -b <your-name>/<short-description>
# Examples:
#   rahul/voice-agent-tts
#   alex/contact-export
#   claude/playbook-fix

# 3. Work and commit as usual
git add <files>
git commit -m "feat: description of change"

# 4. Push your branch
git push origin <your-name>/<short-description>

# 5. Create a PR to dev
gh pr create --base dev
# Or use the GitHub link printed after push

# 6. Merge your own PR on GitHub (no approval needed for dev)

# 7. Clean up
git checkout dev
git pull origin dev
git branch -d <your-name>/<short-description>
```

### Branch Naming

Use `<developer-name>/<description>` format:

| Good | Bad |
|------|-----|
| `rahul/voice-agent-tts` | `feature-123` |
| `alex/fix-contact-delete` | `bugfix` |
| `claude/playbook-enforcement` | `dev2` |

### Branch Protection Rules

| Branch | PR Required | Approvals Needed | Who Can Merge |
|--------|-------------|-----------------|---------------|
| `dev` | Yes | 0 (self-merge) | Any contributor |
| `main` | Yes | 1 approval | After review |

### What Happens If You Push Directly

If you try `git push origin dev`, you'll see:

```
remote: error: GH006: Protected branch update failed for refs/heads/dev.
remote: error: Changes must be made through a pull request.
```

This is intentional. Create a feature branch and PR instead.

## PR Requirements

Every PR to `dev` should include:

1. **Clear title** describing the change
2. **What changed** and why (in the PR body)
3. **Test results** if code was modified

For production releases (`dev` → `main`), also include:
- List of features/fixes included
- Test plan with checkboxes

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
- **Python** for voice agent (`voice_agent/server/`)
- Use `lf-*` CSS classes (ListingFlow design system)
- Server Actions for mutations (`src/actions/`)
- API routes for GETs and webhooks (`src/app/api/`)
- Zod v4 for all validation

## Agent Playbook

If you're an AI developer (Claude, etc.), follow `.claude/agent-playbook.md` for every task. It covers task classification, execution checklists, and compliance logging.

## Questions?

Check `CLAUDE.md` for full project documentation, or ask in the team channel.

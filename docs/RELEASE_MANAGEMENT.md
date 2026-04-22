<!-- docs-audit: .github/workflows/g4-release.yml -->

# Release Management

**Last reviewed:** 2026-04-21

---

## Versioning scheme

**SemVer:** `MAJOR.MINOR.PATCH`

- **MAJOR** — breaking changes (API, DB schema incompatible, auth flow change)
- **MINOR** — new features (new pages, new integrations, new task types)
- **PATCH** — bug fixes, dependency updates, doc changes

Current version: **0.x** (pre-production). First production release = **1.0.0**.

---

## Release flow

```
dev (integration) → PR → main (production)
                         ↓
                    Tag: v1.2.3
                    GitHub Release with notes
```

### Steps

1. **Create release PR:** `dev → main`
2. **G4-release workflow runs:** typecheck, lint, prettier, npm audit, unit tests, integration tests, E2E (4 shards), a11y, resilience, load, RTM strict
3. **Review:** 1 approval required (main is protected)
4. **Merge:** Creates the production deployment
5. **Tag:** `git tag v1.2.3 && git push origin v1.2.3`
6. **Release notes:** `gh release create v1.2.3 --generate-notes`

---

## Release notes template

```markdown
## v1.2.3 — <release title>

### New features
- 

### Improvements
- 

### Bug fixes
- 

### Breaking changes
- None

### Dependencies
- Updated: <list>
- Added: <list>
- Removed: <list>

### Migration required
- [ ] Migration NNN: <description>
```

---

## Deployment windows

| Window | When | What |
|--------|------|------|
| **Normal** | Mon–Thu, 9am–4pm PT | Any release |
| **Restricted** | Friday afternoon, weekends | Bug fixes only |
| **Frozen** | During incidents, holidays | No deploys |

---

## Rollback

If a release causes issues:

1. **Revert merge commit:** `git revert <merge-sha>` → push to main → auto-deploys
2. **If DB migration was applied:** Check `docs/DR_RUNBOOK.md` for PITR restore
3. **Notify users** if service was degraded

---

## Status

- [x] SemVer scheme defined
- [x] G4-release workflow exists with comprehensive checks
- [ ] First production release tagged
- [ ] Release notes automation configured
- [ ] Deployment windows enforced (currently manual discipline)

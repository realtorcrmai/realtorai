<!-- docs-audit: src/lib/features.ts -->

# Feature Flag Governance

**Review cadence:** Quarterly cleanup
**Last reviewed:** 2026-04-21

---

## Naming convention

```
FLAG_<DOMAIN>_<FEATURE>
```

Examples: `FLAG_NEWSLETTER_AI_AGENT`, `FLAG_PROCESS_WORKFLOWS`, `FLAG_CONTACT_IMPORT`

## Flag schema

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | `FLAG_<DOMAIN>_<FEATURE>` format |
| Owner | Yes | Who decides when to enable/disable |
| Created | Yes | Date flag was introduced |
| Sunset date | Yes | When the flag should be removed (max 90 days) |
| Status | Yes | `off` / `on` / `deprecated` |
| Location | Yes | Where the flag is checked (env var, DB, code) |

## Current flags

| Flag | Owner | Created | Sunset | Status | Location |
|------|-------|---------|--------|--------|----------|
| `FLAG_PROCESS_WORKFLOWS` | Rahul | 2026-03 | — | on (Render) | Render env var |
| Newsletter feature flags (7) | Rahul | 2026-03 | — | all on (Render) | Render env vars |

## Quarterly cleanup process

1. List all flags: `grep -r "FLAG_\|feature_flag\|isEnabled" src/ --include="*.ts" --include="*.tsx"`
2. For each flag past sunset date: remove the flag, keep the "on" code path, delete the "off" path
3. Update this doc
4. Create PR with cleanup

# Gap Analysis Registry

> Master index of all versioned gap analyses. Each module has its own directory with sequential versions and a changelog.

## Naming Convention

```
docs/gap-analysis/
  {module-name}/
    v{N}_{YYYY-MM-DD}.md    # Sequential version + date
    CHANGELOG.md             # Delta log between versions
```

## Rules for Creating/Updating Analyses

1. **Always read the latest version first** before producing a new one
2. **Produce a delta section** — what changed since last version and why
3. **Flag conflicts** — if a gap was "done" in vN but "not done" in vN+1, explain why (regression? re-scoped? PRD changed?)
4. **Never silently contradict** a previous analysis — every change needs a reason
5. **Reference the PRD** — every gap must trace back to a specific PRD requirement
6. **Snapshot, not opinion** — record what IS, not what should be. Leave recommendations for workplans.
7. **Core mechanism changes** — if the architecture changed (e.g., switched from SQLite to Supabase), note it in the delta section as a foundational shift that may invalidate prior gap items

## Version Triggers

Create a new version when:
- Significant code has been shipped since the last analysis
- A PRD has been updated or a new PRD added
- User explicitly requests a gap analysis
- A quarterly review is due

Do NOT create a new version for:
- Minor bug fixes that don't change gap status
- Documentation-only changes
- Cosmetic UI tweaks

## Module Registry

| Module | Latest Version | Date | Completion | PRD Reference |
|--------|---------------|------|------------|---------------|
| [Voice Agent](voice-agent/) | v1 | 2026-03-31 | ~25-30% | `docs/PRD_Voice_Agent_Complete.md`, `docs/PRD_Multi_Tenant_Voice_Agent_External_Assistants.md` |
| [Onboarding](onboarding/) | v1 | 2026-04-10 | ~25% | `docs/PRD_Signup_Verification_Onboarding.md`, `docs/SPEC_Realtor_Onboarding_v2.md` |

# Agent Playbook v7 — ListingFlow CRM

> v7.2 | 2026-03-29 | Final version after 3-pass refinement (v4 1,849 lines → v7.2 ~480 lines)
>
> **Authority:** CLAUDE.md = project facts (tech stack, schema, file paths). Playbook = process rules. On conflict: playbook wins for process, CLAUDE.md wins for tech details.
>
> **PRD template:** `docs/templates/PRD_TEMPLATE.md` — referenced, not inlined.
> **Future infrastructure:** `docs/ROADMAP_Agent_Infrastructure.md` — evals, telemetry, sunset policies.

---

## 1. Hard Constraints — Read First

These apply to every task, every tier, every time.

**Code:**
- **NEVER** use `any` type — define proper TypeScript types
- **NEVER** use inline styles — use `lf-*` design system classes from `globals.css`
- **NEVER** create API routes for mutations — use server actions in `src/actions/`
- **NEVER** skip RLS on new tables — `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` required

**Data & Compliance:**
- **NEVER** send outbound messages without checking `consent_status` first (CASL)
- **NEVER** modify `seller_identities` non-nullable fields (FINTRAC: `full_name`, `dob`, `citizenship`, `id_type`, `id_number`, `id_expiry`)
- **NEVER** commit `.env.local` or hardcode API keys — use `scripts/vault.sh`
- **NEVER** send PII to AI prompts: no phone/email, no FINTRAC data, no tokens, no `seller_identities` fields

**Git:**
- **NEVER** push directly to `dev` or `main` — always feature branch → PR → merge
- Branch from `dev`, PR back to `dev`, merge your own PR (0 approvals)
- Release: PR `dev` → `main` (1 approval required)
- Delete feature branches after merge
- Merge conflicts: later PR resolves. Rebase, don't merge. Test after resolving.

**Destructive:**
- **NEVER** run `rm -rf /`, `rm -rf ~`, `git push --force origin main`, `DROP DATABASE`, `sudo`, `curl | bash`, `chmod 777`

**When to ask instead of act:**
- If unsure whether a request violates FINTRAC/CASL → ask the user
- If a task seems to require changes outside your classified scope → ask before expanding
- If you need to make a destructive change (DROP, DELETE, force-push) → ask first
- If you don't understand the request after reading it twice → ask one clarifying question

---

## 2. Classify Every Task

Before any mutation (Edit/Write/Bash), output:

```
Tier: micro | small | medium | large
Type: CODING:feature | CODING:bugfix | CODING:refactor | CODING:migration | TESTING | DESIGN | DEPLOY | INFO | VOICE_AGENT
Affected: [files, tables, APIs]
```

Read/Grep/Glob are allowed before classification.

### 2.1 Task Tiers

| Tier | When | Before Coding | After Coding |
|------|------|--------------|--------------|
| **Micro** | ≤20 lines, 1-2 files, no schema, no new route | Classify | `tsc --noEmit` → Commit |
| **Small** | 20-100 lines, 2-5 files, no new tables | Classify → Scope | `tsc --noEmit` → Targeted tests → Commit |
| **Medium** | 100-500 lines, 5-15 files, may have migration | Classify → Scope → Plan | `tsc --noEmit` → `test-suite.sh` → Docs → Commit → Compliance log |
| **Large** | 500+ lines, 15+ files, new tables/subsystem | PRD → **User Review** → Classify → Scope → Plan | `tsc --noEmit` → `test-suite.sh` → Full docs → Commit → Compliance log |

- **If unsure** → classify one tier higher
- **If the task grows beyond your tier** → STOP, re-classify, backfill missing ceremony
- **INFO tasks** → 1-line classification only. No compliance log. No mutations.

### 2.2 PRD Triggers (Large tier only)

New database table(s), new page route + subsystem (3+ files in new directory), new external integration (OAuth, API), or product owner requests it. Template: `docs/templates/PRD_TEMPLATE.md`.

**User review is mandatory before implementation.** After writing the PRD, present it to the user and wait for explicit approval. Do NOT proceed to Classify/Scope/Code until the user says to go ahead. If the user requests changes to the PRD, update it and re-present.

### 2.3 PR Description (all tiers with PRs)

Every PR to `dev` must include:
- Classification block (Tier, Type, Affected)
- What changed (1-3 bullets)
- Test results (`tsc` clean, test-suite pass count if run)
- For Medium+: link to compliance log entry

---

## 3. Scope & Plan

### 3.1 Pre-Flight (Medium+ tiers only)

```bash
bash scripts/health-check.sh          # Fix ❌ ONLY if related to your task. Report unrelated failures.
git checkout dev && git pull origin dev
git checkout -b <developer>/<feature>
```

If another developer is touching the same files → coordinate first (`git log --oneline -5 -- <file>`).

### 3.2 Scope (Small+ tiers)

One paragraph listing:
- Files to create and modify
- DB tables affected (new columns? new tables? constraints?)
- API routes and UI components affected
- Overlap check: grep codebase for similar existing features
- New packages needed? Justify: is there an existing alternative in the codebase?

### 3.3 Context Loading (Small+ tiers)

- Read relevant existing files from scope
- Read `src/types/database.ts` if touching schema
- Summarize current behavior in 3-5 bullets BEFORE modifying

### 3.4 Downside Check (Small+ tiers)

Before planning your implementation, assess what could go wrong WITH the fix itself.

**Risk Questions (Small+ — answer all 3):**

| # | Question | What It Catches |
|---|----------|----------------|
| 1 | **What do we lose or break for others?** Existing behavior, data, capability removed? Other code paths or integrations that consume what we're changing? | Deleted code that was needed, breaking consumers |
| 2 | **What happens if we're wrong? Can we undo it?** Blast radius if our assumption is incorrect? Can the system end up in an inconsistent state if this partially applies? | Irreversible mistakes, partial failure corruption |
| 3 | **What unverified assumptions does this embed?** Are we treating a symptom instead of root cause? Are we assuming something about the system we haven't confirmed by reading the code? | Misdiagnosis, theory-based fixes that don't hold |

**Overhead Questions (Medium+ — answer both):**

| # | Question | What It Catches |
|---|----------|----------------|
| 4 | **What gets harder to debug, test, or maintain?** Does this add complexity, hidden state, or generic errors that obscure problems? | Try/catch hiding bugs, state files going stale, new learning curve |
| 5 | **What edge cases does this create?** Does the fix work for the common case but fail for unusual inputs, timing, or environments? | Rate limits blocking tests, Safari/iOS incompatible, mobile broken |

**Rules:**
- "N/A" is a valid answer. "Didn't check" is not.
- For **Small**: answer Q1-Q3 (1 sentence each). If all N/A, say so and move on.
- For **Medium**: answer Q1-Q5. Flag any serious concerns in your plan.
- For **Large**: answer Q1-Q5 + write a mitigation for each non-N/A answer. **Present downsides to user before coding.** Do not proceed until user acknowledges.

### 3.5 Plan (Medium+ tiers)

3-7 numbered steps: entry points → data flow → new types/functions → error handling.
If complex (5+ files or schema change) → present plan to user before coding.

---

## 4. Execution Patterns

### 4.1 Add a New Page

1. Create route: `src/app/(dashboard)/[name]/page.tsx`
2. Add `export const dynamic = 'force-dynamic'` if page needs real-time data
3. Use `lf-glass` header, `lf-card` for sections, emoji icons (not Lucide on pages)
4. Add ARIA labels to interactive elements. Use design system colors (pre-tested for contrast).
5. Link from navigation
6. Verify: page loads, no TS errors, responsive on mobile

### 4.2 Add a Server Action

1. Create or extend file in `src/actions/[domain].ts`
2. Define Zod v4 schema for inputs (use `.min(1)` not `.nonempty()`)
3. Use `supabaseAdmin` for database operations (server-side, bypasses RLS)
4. Call `revalidatePath('/affected-route')` after mutations
5. Return typed response — never throw, return `{ error: string }` objects
6. Verify: action callable, data persists, path revalidated

**Common mistakes:** Forgetting `revalidatePath` (UI shows stale data). Using `supabase` client instead of `supabaseAdmin` on server (fails silently due to RLS). Throwing errors instead of returning them (breaks error UI).

### 4.3 Add a Database Table

1. **NEVER modify a migration file that has already been applied.** Always create a new migration.
2. Create migration: `supabase/migrations/[next_number]_[name].sql`
   - Check highest number: `ls supabase/migrations/ | tail -5` (note: 050-053 have duplicates)
2. Include RLS: `ALTER TABLE x ENABLE ROW LEVEL SECURITY; CREATE POLICY x ON table FOR ALL USING (true);`
3. Include constraints: FK, NOT NULL, CHECK, UNIQUE. Use JSONB for flexible data.
4. Add indexes: every FK column, every status/type column used for filtering, every column in WHERE/JOIN queries.
5. Idempotency: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`
6. Update `src/types/database.ts` with new table types
7. Create server action for CRUD in `src/actions/`
8. For destructive migrations: write rollback SQL at `supabase/rollbacks/[same_number]_rollback.sql` in the same commit
9. Execute one at a time, verify each before running next

### 4.4 Add a GET API Route (webhooks, polling, data endpoints)

1. Create route: `src/app/api/[domain]/route.ts`
2. Export `GET` handler (or `POST` for webhooks only)
3. Validate query params with Zod. Validate webhook signatures (svix for Resend, `validateRequest` for Twilio).
4. Use `supabaseAdmin` for data access
5. Return proper status codes: 200 (success), 400 (bad input), 401 (unauthorized), 500 (error)
6. Wrap in try/catch — return JSON error, never unhandled exceptions
7. For cron endpoints: require `Authorization: Bearer $CRON_SECRET` header

**Common mistakes:** Missing webhook signature validation (security hole). Returning HTML instead of JSON. Not handling the `OPTIONS` method for CORS.

### 4.5 Add/Modify a Component

1. Use `lf-*` CSS classes — no inline styles
2. Emoji icons on pages, Lucide only inside reusable `src/components/ui/` primitives
3. Handle loading, error, and empty states
4. Add ARIA labels to buttons, inputs, and modals. Use design system colors for contrast.
5. Path alias: `@/` maps to `src/`
6. Verify: renders correctly, handles edge cases (null data, empty arrays)

---

## 5. Analysis & Design Tasks (3-Pass Process)

Every gap analysis, design document, PRD, or major analysis MUST go through 3 iterative passes. Never present a single-pass output as final.

### 5.1 When to Use 3-Pass

- Gap analysis of any system or codebase
- PRD for a new feature (Large tier)
- Architecture or design spec
- Audit or review document
- Any document that will drive implementation decisions

Does NOT apply to: INFO tasks, simple code changes, bug fixes.

### 5.2 The 3 Passes

**Pass 1 — Analyze and find gaps yourself**
- Read the subject thoroughly (every file, every line)
- Document all findings with file:line references
- Categorize by severity (Critical/High/Medium/Low)
- Fix what you found. Update the document.

**Pass 2 — Compare with best practices, find what Pass 1 missed**
- Re-read the Pass 1 output with fresh eyes
- Compare against best-in-market implementations and industry practices
- Verify Pass 1 findings (confirm or reject with evidence)
- Find new gaps that Pass 1 missed
- Fix what you found. Update the document.

**Pass 3 — Final read, final gap check, produce final version**
- Re-read the Pass 2 output
- Find any remaining gaps
- Apply final fixes
- Mark as final with pass count in the header

### 5.3 Rules

- Each pass MUST read the output of the previous pass — not just rubber-stamp it
- Passes are sequential — each builds on the previous
- Present the final version only after all 3 passes complete
- Note the pass count in the document header (e.g., "3-pass iterative analysis")
- For Pass 2, use model chaining when possible: different model or agent for the review to get a fresh perspective

---

## 6. Validation

### 5.1 Per-Tier Checklist

| Tier | What to Run |
|------|-------------|
| Micro | `npx tsc --noEmit` |
| Small | `npx tsc --noEmit` + targeted tests for changed functions |
| Medium | `npx tsc --noEmit` + `bash scripts/test-suite.sh` + document results |
| Large | Everything above + e2e walkthrough + Test Report in PR |

### 5.2 "Done" Means

| Change Type | Done When |
|-------------|-----------|
| Server action | Validates input with Zod, calls `revalidatePath`, handles Supabase error case |
| API route | Returns proper status codes, validates auth, has try/catch |
| UI component | Builds, uses `lf-*` classes, handles loading/error/empty states |
| Migration | Idempotent, has RLS, has indexes, constraints enforced, types updated |
| Page | Has `force-dynamic` if live data, linked from nav, renders correctly, accessible |

### 5.3 Self-Healing (When Validation Fails)

```
Max 3 retries per error, 5 total:

1. CAPTURE — Read the FULL error (stack trace, file:line)
2. DIAGNOSE — Form hypothesis in ONE sentence
3. SCOPE CHECK — Is the fix within your task? NO → HALT, report as pre-existing
4. REVERT if previous fix made things worse: git checkout -- <file>
5. FIX — Minimal change for the hypothesis only
6. RE-VALIDATE — Run the same check
   PASS → continue | SAME ERROR → new hypothesis, back to 1 | NEW ERROR → diagnose it

After 3 fails on same error → HALT.
```

**When halting, include:** error message, hypotheses tried, files touched, whether to commit partial work or revert.

**Never:** suppress tests (`.skip()`, delete), cast to `any`, add `@ts-ignore`, retry without a new hypothesis, broaden types to hide mismatches.

### 5.4 Error Recovery Decision Tree

**Common (90% of errors):**
```
TypeScript error          → Fix the type. Check src/types/database.ts matches schema.
Module not found          → Check import uses @/ alias. Check file exists.
Supabase returns null     → Check RLS policy. Use supabaseAdmin for server-side.
Action not updating UI    → Check revalidatePath matches the page route.
Styling looks wrong       → Check globals.css for lf-* class. Don't invent new classes.
Build fails               → Read full error. Fix source — never skip the build step.
Test fails                → Fix the code, not the test. If test is wrong, explain why before changing.
```

**Less common:**
```
Migration fails           → Check SQL syntax. Check table/column exists. Check constraints.
Webhook signature invalid → Check secret matches env var. Check header parsing (svix for Resend, validateRequest for Twilio).
Cron returns 401          → Check Authorization: Bearer $CRON_SECRET header.
Hydration mismatch        → Server and client rendering differ. Check for Date, random, or browser-only APIs in SSR.
Resend API error          → Check RESEND_API_KEY. Check from email is verified. Check payload structure.
```

---

## 7. Domain Rules

### 6.1 Contacts
- Phone: E.164 format (+1XXXXXXXXXX). Always use `lib/twilio.ts` formatter.
- `pref_channel`: one of `sms`, `whatsapp`, `email`, `phone`
- `newsletter_intelligence`: JSONB — merge updates, never overwrite the whole field
- CASL: check `consent_status` before any outbound message

### 6.2 Listings
- `current_phase`: integer 1-8, never 0 or 9+. Advancement is sequential — never skip phases.
- `forms_status`: JSONB with keys matching BCREA form codes (DORTS, MLC, PDS, etc.)
- `list_price`: numeric, never store as string
- Kling AI: async — use `useKlingTask` hook, store `task_id` in `media_assets` with `status: 'pending'`

### 6.3 Workflow (8-Phase Listing Lifecycle)
- Phases advance sequentially: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Never skip.
- Phase advancement logic: `src/actions/workflow.ts`
- Phase UI components: `src/components/workflow/Phase[1-8]*.tsx`
- Each advancement logs to audit trail
- Parent listing status NEVER "complete" if any child subtask is incomplete
- Data enrichment (Phase 2) uses external APIs (BC Geocoder, ParcelMap) — handle timeouts gracefully

### 6.4 Showings
- Status flow: `pending` → `confirmed`/`denied` → `completed`/`cancelled`
- On confirm: send lockbox code via seller's `pref_channel`
- Always create `communications` log entry for status changes

### 6.5 Email Engine
- Templates: `src/emails/*.tsx` (React Email)
- Send logic: `src/actions/newsletters.ts`
- Webhooks: `src/app/api/webhooks/resend/route.ts`
- AI generation: `src/lib/newsletter-ai.ts`
- Test with: `node scripts/qa-test-email-engine.mjs`
- CASL: always check consent. Include unsubscribe link. Physical address in footer.

### 6.6 Voice Agent
- Backend: `voice_agent/server/` (Python 3.12+, aiohttp)
- Frontend: `src/components/voice-agent/`
- 4 LLM providers (Anthropic, OpenAI, Groq, Ollama). Fallback chain in config.
- 56 tools, 21 API routes. Dynamic tool selection by keyword.
- Preserve: Edge TTS caching, session focus tracking, context summarization, `_clean_for_voice()`

---

## 8. Session Management

### 7.1 When to Checkpoint

For Medium and Large tasks, commit partial work when:
- You have completed 3+ files successfully but more remain
- You notice you've read more than 8-10 substantial files in this session
- A sub-task is fully done even if the overall task is not

```bash
git add <completed-files>
git commit -m "wip: <task-name> — <what's done so far>"
```

### 7.2 Partial Completion

If you cannot finish a task (blocked, context limit, error):
1. Commit completed work to the feature branch with `wip:` prefix
2. Document what's done and what remains in the commit message
3. Log in compliance (Medium+): note `"partial — blocked by X"`
4. Do NOT leave uncommitted changes in the working tree

### 7.3 Handing Off to Next Session

Include in your final message:
- Branch name and latest commit hash
- What's done vs what remains (numbered list)
- Any blockers or decisions needed
- Files that still need changes

---

## 9. Safety Levels for Bash Commands

**Level 1 — Safe (execute freely):** `cat`, `grep`, `ls`, `find`, `git status/log/diff`, `npx tsc --noEmit`, `bash scripts/test-suite.sh`, `curl -s` (GET only)

**Level 2 — Guarded (execute with safeguards):** `git add/commit/push` (feature branches only), file create/edit (within repo only), `npm install` (only from package.json, never `-g`)

**Level 3 — Dangerous (ask user first):** `rm`, `git push --force`, `git reset --hard`, SQL writes, migration execution, outbound POST/PUT/DELETE, `vault.sh encrypt/decrypt`

**Level 4 — Forbidden (never):** `rm -rf /`, `rm -rf ~`, `git push --force origin main`, `DROP DATABASE`, `sudo`, `curl | bash`, `chmod 777`

---

## 10. Compliance & Governance

### 9.1 Compliance Log (Medium+ tiers only)

Append to `.claude/compliance-log.md` after every Medium or Large task:

```markdown
| Date | Developer | Task Summary | Type | Tier | Phases Completed | Notes |
|------|-----------|-------------|------|------|-----------------|-------|
| 2026-03-29 | claude | Add offer management | CODING:feature | Medium | Classify, Scope, Plan, Implement, Test, Docs | tsc clean, test-suite 73/73 |
```

Micro, Small, and INFO are exempt. Append-only — never edit past entries.

### 9.2 PII in AI Prompts

**Never send:** FINTRAC identity data, contact phone/email, Google tokens, `seller_identities` fields, `.env.local` contents.
**May send:** Contact first name, listing address/price, property details, anonymized engagement data.

### 9.3 Approved Models

| Provider | Models | Use For |
|----------|--------|---------|
| Anthropic | Haiku 4.5, Sonnet 4.6, Opus 4.6 | Default. Haiku for classification, Sonnet for coding, Opus for architecture. |
| OpenAI | GPT-4o | Voice agent fallback only |
| Groq | Llama 3.x | Voice agent low-latency fallback only |
| Ollama | Local models | Dev/testing only, never production |

### 9.4 Human-in-the-Loop

| Risk | Examples | Action |
|------|---------|--------|
| **Critical** | Schema migrations, RLS changes, secret rotation, production deploy | STOP — ask user for explicit approval before executing |
| **High** | AI emails to contacts, bulk operations (>50 rows), new integrations | STOP — describe what will happen, get approval |
| **Medium** | MLS remarks, content prompts, workflow steps | Proceed, flag in PR description: "AI-generated — human review recommended" |
| **Low** | Classification, search, reads, tests, INFO | Proceed autonomously |

---

## 11. Production Incidents

| Step | Action |
|------|--------|
| 1 | Check deployment status (dashboard) |
| 2 | Check Supabase status (supabase.com/dashboard) |
| 3 | Test cron: `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/process-workflows` |
| 4 | Check Resend delivery (resend.com/dashboard) |
| 5 | Rollback: redeploy previous deploy from dashboard |
| 6 | DB restore: Supabase Dashboard → Database → Backups |

**Dev branch broken:** Author fixes or reverts within 3 self-healing cycles. If that fails, revert the merge commit. Never force-push dev.

---

## 12. Secret Rotation

1. Generate new key in provider dashboard
2. `./scripts/vault.sh decrypt` → edit `.env.local` → `./scripts/vault.sh encrypt`
3. Update deployment env vars (dashboard)
4. Update GitHub secrets: `gh secret set KEY_NAME --body "value"`
5. Redeploy
6. Revoke old key in provider dashboard

---

## 13. Worked Examples

### Example A — Micro (CSS fix)

**Task:** "The listing card price text is too small on mobile"

```
Tier: Micro | Type: CODING:bugfix | Affected: src/components/listings/ListingCard.tsx
```

Edit component → add responsive class → `tsc --noEmit` → commit. Done.

### Example B — Small (Add field)

**Task:** "Add a lead_source field to contacts and show it in the form"

```
Tier: Small | Type: CODING:feature
Affected: supabase/migrations/057_add_lead_source.sql, src/types/database.ts, src/components/contacts/ContactForm.tsx
```

**Scope:** New column on existing table. Update type. Add `lf-select` to form. No RLS change.
**Implement:** Migration → Type → Component.
**Validate:** `tsc --noEmit` clean. Test: create contact with lead_source.
**Commit:** `feat: add lead_source field to contacts table and form`

### Example C — Medium (New feature)

**Task:** "Add CSV export for contacts list"

```
Tier: Medium | Type: CODING:feature
Affected: src/app/api/contacts/export/route.ts, src/components/contacts/ExportButton.tsx, src/app/(dashboard)/contacts/page.tsx
```

**Scope:** New GET API route → CSV generation → download. New button on contacts page.
**Plan:** 1. API route with Zod query params → 2. Query via supabaseAdmin → 3. CSV string → 4. Content-Disposition header → 5. ExportButton with `lf-btn` → 6. Add to contacts page
**Validate:** `tsc --noEmit` + `test-suite.sh`. Document in `usecases/contact-export.md`.
**Compliance log:** append entry.

### Example D — Large (New subsystem)

**Task:** "Build offer management system with tracking and notifications"

```
Tier: Large | Type: CODING:feature
Affected: New tables (offers, offer_conditions), new page route, new actions, new components (10+ files)
```

**Step 1 — PRD:** Write `docs/PRD_Offer_Management.md` using `docs/templates/PRD_TEMPLATE.md`. 10 sections.
**Step 2 — User Review (BLOCKING):** Present PRD to user. Wait for explicit approval. Update if changes requested. Do NOT proceed until user says go.
**Step 3 — Classify & Scope:** List all files, tables, routes. Check existing patterns (how listings/showings work).
**Step 4 — Plan:** Present numbered plan to user. Get approval.
**Step 5 — Implement in phases:** Migration first → Types → Server actions → Components → Page → Tests. Checkpoint after each phase (`wip:` commits).
**Step 6 — Validate:** `tsc --noEmit` + `test-suite.sh` + e2e walkthrough. Write Test Report in PR.
**Step 7 — Docs:** Create `usecases/offer-management.md`. Update CLAUDE.md if new tables/routes.
**Step 8 — Compliance log + PR** with full description.

### Example E — Deploy

**Task:** "Deploy latest changes to production"

```
Tier: Medium | Type: DEPLOY
```

1. `bash scripts/health-check.sh` — all green
2. `bash scripts/test-suite.sh` — all pass
3. `npm run build` — clean
4. Check pending migrations → run them one at a time
5. Push to `main` via PR from `dev` (1 approval required)
6. Verify deploy dashboard shows success
7. `bash scripts/save-state.sh`
8. Compliance log entry

---

## 14. Commit Message Convention

Use Conventional Commits format:

| Prefix | When |
|--------|------|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `refactor:` | Code restructuring, no behavior change |
| `docs:` | Documentation only |
| `test:` | Adding or updating tests |
| `chore:` | Build, deps, config changes |

Example: `feat: add lead_source field to contacts table and form`

For WIP commits: `wip: offer-management — migration and types done, components remaining`

---

## 15. References

- **Infrastructure, tech stack, project structure:** See CLAUDE.md
- **PRD template:** `docs/templates/PRD_TEMPLATE.md`
- **Future agent infrastructure (evals, telemetry):** `docs/ROADMAP_Agent_Infrastructure.md`
- **Gap analysis of this playbook:** `docs/GAP_ANALYSIS_Agent_Playbook.md`
- **Test suites:** `scripts/test-suite.sh` (73+), `scripts/eval-*.mjs` (8 suites), `evals.md` (200 cases)
- **E2E tests:** `playwright.config.ts` + `tests/`

---

*Playbook v7.2 — 2026-03-29. Final version after 3-pass iterative refinement. Original: v4 (1,849 lines, 67 gaps). See docs/GAP_ANALYSIS_Agent_Playbook.md.*

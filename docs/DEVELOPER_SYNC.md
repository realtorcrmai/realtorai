<!-- docs-audit-reviewed: 2026-04-21 --task-mgmt -->
<!-- docs-audit: CONTRIBUTING.md, .env.local.example -->
# Developer Sync — Post-Consolidation (2026-04-09)

> If you're a developer whose local setup pre-dates **2026-04-09**, you need to sync. This doc gives you two options: drop a prompt into your own Claude Code session, or run a bash script directly.

---

## What changed on 2026-04-09

On 2026-04-09, three Supabase projects were consolidated into one:

- **Active dev DB:** `qcohfohjihazivkforsj` ("realtyaicontent") — **the only one you should use now**
- **Orphaned (pending deletion):** `ybgiljuclpsuhbmdhust` ("amandhindsa's Project"), `rsfjescdjuubxadfjyxb` ("Realtors360-prod")

The active dev project now has:
- **55+ new tables** added from the two other projects (newsletter v3, sites builder, social studio, voice agent, RAG, OAuth, tenants, help center, property deals, etc.)
- **~519 new contacts** imported from the old `ybgiljuclpsuhbmdhust` project, scoped to a new user `demo-legacy@realestatecrm.com` (UUID `7de22757-dd3a-4a4f-a088-c422746e88d4`)
- **Aman's real account** added (`amandhindsa@outlook.com`)
- **Everything your local was already connected to is preserved** — contacts, offers, open_houses, contact_family_members, tutor_* data, etc. No data loss on your existing rows.

See `docs/ENVIRONMENTS.md` for the full reference.

### ⚠️ Do NOT

- Run `./scripts/vault.sh decrypt` and use those values — **the vault is stale** (last re-encrypted 2026-04-01, points at the old `ybgilju` project)
- Reference `ybgiljuclpsuhbmdhust` or `rsfjescdjuubxadfjyxb` anywhere
- Assume your local `.env.local` is current — verify it matches the Vercel Preview env values

### Deploy mechanics

- Every push/merge to `dev` → auto-deploys to Vercel Preview at `https://realestate-crm-git-dev-amandhindsas-projects.vercel.app`
- Every push/merge to `main` → auto-deploys to Vercel Production at `https://realestate-crm-jade-ten.vercel.app` (currently dormant — reserved for the real prod setup later)
- Feature branch pushes → their own per-commit preview URLs

---

## Option A — Claude Code prompt (recommended)

Open Claude Code in your local repo and paste this prompt into a new session. Claude will walk through the sync step by step, pausing between operations so you can review.

````text
I need to sync my local dev environment with the recent Supabase
consolidation that Aman + Claude did on 2026-04-09. Walk me through
it step by step. Don't run destructive operations without showing me
output first. Pause after each step and report what you found.

Context (from the session notes at docs/ENVIRONMENTS.md):

- On 2026-04-09, three Supabase projects were consolidated into one:
  qcohfohjihazivkforsj ("realtyaicontent"). This is the project I was
  already using for dev, so the Supabase URL in my .env.local is
  probably already correct. But the DATABASE has changed:
  - 55+ new tables added from two other projects (newsletter v3,
    sites builder, social studio, voice agent, RAG, OAuth, tenants,
    help center, property deals, etc.)
  - ~519 new contacts imported, scoped to a new user called
    "demo-legacy@realestatecrm.com" with UUID
    7de22757-dd3a-4a4f-a088-c422746e88d4
  - Aman's real account (amandhindsa@outlook.com) was added
  - All my existing data (179 contacts, offers, open_houses,
    contact_family_members, tutor_*) was preserved

- Two PRs related to this work:
  - PR #116 (chore(supabase): consolidate 3 projects → 1) — may or
    may not be merged into dev yet, check
  - PR #118 (docs(environments): canonical reference) — same

- .env.vault is STALE (last re-encrypted 2026-04-01, before the
  consolidation). DO NOT run ./scripts/vault.sh decrypt and use
  those values — they point at an orphaned project (ybgilju).

What I want you to do, in order:

STEP 1 — Show me the current state of my repo
  - git branch --show-current
  - git status -s
  - git log --oneline -5
  - Check if there are uncommitted changes I might lose

STEP 2 — Fetch latest from origin but do NOT merge or checkout anything yet
  - git fetch origin --prune
  - Show me what's on origin/dev since my current branch diverged
  - Tell me whether PR #116 and PR #118 look like they've landed

STEP 3 — Inspect my .env.local
  - Check NEXT_PUBLIC_SUPABASE_URL
  - Expected value: https://qcohfohjihazivkforsj.supabase.co
  - If it matches, great. If it shows https://ybgiljuclpsuhbmdhust or
    anything else, tell me — I'll need to update it.
  - Do NOT print the full keys (JWT values), just confirm presence.

STEP 4 — Test that my Supabase connection still works
  - Use curl to hit:
    https://qcohfohjihazivkforsj.supabase.co/rest/v1/users?select=id&limit=1
    with the anon key from my .env.local as both the apikey header
    and Bearer token
  - Expected: returns a JSON array with at least one user row
  - If it returns "Invalid API key", my keys are stale and I need to
    pull fresh ones from Vercel. Tell me before doing that.

STEP 5 — If my env is stale, pull fresh values from Vercel
  - Only do this if STEP 4 failed
  - vercel whoami — am I logged in?
  - vercel env pull .env.local.fresh --environment=preview
  - Show me a diff between my current .env.local and .env.local.fresh
    (with JWT values redacted)
  - ASK ME before overwriting .env.local

STEP 6 — Pull latest code
  - If I'm on dev and have no uncommitted changes, git pull origin dev
  - If I'm on a feature branch, tell me which branch I should rebase
    onto dev once I'm ready, but don't do the rebase automatically
  - Run npm install in case dependencies changed

STEP 7 — Verify the new schema works with my code
  - Start the dev server in the background: npm run dev &
  - Wait for it to print "Ready on http://localhost:3001" (or 3000)
  - Hit a few read-only endpoints to smoke test:
    * curl http://localhost:3001/api/auth/providers (should return JSON)
    * Open the browser to localhost:3001 (or tell me to do it)
  - Look in the Next.js server logs for any errors about missing
    columns / tables / env vars
  - If you see errors like "column does not exist" on things like
    listings.current_phase — that's expected, those columns were
    stripped during consolidation. Tell me which ones so we can
    decide whether to add them back via a migration.

STEP 8 — Report back
  - Summary: what changed, what worked, what didn't
  - Any columns or tables my code references that aren't in the new
    DB (these need migrations)
  - Any env vars in .env.local.example that I'm missing in my local
    .env.local
  - Anything that looked weird and I should flag to Aman

IMPORTANT:
- Do NOT push to any branch
- Do NOT commit anything
- Do NOT run ./scripts/vault.sh decrypt
- Do NOT delete my local .env.local without showing me what's in it
  first
- Do NOT rebase or force-push any branch
- If anything looks ambiguous, ASK ME before acting
````

### How to use the prompt

1. In your terminal: `cd` into the `realestate-crm` repo
2. Open Claude Code: `claude`
3. Paste the entire prompt above (the block between the triple-backticks) as your first message
4. Follow Claude's prompts — it will ask before anything destructive
5. If Claude gets confused or something looks wrong, interrupt with `esc` and ask manually

---

## Option B — Bash script (if you don't want to use Claude Code)

Save this as `sync-dev.sh` at your repo root, make it executable, and run it. It's equivalent to Option A but without the AI layer.

```bash
#!/usr/bin/env bash
# sync-dev.sh — Bring your local dev in line with the 2026-04-09
# Supabase consolidation. Read-only where possible, prompts before
# anything that modifies files. Run from the repo root.

set -u
cd "$(dirname "$0")" || exit 1

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
heading() { echo ""; echo -e "${CYAN}━━━ $1 ━━━${NC}"; }
ok()      { echo -e "${GREEN}✓${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
err()     { echo -e "${RED}✗${NC} $1"; }

# 1. Sanity check
heading "STEP 1 — Current repo state"
echo "Branch:  $(git branch --show-current)"
echo "Commit:  $(git log -1 --oneline)"
if [ -n "$(git status -s)" ]; then
  warn "You have uncommitted changes:"
  git status -s | head -10
  read -r -p "Continue anyway? [y/N] " ans
  [[ "$ans" != "y" && "$ans" != "Y" ]] && exit 1
else
  ok "Working tree clean"
fi

# 2. Fetch latest
heading "STEP 2 — Fetch origin"
git fetch origin --prune 2>&1 | tail -5
ahead_behind=$(git rev-list --left-right --count HEAD...origin/dev 2>/dev/null || echo "0 0")
echo "Compared to origin/dev: $(echo "$ahead_behind" | awk '{print $1}') ahead, $(echo "$ahead_behind" | awk '{print $2}') behind"

# 3. Check .env.local
heading "STEP 3 — Check Supabase env"
if [ ! -f .env.local ]; then
  err ".env.local does not exist. Run 'vercel env pull .env.local --environment=preview'"
  exit 1
fi

current_url=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')
echo "Current NEXT_PUBLIC_SUPABASE_URL: $current_url"
expected="https://qcohfohjihazivkforsj.supabase.co"
if [ "$current_url" = "$expected" ]; then
  ok "URL matches consolidated dev DB"
else
  warn "URL does not match expected dev DB"
  warn "  expected: $expected"
  warn "  actual:   $current_url"
  read -r -p "Pull fresh values from Vercel Preview env? [y/N] " ans
  if [[ "$ans" == "y" || "$ans" == "Y" ]]; then
    cp .env.local .env.local.pre-consolidation.bak
    ok "Backed up to .env.local.pre-consolidation.bak"
    vercel env pull .env.local --environment=preview && ok "Pulled fresh values"
  fi
fi

# 4. Test API connectivity
heading "STEP 4 — Test Supabase connectivity"
anon_key=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2- | tr -d '"')
url=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')
response=$(curl -sS -o /tmp/supabase-test.json -w "%{http_code}" \
  "$url/rest/v1/users?select=id&limit=1" \
  -H "apikey: $anon_key" \
  -H "Authorization: Bearer $anon_key" 2>&1)
if [ "$response" = "200" ]; then
  ok "Supabase REST API reachable (HTTP 200)"
else
  err "Supabase REST API returned HTTP $response"
  cat /tmp/supabase-test.json 2>/dev/null | head -3
  warn "Your keys may be stale. Run: vercel env pull .env.local --environment=preview"
fi
rm -f /tmp/supabase-test.json

# 5. Pull latest code
heading "STEP 5 — Sync code"
current_branch=$(git branch --show-current)
if [ "$current_branch" = "dev" ]; then
  read -r -p "On dev branch. Run 'git pull origin dev'? [y/N] " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] && git pull origin dev
else
  warn "On feature branch '$current_branch'. Skipping auto-pull."
  warn "When ready: git fetch origin && git rebase origin/dev"
fi

# 6. Install deps
heading "STEP 6 — Install dependencies"
read -r -p "Run 'npm install'? [y/N] " ans
if [[ "$ans" == "y" || "$ans" == "Y" ]]; then
  npm install 2>&1 | tail -5
fi

# 7. Summary
heading "STEP 7 — Summary"
echo ""
echo "NEXT STEPS:"
echo "  1. Start dev server:  npm run dev"
echo "  2. Open in browser:   http://localhost:3001 (or 3000)"
echo "  3. Log in as:         demo@realestatecrm.com / demo1234"
echo "                        (or demo-legacy@realestatecrm.com to see the"
echo "                         518 contacts imported from the old ybgilju DB)"
echo "  4. Check for errors:  watch the Next.js dev server log for any"
echo "                        'column does not exist' or 'table does not exist'"
echo "                        errors. Those are from schema drift — report to Aman."
echo ""
echo "READ:"
echo "  - docs/ENVIRONMENTS.md — full post-consolidation reference"
echo "  - CLAUDE.md → 'Environments' section — critical rules"
echo ""
echo "DO NOT:"
echo "  - Run ./scripts/vault.sh decrypt (it's stale)"
echo "  - Reference ybgiljuclpsuhbmdhust or rsfjescdjuubxadfjyxb anywhere"
echo ""
echo "DONE."
```

### How to use the script

```bash
cd realestate-crm
curl -fsSL https://raw.githubusercontent.com/realtorcrmai/realtorai/dev/docs/DEVELOPER_SYNC.md | sed -n '/^#!\/usr\/bin\/env bash/,/^```$/p' | sed '$d' > sync-dev.sh
# OR: copy-paste the script block above into a new file sync-dev.sh

chmod +x sync-dev.sh
./sync-dev.sh
```

*Note: the curl-extract approach is clever but brittle. Copy-paste is more reliable.*

---

## After either option

Once you've synced:

1. **Verify the dev server starts clean**: `npm run dev` should boot without any "column does not exist" or "relation does not exist" errors
2. **Log in and smoke test**: use `demo@realestatecrm.com` / `demo1234` (or `demo-legacy@realestatecrm.com` to see most of the newly imported contacts)
3. **Check the contacts page**: you should see ~698 contacts total (179 from your old session + 519 imported)
4. **Skim the new docs**: `docs/ENVIRONMENTS.md` is the new canonical reference for all environment-related questions
5. **If anything breaks**, check the server logs for column/table errors and report them — some columns were stripped during consolidation due to CHECK constraint drift, and the fix is to add them back with a migration

---

## Troubleshooting

### "Invalid API key" errors from Supabase
Your `.env.local` has stale keys. Pull fresh ones:
```bash
vercel env pull .env.local --environment=preview
```

### `vercel` CLI not logged in
```bash
vercel login
```
Use the email associated with the `amandhindsas-projects` team.

### "Access denied" on `vercel env pull`
You may not be a member of the `amandhindsas-projects` team on Vercel. Ask Aman to add you.

### `column "X" does not exist` on startup
Your code references a column that was stripped during consolidation. The 2026-04-09 session dropped these columns from the imported data because they didn't exist in the target schema:

- `users`: `password_hash`, `email_verified`, `signup_source`, `phone`, `brokerage`, `license_number`
- `listings`: `current_phase`, `audit_trail`, `prop_unit`, `prop_type`, `disclosures`, `inclusions`, `exclusions`, `rental_equipment`, `showing_instructions`, `list_duration`, `commission_seller`, `commission_buyer`, `possession_date`, `price_locked`, `marketing_tier`, `suggested_price`, `cma_low`, `cma_high`, `cma_notes`, `stakeholders`, `forms_status`, `envelopes`, `mls_remarks`, `mls_realtor_remarks`, `mls_photos`, `mls_status`
- `site_analytics_events`: `realtor_id`

If any of these are critical to your feature work, write a migration to add them back. Otherwise, update the code to not reference them.

### "CREATE POLICY IF NOT EXISTS" errors if you try to re-run `073_contact_sync.sql`
That file has invalid PostgreSQL syntax. It was patched inline during the 2026-04-09 run but never fixed in the committed file. Replace the offending line with:
```sql
DROP POLICY IF EXISTS css_policy ON contact_sync_sources;
CREATE POLICY css_policy ON contact_sync_sources FOR ALL USING (true);
```

### Something else unexpected
- Check the compliance log at `.claude/compliance-log.md` — search for `2026-04-09` for the consolidation entry
- Check the session notes at `~/.claude/projects/-Users-bigbear-reality-crm/sessions/2026-04-09-supabase-consolidation.md` (only accessible from Aman's machine)
- Ping Aman with the specific error and `git branch --show-current` + `git log -1 --oneline` output

---

## Open follow-ups you don't need to do, but should know about

These are tracked in `docs/ENVIRONMENTS.md` §"Open follow-ups" — none of them block your sync, but context helps:

1. Delete orphaned Supabase projects (`ybgiljuclpsuhbmdhust`, `rsfjescdjuubxadfjyxb`) after safety window
2. Re-encrypt `.env.vault` with current Vercel values
3. Delete dead `.github/workflows/deploy.yml` + `netlify.toml`
4. Rename Supabase project from "realtyaicontent" to something sensible
5. Write migration files for `seller_identities` + `listing_enrichment`
6. Fix broken `CREATE POLICY IF NOT EXISTS` in `073_contact_sync.sql`
7. Dedupe the two demo realtors
8. Check `realtors360-sites/.env.local` for old project references
9. Consider moving Supabase to us-east-2 or ca-central-1 for latency
10. Add `VERCEL_TOKEN` to GitHub Actions secrets for CI-triggered deploys

## Changelog

| Date | Change |
|------|--------|
| 2026-04-21 | `CONTRIBUTING.md` updated: dev script now uses `NODE_OPTIONS=--max-old-space-size=4096` (4 GB heap) to prevent OOM during builds. See CONTRIBUTING.md for details. |

<!-- Last reviewed: 2026-04-21 -->


<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->

<!-- Last reviewed: 2026-04-21 — Wave 1b test grep -->

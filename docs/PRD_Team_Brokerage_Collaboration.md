<!-- docs-audit-reviewed: 2026-04-21T18 -->
<!-- docs-audit: src/lib/supabase/tenant.ts, src/lib/auth.ts, src/actions/*, supabase/migrations/061_*, 095_*, src/actions/newsletters.ts, src/actions/journeys.ts, src/actions/workflows.ts -->
# PRD: Realtors360 Teams — Agent Team Collaboration

> **Version:** 2.1
> **Date:** April 20, 2026
> **Author:** Realtors360 Product Team
> **Status:** Draft
> **Based on:** Full codebase audit of 60+ tenant-scoped tables, 18 server action files, 14 cron jobs, competitive analysis of Follow Up Boss/kvCORE/LionDesk, CASL/PIPEDA compliance requirements, NAR 2025 team statistics
> **Scope Note:** Brokerage-level login and brokerage management features are explicitly OUT OF SCOPE. This PRD covers Agent teams only — an agent who optionally creates a team and invites sub-agents/assistants.

---

## 1. Problem Statement

### The Core Problem
Real estate agents often work in **teams of 2-15 members** — a lead agent with sub-agents and assistants sharing listings, splitting commissions, and collaborating on showings. Yet Realtors360 currently isolates every user as if they work alone. A team lead with 5 agents has **zero visibility** into their team's pipeline, no way to assign listings to agents, no shared contact pool, and no collaborative showing management. This forces teams back to spreadsheets, WhatsApp groups, and Slack channels to coordinate work the CRM should handle natively. The isolation model touches **every module** — contacts, listings, showings, newsletters, workflows, tasks, deals, content creation, calendar, voice agent, and knowledge base — making this a systemic architectural transformation, not a bolt-on feature.

> **Scope boundary:** This feature covers agent-level teams only. An agent can optionally create a team and invite sub-agents/assistants. Brokerage-level login, brokerage dashboards, and multi-team brokerage management are **explicitly out of scope** for this version.

### Why This Matters
- **77% of agents** work within a brokerage or team structure (NAR 2025 Member Profile)
- Teams close **$4.2M median volume** vs $2.1M for solo agents — they're the highest-value customer segment
- Team leaders spend **3-5 hours/week** on coordination that a team-aware CRM eliminates
- **Churn risk:** solo agents outgrow the platform; team functionality is the #1 expansion trigger for CRM upgrades
- **Competitor gap:** kvCORE ($500+/mo), Follow Up Boss ($69/agent/mo), and LionDesk ($25/agent/mo) all offer team features — Realtors360 loses deals at the team tier

### What Exists Today (and Why It Fails)

| Component | Current State | Why It Fails for Teams |
|-----------|--------------|----------------------|
| `realtor_id` scoping on 60+ tables | Every record locked to one user | Agent A cannot see Agent B's contacts, listings, showings, deals, newsletters, or workflows |
| `tenants` table (migration 061) | Created for voice agents | Not integrated with CRM — zero queries reference it |
| `tenant_memberships` table | Has role/permissions columns | Disconnected from auth session — never checked |
| `team_invites` table (migration 095) | Insert-only stub | No acceptance flow, no email delivery, no UI |
| `getAuthenticatedTenantClient()` | Filters `.eq("realtor_id", userId)` | Cannot expand scope to team-level — hardcoded single-user |
| Auth session (JWT) | Carries only `userId`, `role`, `enabledFeatures` | No `teamId`, no team role, no permissions |
| Signup flow | Individual user only | No "Create Team" or "Join Team" path |
| Newsletters/Journeys | Per-realtor send identity + brand | Cannot share segments, templates, or analytics across team |
| Workflows/Automations | Per-realtor enrollment | Same contact enrolled by two agents = duplicate email sends |
| Tasks/Deals | No `assigned_to` field | Cannot assign work to team members |
| Google Calendar | Per-user via `google_tokens.user_email` | No shared calendar, no team availability aggregation |
| Twilio | Single number per user | No shared team line or call routing |
| Command Palette search | Queries only current user's data | Team members invisible |
| CSV export | Exports all visible data | No role-based field filtering |
| Cron: daily-digest | No tenant filtering | Potentially exposes cross-user data |

**Total state: 0% team functionality operational across 18 modules.** Stub tables exist but nothing reads them.

**No tool combines:** per-agent isolation + team collaboration + role-based visibility + Canadian compliance (CASL/FINTRAC) + workflow deduplication in one platform.

---

## 2. Vision

### One Sentence
Realtors360 Teams transforms isolated agent accounts into a collaborative team workspace where lead agents manage pipelines, assign leads, share listings, and track performance — while team members retain ownership of their private book of business and every module respects role-based permissions.

### The 30-Second Pitch
An agent decides to build a team. They create a team from settings (or during signup), invite 5 sub-agents and an assistant via email. Each member joins with their own login but now sees a shared team workspace alongside their personal view. The team lead assigns new leads to agents, monitors everyone's showing pipeline, shares listings across the team, runs team-branded newsletters, delegates showings, and views consolidated analytics. Sub-agents keep their private contacts and personal deals separate while contributing to the team pipeline. Every module — contacts, listings, showings, workflows, newsletters, tasks, deals, calendar, content, voice agent — becomes team-aware with zero code path changes for solo users. Role-based permissions ensure the team lead manages settings, agents manage their deals, and assistants handle scheduling without touching financials. CASL consent is tracked per-contact per-purpose with explicit team-sharing consent. One upgrade. All modules. One migration. Zero disruption to existing solo users.

### Success Metrics
| Metric | Target | Current Baseline |
|--------|--------|-----------------|
| Team creation rate | 20% of new signups create a team | 0% (no option) |
| Average team size | 5-8 agents | 1 (solo only) |
| Module coverage (team-aware) | 100% of core modules | 0% |
| Cross-team data isolation | Zero leakage incidents | N/A |
| Agent retention (team accounts) | 85% at 6 months | N/A |
| Admin pipeline visibility | Real-time, per-agent breakdown | N/A |
| Workflow dedup rate | 0 duplicate sends to same contact | N/A (duplicates possible) |
| Solo user regression | 0 test failures | Current: all passing |

---

## 3. Target Users

### Primary: Team Lead Agent (Michael)
- **Demographics:** 35-55, experienced agent who built a team of 3-15 members, $300K+ annual GCI, 10+ years experience
- **Tech comfort:** Uses Follow Up Boss currently, comfortable with CRM dashboards. Delegates tech setup to assistant. Judges tools by reporting quality.
- **Pain:** Pays $400-800/mo for team CRM. Can't see which sub-agents follow up on leads. Listings sit idle when another agent could help. No consolidated reporting for Monday team meetings. Spends 3 hours every Monday compiling pipeline spreadsheets from individual agent updates. Newsletter campaigns go out under one agent's name when it should be the team brand. Two agents accidentally contact the same lead because there's no shared visibility.
- **Goal:** One dashboard showing entire team's pipeline, lead assignments, showing coverage, and per-agent performance. Replace spreadsheet coordination. Send team-branded marketing. Ensure no lead goes un-contacted.
- **Budget:** $200-500/mo for team plan (vs $69/agent at Follow Up Boss)

### Secondary: Team Agent (Diana)
- **Demographics:** 30-45, mid-career, works under a team lead, handles 2-5 active listings, $150K-$300K volume
- **Tech comfort:** Uses whatever CRM the team provides. Comfortable with mobile, wants minimal admin overhead.
- **Pain:** Gets leads assigned via email/WhatsApp — no single source. Team lead asks for pipeline updates she types out manually. When she's on vacation, nobody covers her showings because they can't access her listings. Her personal sphere contacts are private but she wants team support on active deals.
- **Goal:** See her personal pipeline + team-shared listings. Accept assigned leads. Hand off showings. Keep private contacts private. Focus on selling.
- **Budget:** Included in team subscription

### Tertiary: Team Assistant / Transaction Coordinator (Jason)
- **Demographics:** 25-35, unlicensed, handles admin for 3-5 agents, $40-60K salary
- **Tech comfort:** Digital native, needs bulk actions and scheduling. No authority for financial decisions.
- **Pain:** Coordinates showings across agents via text. Can't update listing status without agent's login. Gets locked out of documents that need uploading. Can't see commission data (and shouldn't).
- **Goal:** Schedule showings, upload documents, update statuses, manage communications — without full agent permissions. Never see financial data.
- **Budget:** N/A (team subscription)

---

## 4. High-Level Feature List

### Phase 1 — Team Foundation (MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| **F1: Team Creation** | Agent creates team during signup or from settings; sets team name, optional logo | P0 |
| **F2: Invite & Accept Flow** | Owner invites via email; Resend delivers branded invite; token-based accept creates account or links existing; 30-day expiry | P0 |
| **F3: Role-Based Access (4 roles)** | Owner (full), Admin (manage members + settings), Agent (own + shared), Assistant (limited: no financials, no delete) — enforced at server action level | P0 |
| **F4: Team-Aware Tenant Client** | `getAuthenticatedTenantClient(scope)` gains "personal" / "team" mode; "team" filters `.in("realtor_id", teamMemberIds)` respecting visibility flags | P0 |
| **F5: Team Session Context** | JWT includes `teamId`, `teamRole`, `teamPermissions[]`; middleware enforces on every request | P0 |
| **F6: Team Settings Page** | `/settings/team` — member list, roles, pending invites, team branding, plan usage, seat count | P0 |
| **F7: Scope Toggle** | Global header toggle: "My View" / "Team View" — persists in localStorage; controls all list/detail pages | P0 |
| **F8: Shared Contacts** | Contacts have `visibility`: private / team; `assigned_to` for lead routing; dedup on ingest | P0 |
| **F9: Shared Listings** | Listings have `visibility` + `listing_agents` junction for co-ownership; shared listings visible in Team View | P0 |
| **F10: Shared Showings** | Showings on shared listings visible to team; `assigned_to` for delegation; any authorized agent can confirm | P0 |
| **F11: Tasks with Assignment** | Tasks gain `assigned_to` field; appear in assignee's task list; owner/admin can assign to any team member | P0 |
| **F12: Deals with Ownership** | Deals gain `assigned_agents[]` + commission split tracking; team leader sees all team deals | P0 |
| **F13: Team Dashboard Widget** | Dashboard Team View: pipeline by status, per-agent breakdown, team activity feed | P0 |
| **F14: Permission Middleware** | `checkTeamPermission(session, action, resource)` — enforced in every server action; 403 on violation | P0 |
| **F15: Audit Log (Core)** | Log permission-sensitive actions: role changes, data access, exports, deletes | P0 |

### Phase 2 — Module Integration

| Feature | Description | Priority |
|---------|-------------|----------|
| **F16: Newsletter Team Mode** | Campaigns sendable as team brand OR agent brand; shared templates at team level; segment includes team contacts | P0 |
| **F17: Workflow Dedup** | Before enrolling contact in workflow, check if already enrolled by any team member — prevent duplicate sends | P0 |
| **F18: Journey Team Scoping** | Journey enrollment respects team scope; same contact cannot receive same drip from two agents | P0 |
| **F19: Calendar Team View** | Aggregate team members' Google Calendar availability for showing scheduling; per-agent auth retained | P1 |
| **F20: Twilio Team Routing** | Support shared team number OR per-agent numbers; inbound SMS routes to assigned agent | P1 |
| **F21: Content Team Sharing** | AI-generated content (videos, images) shareable across team; publishing tracks which agent published | P1 |
| **F22: Command Palette Scope** | Search respects active scope toggle; team commands visible to Owner/Admin only | P0 |
| **F23: Export Permission Filter** | CSV exports exclude fields user lacks permission to see (e.g., commissions for assistants) | P0 |
| **F24: Lead Assignment** | Owner/Admin assigns inbound contacts with notification; round-robin optional | P0 |
| **F25: Showing Delegation** | Agent delegates showing to team member; appears in delegatee's calendar | P1 |

### Phase 3 — Consent, Compliance & Offboarding

| Feature | Description | Priority |
|---------|-------------|----------|
| **F26: CASL Team Consent** | Consent is per-contact per-purpose; sharing a contact within team requires explicit "data sharing" consent type; consent tracks `granted_to` (agent or team) | P0 |
| **F27: Agent Offboarding** | Formal offboard flow: reassign contacts/deals/automations, pause active campaigns, disconnect integrations, soft-delete membership | P0 |
| **F28: Contact Dedup on Share** | When marking contact as team-visible, system checks for existing duplicates across team; offers merge workflow | P1 |
| **F29: Notification Routing** | Configurable per-event: who gets notified (assigned agent, team leader, all). No notification flood on bulk actions | P1 |
| **F30: Team Notes vs Private Notes** | Notes on contacts/listings have visibility: private (only author sees) or team (all team members see) | P1 |

### Phase 4 — Analytics & Billing

| Feature | Description | Priority |
|---------|-------------|----------|
| **F31: Team Analytics** | Owner dashboard: per-agent metrics (deals closed, showings, response time, conversion, newsletter engagement) | P1 |
| **F32: Seat-Based Billing** | Per-seat pricing with mid-cycle proration; enforce max seats at invite time | P1 |
| **F33: Commission Splits** | `deal_commissions` table: deal_id, agent_id, role, split_pct, amount, status; supports multi-agent deals | P2 |
| **F34: Performance Leaderboard** | Gamification: top agent, fastest responder, most listings this month | P2 |
| **F35: Team Templates** | Newsletter templates, workflow blueprints, email templates shared at team level | P2 |
| **F36: Round-Robin Lead Distribution** | Auto-assign new leads by rotation (configurable: weighted, by zone, by specialty) | P2 |

---

## 5. Detailed User Stories & Acceptance Criteria

### Epic 1: Team Creation & Membership (F1, F2, F3, F5, F6)

**US-1.1: Create team during signup**
> As an agent, when I sign up for Realtors360, I want the option to create a team so my sub-agents and assistants can join.

**Acceptance Criteria:**
- [ ] Signup shows two paths: "I work solo" (current flow) and "I have a team"
- [ ] Team path collects: team name, brokerage name (informational field — stored on user profile, NOT a brokerage login), estimated size (2-5, 6-10, 11-15)
- [ ] Creates `tenants` row: `plan='team'`, `owner_email=user.email`, `status='active'`, `max_members` based on plan
- [ ] Creates `tenant_memberships` row: `role='owner'`, `agent_email=user.email`, `joined_at=now()`
- [ ] User's `users.team_id` populated
- [ ] JWT session includes `teamId`, `teamRole='owner'`, `teamPermissions=[*]`
- [ ] Redirects to invite step (skip button available)
- [ ] Solo path: ZERO changes to current flow — `team_id` remains null
- [ ] Cannot create team if already a member of another team (must leave first)

**US-1.2: Join team via invite**
> As an agent receiving a team invite, I want to click the link and join immediately.

**Acceptance Criteria:**
- [ ] Invite email (via Resend) contains: team name, inviter name, role being offered, branded CTA button → `/invite/accept?token=<uuid>`
- [ ] New user: signup form pre-filled with email; after account creation, `tenant_memberships` row created with invited role
- [ ] Existing user (no team): confirmation page → "Join [Team] as [Role]?" → on confirm, membership created
- [ ] Existing user (already on another team): shown error "You're already on [Other Team]. Leave that team first to join this one."
- [ ] Token validation: must exist, status IN ('pending','sent'), `expires_at > now()`
- [ ] On accept: invite status → 'accepted', `joined_at` set, user's `team_id` updated
- [ ] Owner receives notification: "[Name] joined your team"
- [ ] Expired/invalid token: friendly error + "Request new invite" CTA
- [ ] Rate limit: max 20 invites per team per 24 hours (prevent spam)

**US-1.3: Manage team members**
> As a team owner, I want to manage roles, remove agents, and resend invites.

**Acceptance Criteria:**
- [ ] `/settings/team` accessible only to Owner and Admin roles; other roles get 403 redirect
- [ ] Member table: Avatar, Name, Email, Role, Status (active/invited/removed), Joined date, Last active
- [ ] Owner can change any role except cannot demote themselves from Owner (must transfer ownership first)
- [ ] Admin can change Agent↔Assistant roles only; cannot touch Owner/Admin roles
- [ ] Remove member: triggers offboarding flow (US-1.6), not immediate delete
- [ ] Pending invites section: "Resend" (resets expiry) and "Cancel" (marks expired) actions
- [ ] "Invite New Member" button: email + role selection → creates invite + sends email
- [ ] Seat enforcement: invite blocked with clear message if at `tenants.max_members`
- [ ] Ownership transfer: Owner can transfer to another Admin (requires confirmation)

**US-1.4: Role-based permission enforcement**
> As the system, I must enforce permissions at the server action level — UI hiding alone is insufficient.

**Acceptance Criteria:**
- [ ] Every server action calls `checkTeamPermission(session, action, resourceId)` before data access
- [ ] Permission matrix enforced:

| Action | Owner | Admin | Agent | Assistant |
|--------|-------|-------|-------|-----------|
| Manage team settings | Yes | Yes | No | No |
| Invite/remove members | Yes | Yes | No | No |
| View team contacts (Team View) | All | All | Shared + assigned only | Assigned only |
| Create contacts | Yes | Yes | Yes | Yes |
| Delete contacts | Any | Any | Own only | No |
| Share contact with team | Yes | Yes | Own only | No |
| Create listings | Yes | Yes | Yes | No |
| Delete listings | Any | Any | Own only | No |
| Modify listing financials (price, commission) | Yes | Yes | Own + co-listed | No |
| View commissions/deal values | Yes | Yes | Own deals only | No |
| Manage showings (confirm/deny) | Yes | Yes | Own + shared listings | Assigned only |
| Create/edit newsletters | Yes | Yes | Yes (own contacts) | No |
| Send newsletters | Yes | Yes | Own segment only | No |
| Create workflows | Yes | Yes | Yes | No |
| Access billing | Yes | No | No | No |
| Export data (CSV) | All (full) | All (full) | Own only | No |
| View audit log | Yes | Yes | No | No |
| Manage integrations | Yes | Yes | Own only | No |

- [ ] Unauthorized action returns `{ error: "FORBIDDEN", message: "..." }` — never silently fails
- [ ] UI hides inaccessible actions (buttons removed, not disabled)
- [ ] API routes check permissions before any query execution
- [ ] Attempt to access forbidden resource logged to audit trail

**US-1.5: Solo user unchanged**
> As an existing solo user, I want ZERO changes to my experience when team features ship.

**Acceptance Criteria:**
- [ ] Users with `team_id = null`: all current flows work identically
- [ ] No "Team View" toggle shown for solo users
- [ ] No team-related UI elements visible
- [ ] `getAuthenticatedTenantClient("personal")` behavior unchanged (scope default = "personal")
- [ ] All existing tests pass without modification
- [ ] Performance: solo user queries have zero additional overhead (no team member lookups)

**US-1.6: Agent offboarding**
> As a team owner, when an agent leaves, I want a structured process to reassign their work.

**Acceptance Criteria:**
- [ ] Owner/Admin initiates offboard from team settings → confirmation dialog lists impact:
  - X contacts will become unassigned
  - Y active listings will need new primary agent
  - Z in-progress deals will need reassignment
  - N active automations will be paused
- [ ] Reassignment step: choose "Reassign all to [Agent]" or "Return to unassigned pool" or "Reassign selectively"
- [ ] Active workflow enrollments owned by departing agent: PAUSED (not deleted)
- [ ] Active newsletter campaigns: PAUSED with notification to team leader
- [ ] Scheduled showings: reassigned to chosen agent or marked "Needs assignment"
- [ ] Agent's personal integrations (Google Calendar, Twilio): disconnected
- [ ] Agent's activity history (notes, calls, emails) preserved on contacts — `performed_by` still references their user record
- [ ] Membership `removed_at` set; user's `team_id` cleared; login still works (as solo) but team context removed
- [ ] Audit log entry: "Agent [name] offboarded by [admin] — X contacts reassigned to [agent]"

### Epic 2: Data Visibility & Sharing (F4, F7, F8, F9, F10, F11, F12)

**US-2.1: Scope toggle — personal vs team view**
> As a team member, I want to switch between my data and the team's data.

**Acceptance Criteria:**
- [ ] Global toggle in MondayHeader: "My View" | "Team View"
- [ ] Owner/Admin default to Team View on first login; Agent/Assistant default to My View
- [ ] "My View": queries use `realtor_id = currentUser.id` (unchanged behavior)
- [ ] "Team View" for Owner/Admin: queries use `realtor_id IN (all_team_member_ids)` — sees everything
- [ ] "Team View" for Agent: sees own data + contacts/listings where `visibility = 'team'` or `assigned_to = self`
- [ ] "Team View" for Assistant: sees only records where `assigned_to = self`
- [ ] Toggle state in localStorage (key: `r360_scope_${userId}`)
- [ ] Counts in sidebar badges update based on scope
- [ ] URL unchanged — scope is client preference, passed to server actions as param

**US-2.2: Share contacts with team**
> As an agent, I want to control which contacts are visible to my team.

**Acceptance Criteria:**
- [ ] Contact detail: "Visibility" dropdown — Private (default) / Team
- [ ] Only contact owner or Owner/Admin can change visibility
- [ ] Changing to "Team" checks CASL: if contact has `consent_type='data_sharing'` → proceed. If not → show warning: "This contact hasn't consented to data sharing. Share anyway?" (logs decision)
- [ ] Team-visible contacts appear in Team View for appropriate roles
- [ ] Contact shows badge: "Shared by [Agent Name]" with avatar
- [ ] Permissions on shared contacts:
  - Original owner: full CRUD
  - Other agents: view, add notes (team-visible), log communications — cannot delete or change visibility
  - Owner/Admin: full CRUD on all team contacts
  - Assistant: view assigned only
- [ ] Contact detail page shows owner name + "Shared with team" indicator
- [ ] `contacts.visibility` enum: 'private' | 'team' (default: 'private')
- [ ] `contacts.assigned_to` UUID nullable (for lead assignment)
- [ ] Index: `(team_id_via_realtor, visibility)` for fast team queries

**US-2.3: Contact deduplication on share**
> As a system, when a contact becomes team-visible, I must check for duplicates across the team.

**Acceptance Criteria:**
- [ ] On visibility change to 'team': system checks for duplicate across all team members' contacts
- [ ] Dedup check: exact email match (primary key), exact phone match (secondary), fuzzy name+address (low confidence)
- [ ] If exact match found: show dialog — "This contact may already exist (owned by [Agent]). Merge? Keep separate?"
- [ ] Merge: keeps record with more activity; combines phone/email lists; preserves all notes/communications from both
- [ ] Keep separate: both remain, no action (contacts can share email across team — e.g., spouse scenario)
- [ ] Dedup runs BEFORE creating contact on import (CSV import shows potential dupes before commit)
- [ ] Never auto-merge without confirmation when contacts belong to different agents

**US-2.4: Share listings with team**
> As an agent, I want to share listings so the team can help with showings and the broker can see my pipeline.

**Acceptance Criteria:**
- [ ] Listing detail: "Visibility" dropdown — Private / Team
- [ ] Co-listing: Owner/Admin or listing agent can add co-list agents via `listing_agents` table
- [ ] `listing_agents` junction: listing_id, user_id, role ('primary'|'co-list'|'support'), assigned_at, assigned_by
- [ ] Primary agent: full control (all workflow phases, showings, status)
- [ ] Co-list agents: same as primary — can advance workflow phases, manage showings, update status
- [ ] Support agents: view + showing management only
- [ ] Non-assigned team agents (when listing visibility='team'): view-only in Team View
- [ ] Listing card shows agent avatar(s) for all assigned agents
- [ ] Listing documents: accessible to all assigned agents (not view-only agents)
- [ ] Listing enrichment data: visible to all assigned agents

**US-2.5: Team showing management**
> As a team, showings on shared listings must be manageable by any authorized agent.

**Acceptance Criteria:**
- [ ] Showings page in Team View: shows all showings for shared/co-listed listings
- [ ] Who can confirm/deny a showing:
  - Primary or co-list agents on that listing
  - Owner/Admin (any team showing)
  - Assistant if `assigned_to` matches them
- [ ] Showing delegation: listing agent assigns specific showing to another team member
- [ ] `appointments.assigned_to` (nullable UUID) — when set, that agent handles this showing
- [ ] `appointments.delegated_by` + `delegated_at` for audit
- [ ] SMS to buyer agent: sent from primary listing agent's Twilio number (consistency for external parties)
- [ ] Post-showing feedback request: sent to assigned agent (not necessarily listing agent)
- [ ] Google Calendar event: created on assigned agent's calendar (if they have Google connected)
- [ ] Conflict check: before delegation, verify assignee's calendar availability

**US-2.6: Tasks with assignment**
> As a team leader, I want to assign tasks to team members and track completion.

**Acceptance Criteria:**
- [ ] Task creation form: "Assign to" dropdown (self or any team member)
- [ ] `tasks.assigned_to` UUID nullable FK to users
- [ ] Assigned tasks appear in assignee's task list (both My View and Team View)
- [ ] Overdue tasks: notification to assignee, then escalation to team leader after 24 hours (configurable)
- [ ] Task completion: only assignee or Owner/Admin can mark complete
- [ ] Team View: Owner/Admin sees all team tasks with filter by assignee

**US-2.7: Deals with multi-agent ownership**
> As a team handling a transaction, multiple agents may be involved — the deal must reflect this.

**Acceptance Criteria:**
- [ ] `deal_agents` junction: deal_id, user_id, role ('primary'|'co-agent'|'referral'), commission_split_pct
- [ ] All deal agents can view/edit the deal (respecting their deal role)
- [ ] Commission split: tracked per-agent on the deal (sum must = 100% or flags warning)
- [ ] Deal pipeline view in Team View: shows all team deals, filterable by agent
- [ ] Deal status change: notifies all deal agents
- [ ] Mortgage tracking on deal: visible to all deal agents

### Epic 3: Newsletter & Marketing Team Integration (F16, F17, F18, F26)

**US-3.1: Team newsletter campaigns**
> As a team leader, I want to send newsletters under the team brand to all team contacts.

**Acceptance Criteria:**
- [ ] Newsletter creation: "Send as" selector — Agent (personal brand) or Team (team brand)
- [ ] "Team" mode: uses team branding (logo, colors from `tenants` table), sender name = team name
- [ ] "Agent" mode: uses agent's brand profile (current behavior)
- [ ] Recipient segment: when scope="team", segment builder queries across all team contacts (with visibility='team')
- [ ] Unsubscribe: per-contact, per-purpose. If contact unsubscribes from Agent A's emails, they're unsubscribed from ALL team emails to them (same `contact_id`). Stored as `newsletter_unsubscribed = true` on contact record.
- [ ] Shared templates: team-level templates (`newsletter_templates.scope = 'team'`) editable by Owner/Admin, usable by all agents
- [ ] Agent templates: personal templates visible only to creator
- [ ] Analytics: Agent sees own campaign stats. Owner/Admin sees aggregate + per-agent breakdown.

**US-3.2: Workflow enrollment deduplication**
> As the system, I must prevent the same contact from receiving duplicate automated emails from multiple team members.

**Acceptance Criteria:**
- [ ] Before enrolling a contact in a workflow: check `workflow_enrollments` across ALL team members for same `contact_id` + same `workflow_id` (or same `workflow_blueprint_id`)
- [ ] If already enrolled (by any team member): skip enrollment, log "Dedup: contact already enrolled by [agent]"
- [ ] If enrolled in a DIFFERENT workflow targeting same contact: allow (different content)
- [ ] Same logic for `contact_journeys`: before advancing, check if another agent's journey already sent same phase email to this contact
- [ ] Rate limiting: same contact cannot receive more than 1 automated email per 24 hours from the team (aggregate across all agents)
- [ ] Cron job `/api/cron/process-workflows`: must check dedup BEFORE sending, not just at enrollment

**US-3.3: CASL consent for team sharing**
> As a system handling Canadian contacts, I must track consent properly when contacts are shared within a team.

**Acceptance Criteria:**
- [ ] `contact_consents` table (new or extend existing):
  - contact_id, consent_type ('email_marketing'|'sms_marketing'|'data_sharing'|'data_processing'), status ('granted'|'withdrawn'|'not_requested'), granted_at, withdrawn_at, granted_to_type ('agent'|'team'), granted_to_id (user_id or team_id), source ('web_form'|'verbal'|'written'|'imported'), proof_url
- [ ] When contact consented to Agent A: `granted_to_type = 'agent'`, `granted_to_id = agent.id`
- [ ] When contact consented on team website or form: `granted_to_type = 'team'`, `granted_to_id = team.id` → entire team can market
- [ ] Sharing a contact with team: system checks for 'data_sharing' consent. If missing → warning (not blocking, but logged)
- [ ] Contact marketing by agent who doesn't have explicit consent: blocked unless team-level consent exists
- [ ] CASL implied consent expiry (2 years): tracked via `consent_expires_at`; cron checks weekly
- [ ] Consent withdrawal: removes marketing permission from ALL team members (not just one)
- [ ] GDPR Subject Access Request: export must compile ALL data across ALL team member interactions

### Epic 4: Integration Scoping (F19, F20, F21, F22, F23)

**US-4.1: Google Calendar per-agent with team aggregation**
> As a team, we need to check availability across multiple agents when scheduling showings.

**Acceptance Criteria:**
- [ ] Each agent connects their OWN Google Calendar (existing `google_tokens.user_email` pattern — unchanged)
- [ ] Team showing scheduler: when assigning/delegating a showing, system checks ALL potential assignees' calendars for conflicts
- [ ] Calendar API calls use each agent's own token (no shared token)
- [ ] If an agent hasn't connected Google Calendar: their availability shows as "unknown" (not blocked)
- [ ] Team calendar view (Owner/Admin): overlay of all team members' events (read-only from Google, colored by agent)
- [ ] Token expiry for one agent does NOT affect others; notification sent to that agent to reconnect

**US-4.2: Twilio team routing**
> As a team, we need clear SMS/call routing for inbound messages.

**Acceptance Criteria:**
- [ ] Two modes (configurable per team):
  - **Per-agent numbers** (default): each agent has their own `twilio_number` on `users` table (current behavior)
  - **Shared team number**: one number on `tenants.twilio_number`; inbound routed to assigned agent for that contact
- [ ] Inbound SMS to shared number: lookup `contacts.assigned_to` → route to that agent. If unassigned → route to Owner/Admin or round-robin pool.
- [ ] Outbound SMS from shared line: `from` = team number, but `communications.performed_by = agent.id` for attribution
- [ ] Per-agent mode: unchanged from current implementation
- [ ] Showing confirmation SMS: always from the listing agent's number (external consistency)

**US-4.3: Command palette team scope**
> As a user searching via Cmd+K, results must respect my current scope and permissions.

**Acceptance Criteria:**
- [ ] Search API (`/api/contacts?search=`, `/api/listings?search=`): accepts `scope` param, applies same permission logic as list views
- [ ] "My View" active: search returns only user's own data
- [ ] "Team View" active: search returns data user is permitted to see (based on role)
- [ ] Team-only commands (Manage Team, Invite Member, Team Analytics) visible ONLY to Owner/Admin
- [ ] Results show owner attribution: "Diana's contact" in search result subtitle
- [ ] Performance: search must remain <200ms even with team-wide scope (index on `team_id` + search fields)

**US-4.4: Export with permission filtering**
> As a user exporting data, the CSV must only include data and fields I'm permitted to see.

**Acceptance Criteria:**
- [ ] Export respects current scope toggle (My View = my data, Team View = team data I can see)
- [ ] Field filtering by role:
  - Assistant export: excludes commission, deal_value, financial fields
  - Agent export: includes own deal financials only
  - Owner/Admin: full field set
- [ ] Export header row matches filtered columns (no blank columns for hidden fields)
- [ ] Every export logged to audit trail: who, when, record count, scope
- [ ] Rate limit: max 1 full export per 24 hours for Agent/Assistant role (prevent data dumping)
- [ ] Exported contacts must exclude those who withdrew consent (CASL compliance)

### Epic 5: Cron Jobs & Background Processing (F17, F18)

**US-5.1: Cron safety for team data**
> As the system, all cron jobs must correctly handle team-scoped data without leakage or duplication.

**Acceptance Criteria:**
- [ ] `/api/cron/process-workflows`: before sending, check dedup across team (not just individual)
- [ ] `/api/cron/process-journeys`: same dedup check as workflows
- [ ] `/api/cron/daily-digest`: scopes digest per-user (each user gets stats about their own data + team summary if applicable)
- [ ] `/api/cron/welcome-drip`: sends from the contact's `realtor_id` (the agent who created/is assigned the contact)
- [ ] `/api/cron/consent-expiry`: withdrawal affects team-wide access (not just one agent)
- [ ] `/api/cron/score-contacts`: scoring remains per-contact, unaffected by team (engagement is contact-level)
- [ ] `/api/cron/greeting-automations`: birthday/anniversary emails sent from assigned agent (or owner if unassigned)
- [ ] ALL crons: no cross-team data visible in any output or side effect
- [ ] NEW cron: `/api/cron/expire-invites` — weekly, expires stale team invites

### Epic 6: Signup Flow Integration (F1)

**US-6.1: Choose solo or team at signup**
> As a new user, I want a clear choice between solo and team during signup.

**Acceptance Criteria:**
- [ ] After auth (email/password or Google OAuth), plan selection page shows:
  - "Solo Agent" → current onboarding flow (no team_id)
  - "I have a team" → team creation step → invite step → onboarding
- [ ] Team creation step: team name (required), brokerage name (optional, informational only), logo upload (optional)
- [ ] Invite step: multi-email input + role per email; "Skip, I'll invite later" button
- [ ] After team setup: standard onboarding wizard runs (personalization, sample data, checklist)
- [ ] `users.team_id` populated after team creation
- [ ] `onboarding_team_size` pre-populated from signup choice

**US-6.2: Join existing team at signup**
> As a new agent with an invite link, I want to sign up and immediately be on my team.

**Acceptance Criteria:**
- [ ] `/invite/accept?token=xxx` shows branded page: team name + inviter name + logo + role offered
- [ ] Signup form (email pre-filled, password required for email auth; Google OAuth also available)
- [ ] After account creation: auto-joined to team, membership created, onboarding wizard starts
- [ ] No plan selection (covered by team subscription)
- [ ] Dashboard lands in Team View with shared data visible immediately

**US-6.3: Upgrade solo to team**
> As an existing solo user, I want to upgrade to team without losing any data.

**Acceptance Criteria:**
- [ ] `/settings/billing` → "Upgrade to Team" CTA
- [ ] Creates `tenants` row, creates membership with role='owner', populates `users.team_id`
- [ ] ALL existing data unchanged — `realtor_id` stays the same, visibility defaults to 'private'
- [ ] User is now Owner of a team of 1 — can immediately invite others
- [ ] No data migration needed (progressive sharing — user explicitly shares what they want)

---

## 6. Technical Design

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AUTH LAYER (Enhanced)                            │
│                                                                         │
│  Signup ─┬─ Solo ─────── Create user (team_id=null)                     │
│          ├─ Team Owner ── Create user + tenant + membership(owner)       │
│          └─ Via Invite ── Create user + membership(invited_role)         │
│                                                                         │
│  JWT: { userId, email, role, teamId, teamRole, teamPermissions[] }      │
│                                                                         │
│  Middleware: every request → validate session → inject team context      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    PERMISSION LAYER (New)                                │
│                                                                         │
│  checkTeamPermission(session, action, resourceOwnerId?)                 │
│    ├── Solo user (no teamId) → allow all (current behavior)             │
│    ├── Owner → allow all                                                │
│    ├── Admin → allow all except billing                                 │
│    ├── Agent → check action matrix + resource ownership                 │
│    └── Assistant → minimal permissions + assigned_to check              │
│                                                                         │
│  Every server action → permission check BEFORE query                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER (Enhanced)                          │
│                                                                         │
│  getAuthenticatedTenantClient(scope: "personal" | "team")               │
│    ├── "personal" → .eq("realtor_id", userId)        [UNCHANGED]        │
│    └── "team"     → depends on role:                                    │
│         ├── Owner/Admin → .in("realtor_id", allTeamMemberIds)           │
│         ├── Agent → .or(                                                │
│         │     "realtor_id.eq.{self}",                                   │
│         │     "and(visibility.eq.team,                      │
│         │          realtor_id.in.({teamMemberIds}))",                    │
│         │     "assigned_to.eq.{self}"                                   │
│         │   )                                                           │
│         └── Assistant → .eq("assigned_to", userId)                      │
│                                                                         │
│  Team member ID cache: resolved once per request, stored in context     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    MODULE IMPACT MAP                                     │
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │  Contacts   │ │  Listings   │ │  Showings   │ │   Tasks     │      │
│  │ +visibility │ │ +visibility │ │ +assigned_to│ │ +assigned_to│      │
│  │ +assigned_to│ │ +listing_   │ │ +delegated  │ │             │      │
│  │ +dedup      │ │   agents    │ │   _by       │ │             │      │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │   Deals     │ │ Newsletters │ │  Workflows  │ │  Journeys   │      │
│  │ +deal_agents│ │ +scope(team)│ │ +dedup chk  │ │ +dedup chk  │      │
│  │ +commission │ │ +shared     │ │ +team_scope │ │ +rate_limit │      │
│  │   _splits   │ │   templates │ │             │ │             │      │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │  Calendar   │ │   Twilio    │ │  Content    │ │  Knowledge  │      │
│  │ +team avail │ │ +routing    │ │ +shareable  │ │ +team scope │      │
│  │  aggregation│ │  rules      │ │  assets     │ │  (already   │      │
│  │             │ │             │ │             │ │   global)   │      │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │Notifications│ │   Search    │ │   Export    │ │  Audit Log  │      │
│  │ +team route │ │ +scope      │ │ +field mask │ │ (NEW TABLE) │      │
│  │ +config per │ │  toggle     │ │ +rate limit │ │             │      │
│  │  event type │ │             │ │             │ │             │      │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Database Migration (098_team_collaboration.sql)

```sql
-- ============================================================
-- Migration 098: Team Collaboration Foundation
-- CAUTION: This is a one-time structural migration affecting
-- core tables. Test thoroughly before applying.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Add team_id to users (links user to their team)
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);

-- ============================================================
-- 2. Enhance tenants table for CRM integration
-- ============================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brokerage_name TEXT; -- informational only, not a login entity
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_members INTEGER NOT NULL DEFAULT 15;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS twilio_number TEXT; -- shared team number (optional)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#FF7A59';

-- ============================================================
-- 3. Enhance tenant_memberships (add missing columns)
-- ============================================================
ALTER TABLE tenant_memberships ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE tenant_memberships ALTER COLUMN role SET DEFAULT 'agent';
ALTER TABLE tenant_memberships ADD CONSTRAINT valid_team_roles
  CHECK (role IN ('owner', 'admin', 'agent', 'assistant'));
CREATE INDEX IF NOT EXISTS idx_memberships_tenant ON tenant_memberships(tenant_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memberships_user ON tenant_memberships(user_id) WHERE removed_at IS NULL;

-- ============================================================
-- 4. Enhance team_invites
-- ============================================================
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES tenants(id);
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS inviter_name TEXT;
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS team_logo_url TEXT;
CREATE INDEX IF NOT EXISTS idx_invites_token ON team_invites(invite_token) WHERE status IN ('pending', 'sent');

-- ============================================================
-- 5. Visibility + assignment on CONTACTS
-- ============================================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'team'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS shared_by UUID REFERENCES users(id);
CREATE INDEX idx_contacts_visibility ON contacts(realtor_id, visibility) WHERE visibility != 'private';
CREATE INDEX idx_contacts_assigned ON contacts(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================================
-- 6. Visibility + co-ownership on LISTINGS
-- ============================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'team'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;
CREATE INDEX idx_listings_visibility ON listings(realtor_id, visibility) WHERE visibility != 'private';

-- Listing co-ownership junction
CREATE TABLE IF NOT EXISTS listing_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'co-list' CHECK (role IN ('primary', 'co-list', 'support')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(listing_id, user_id)
);
CREATE INDEX idx_listing_agents_user ON listing_agents(user_id);
CREATE INDEX idx_listing_agents_listing ON listing_agents(listing_id);

-- ============================================================
-- 7. Showing delegation on APPOINTMENTS
-- ============================================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS delegated_by UUID REFERENCES users(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS delegated_at TIMESTAMPTZ;
CREATE INDEX idx_appts_assigned ON appointments(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================================
-- 8. Task assignment
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================================
-- 9. Deal multi-agent ownership
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'co-agent', 'referral', 'team_override')),
  commission_split_pct DECIMAL(5,2) CHECK (commission_split_pct >= 0 AND commission_split_pct <= 100),
  commission_amount DECIMAL(12,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
  UNIQUE(deal_id, user_id)
);
CREATE INDEX idx_deal_agents_user ON deal_agents(user_id);
CREATE INDEX idx_deal_agents_deal ON deal_agents(deal_id);

-- ============================================================
-- 10. Newsletter team scoping
-- ============================================================
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS send_as TEXT DEFAULT 'agent'
  CHECK (send_as IN ('agent', 'team'));
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES tenants(id);

-- Newsletter templates: add scope
ALTER TABLE newsletter_templates ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'personal'
  CHECK (scope IN ('personal', 'team', 'global'));
ALTER TABLE newsletter_templates ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES tenants(id);

-- ============================================================
-- 11. Workflow enrollment dedup tracking
-- ============================================================
ALTER TABLE workflow_enrollments ADD COLUMN IF NOT EXISTS team_dedup_key TEXT;
-- Composite: team_id + contact_id + workflow_blueprint_id → unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_enrollment_dedup
  ON workflow_enrollments(team_dedup_key) WHERE team_dedup_key IS NOT NULL AND status = 'active';

-- ============================================================
-- 12. Contact consent tracking (enhanced)
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('email_marketing', 'sms_marketing', 'data_sharing', 'data_processing')),
  status TEXT NOT NULL DEFAULT 'not_requested' CHECK (status IN ('granted', 'withdrawn', 'not_requested', 'expired')),
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- CASL 2-year implied consent expiry
  granted_to_type TEXT CHECK (granted_to_type IN ('agent', 'team')),
  granted_to_id UUID, -- user_id or team_id
  source TEXT CHECK (source IN ('web_form', 'verbal', 'written', 'imported', 'double_opt_in')),
  proof_url TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, consent_type, granted_to_type, granted_to_id)
);
CREATE INDEX idx_consents_contact ON contact_consents(contact_id);
CREATE INDEX idx_consents_expiry ON contact_consents(expires_at) WHERE status = 'granted';

-- ============================================================
-- 13. Team activity log
-- ============================================================
CREATE TABLE IF NOT EXISTS team_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  -- Actions: contact_created, contact_shared, listing_created, listing_status_changed,
  -- showing_confirmed, showing_delegated, deal_won, deal_stage_changed, member_joined,
  -- member_removed, role_changed, newsletter_sent, workflow_enrolled, task_completed,
  -- export_performed, permission_denied
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_team_activity_team_time ON team_activity_log(team_id, created_at DESC);
CREATE INDEX idx_team_activity_user ON team_activity_log(user_id, created_at DESC);
-- Partition hint: consider partitioning by month if table grows > 1M rows

-- ============================================================
-- 14. Audit log (security-critical)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL, -- 'role_change', 'data_export', 'member_removed', 'permission_denied', 'consent_change', 'data_delete'
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}', -- { old_role, new_role, export_count, ip_address, etc. }
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_team_time ON audit_log(team_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);

-- ============================================================
-- 15. Notes visibility (team vs private)
-- ============================================================
-- Assuming notes are stored in communications or a dedicated notes table
ALTER TABLE communications ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private'
  CHECK (visibility IN ('private', 'team'));

-- ============================================================
-- 16. Materialized view for fast team member lookups
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS team_members_active AS
SELECT
  tm.tenant_id AS team_id,
  u.id AS user_id,
  u.email,
  u.name,
  tm.role,
  tm.permissions
FROM tenant_memberships tm
JOIN users u ON u.email = tm.agent_email OR u.id = tm.user_id
WHERE tm.removed_at IS NULL;

CREATE UNIQUE INDEX idx_team_members_user ON team_members_active(team_id, user_id);

-- Refresh function (call after membership changes)
CREATE OR REPLACE FUNCTION refresh_team_members()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY team_members_active;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 17. RLS policies for team access
-- ============================================================

-- Drop existing single-user policies (will be replaced)
-- NOTE: only drop and recreate for tables gaining team visibility

-- CONTACTS: team members can see team-visible contacts
DROP POLICY IF EXISTS "tenant_contacts_select" ON contacts;
CREATE POLICY "contacts_select_with_team" ON contacts FOR SELECT USING (
  -- Own contacts (always)
  realtor_id = auth.uid()
  -- OR team-visible contacts from same team
  OR (
    visibility = 'team'
    AND EXISTS (
      SELECT 1 FROM team_members_active tma
      WHERE tma.user_id = auth.uid()
        AND tma.team_id = (
          SELECT team_id FROM users WHERE id = contacts.realtor_id
        )
    )
  )
  -- OR directly assigned to me
  OR assigned_to = auth.uid()
);

-- LISTINGS: team members can see team-visible listings + co-listed
DROP POLICY IF EXISTS "tenant_listings_select" ON listings;
CREATE POLICY "listings_select_with_team" ON listings FOR SELECT USING (
  realtor_id = auth.uid()
  OR (
    visibility = 'team'
    AND EXISTS (
      SELECT 1 FROM team_members_active tma
      WHERE tma.user_id = auth.uid()
        AND tma.team_id = (
          SELECT team_id FROM users WHERE id = listings.realtor_id
        )
    )
  )
  OR id IN (SELECT listing_id FROM listing_agents WHERE user_id = auth.uid())
);

-- APPOINTMENTS: team showings visible
DROP POLICY IF EXISTS "tenant_appointments_select" ON appointments;
CREATE POLICY "appointments_select_with_team" ON appointments FOR SELECT USING (
  realtor_id = auth.uid()
  OR assigned_to = auth.uid()
  OR listing_id IN (
    SELECT id FROM listings WHERE (
      visibility = 'team'
      AND EXISTS (
        SELECT 1 FROM team_members_active tma
        WHERE tma.user_id = auth.uid()
          AND tma.team_id = (SELECT team_id FROM users WHERE id = listings.realtor_id)
      )
    )
    OR id IN (SELECT listing_id FROM listing_agents WHERE user_id = auth.uid())
  )
);

-- TASKS: assigned tasks visible
DROP POLICY IF EXISTS "tenant_tasks_select" ON tasks;
CREATE POLICY "tasks_select_with_team" ON tasks FOR SELECT USING (
  realtor_id = auth.uid()
  OR assigned_to = auth.uid()
);

-- COMMUNICATIONS: team-visible notes
DROP POLICY IF EXISTS "tenant_communications_select" ON communications;
CREATE POLICY "communications_select_with_team" ON communications FOR SELECT USING (
  realtor_id = auth.uid()
  OR (
    visibility = 'team'
    AND EXISTS (
      SELECT 1 FROM team_members_active tma
      WHERE tma.user_id = auth.uid()
        AND tma.team_id = (
          SELECT team_id FROM users WHERE id = communications.realtor_id
        )
    )
  )
);

COMMIT;
```

### Auth Enhancement (src/lib/auth.ts)

```typescript
// In JWT callback, AFTER user lookup/creation:

// Fetch team membership
const { data: membership } = await adminClient
  .from("tenant_memberships")
  .select("tenant_id, role, permissions, user_id")
  .eq("agent_email", user.email)
  .is("removed_at", null)
  .single();

if (membership) {
  token.teamId = membership.tenant_id;
  token.teamRole = membership.role; // 'owner' | 'admin' | 'agent' | 'assistant'
  token.teamPermissions = membership.permissions || {};

  // Ensure user_id is linked
  if (!membership.user_id) {
    await adminClient.from("tenant_memberships")
      .update({ user_id: userId })
      .eq("agent_email", user.email)
      .is("removed_at", null);
  }
}

// Session object:
session.user.teamId = token.teamId ?? null;
session.user.teamRole = token.teamRole ?? null;
session.user.teamPermissions = token.teamPermissions ?? {};
```

### Tenant Client Enhancement (src/lib/supabase/tenant.ts)

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Cache team member IDs per-request to avoid repeated lookups
let _teamMemberCache: Map<string, string[]> = new Map();

async function getTeamMemberIds(teamId: string): Promise<string[]> {
  if (_teamMemberCache.has(teamId)) return _teamMemberCache.get(teamId)!;

  const admin = createAdminClient();
  const { data } = await admin
    .from("team_members_active") // materialized view
    .select("user_id")
    .eq("team_id", teamId);

  const ids = data?.map(r => r.user_id) || [];
  _teamMemberCache.set(teamId, ids);
  return ids;
}

export async function getAuthenticatedTenantClient(
  scope: "personal" | "team" = "personal"
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Solo user or "personal" scope: unchanged behavior
  if (scope === "personal" || !session.user.teamId) {
    return createTenantClient(userId);
  }

  // Team scope: resolve based on role
  const teamRole = session.user.teamRole;
  const teamId = session.user.teamId;
  const memberIds = await getTeamMemberIds(teamId);

  if (teamRole === "owner" || teamRole === "admin") {
    // See all team data
    return createTeamTenantClient(memberIds, userId);
  }

  if (teamRole === "agent") {
    // See own + shared + assigned
    return createAgentTeamClient(userId, memberIds);
  }

  if (teamRole === "assistant") {
    // See only assigned records
    return createAssistantClient(userId);
  }

  // Fallback: personal only
  return createTenantClient(userId);
}

// New: team client that filters by multiple realtor_ids
function createTeamTenantClient(memberIds: string[], currentUserId: string) {
  const admin = createAdminClient();
  return {
    from: (table: string) => ({
      select: (...args: any[]) => admin.from(table).select(...args).in("realtor_id", memberIds),
      insert: (data: any) => admin.from(table).insert({ ...data, realtor_id: currentUserId }),
      update: (data: any) => ({ eq: (col: string, val: any) => admin.from(table).update(data).in("realtor_id", memberIds).eq(col, val) }),
      delete: () => ({ eq: (col: string, val: any) => admin.from(table).delete().eq("realtor_id", currentUserId).eq(col, val) }),
      // Note: DELETE restricted to own records even for Owner/Admin — prevents accidental mass delete
    })
  };
}
```

### Permission Middleware (src/lib/team-permissions.ts)

```typescript
import { Session } from "next-auth";

export type TeamAction =
  | "team:manage_settings"
  | "team:invite_members"
  | "team:remove_members"
  | "team:view_audit_log"
  | "contacts:view_team"
  | "contacts:create"
  | "contacts:delete"
  | "contacts:share"
  | "contacts:export"
  | "listings:create"
  | "listings:delete"
  | "listings:modify_financials"
  | "listings:share"
  | "showings:manage_team"
  | "showings:delegate"
  | "deals:view_financials"
  | "deals:create"
  | "newsletters:create"
  | "newsletters:send"
  | "newsletters:send_team"
  | "workflows:create"
  | "tasks:assign"
  | "content:create"
  | "content:publish"
  | "billing:access"
  | "data:export"
  | "integrations:manage";

const ROLE_PERMISSIONS: Record<string, TeamAction[]> = {
  owner: ["*"] as any, // Wildcard: all permissions
  admin: [
    "team:manage_settings", "team:invite_members", "team:remove_members", "team:view_audit_log",
    "contacts:view_team", "contacts:create", "contacts:delete", "contacts:share", "contacts:export",
    "listings:create", "listings:delete", "listings:modify_financials", "listings:share",
    "showings:manage_team", "showings:delegate",
    "deals:view_financials", "deals:create",
    "newsletters:create", "newsletters:send", "newsletters:send_team",
    "workflows:create", "tasks:assign",
    "content:create", "content:publish",
    "data:export", "integrations:manage",
  ],
  agent: [
    "contacts:view_team", "contacts:create", "contacts:share", "contacts:export",
    "listings:create", "listings:modify_financials", "listings:share",
    "showings:manage_team", "showings:delegate",
    "deals:view_financials", "deals:create",
    "newsletters:create", "newsletters:send",
    "workflows:create", "tasks:assign",
    "content:create", "content:publish",
    "data:export", "integrations:manage",
  ],
  assistant: [
    "contacts:create",
    "showings:manage_team",
    "tasks:assign", // Can assign tasks to themselves
    "content:create",
  ],
};

export function checkTeamPermission(
  session: { user: { teamId?: string; teamRole?: string } },
  action: TeamAction
): boolean {
  // Solo user: no team restrictions apply
  if (!session.user.teamId) return true;

  const role = session.user.teamRole;
  if (!role) return false;

  // Owner has wildcard
  if (role === "owner") return true;

  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

// Resource-level check: can this user modify THIS specific resource?
export function checkResourcePermission(
  session: { user: { id: string; teamRole?: string } },
  action: "delete" | "edit" | "share",
  resourceOwnerId: string
): boolean {
  const role = session.user.teamRole;
  if (!role || role === "owner" || role === "admin") return true;

  if (role === "agent") {
    // Agents can only modify their own resources
    return resourceOwnerId === session.user.id;
  }

  // Assistant cannot delete or share
  if (role === "assistant" && (action === "delete" || action === "share")) return false;

  return false;
}
```

### New Files & Modules

```
src/
├── app/(dashboard)/settings/team/
│   └── page.tsx                         # Team settings: members, invites, branding
├── app/(auth)/invite/
│   └── accept/page.tsx                  # Invite acceptance page (public route)
├── app/api/team/
│   ├── invite/route.ts                  # POST: send invite, GET: list pending
│   ├── members/route.ts                 # GET: list, PATCH: role change, DELETE: remove
│   ├── activity/route.ts               # GET: team activity feed (paginated)
│   └── offboard/route.ts               # POST: initiate offboarding flow
├── app/api/cron/
│   └── expire-invites/route.ts          # Weekly: expire stale invites
├── actions/
│   └── team.ts                          # createTeam, inviteMember, acceptInvite, updateRole,
│                                        # removeMember, offboardAgent, transferOwnership,
│                                        # getTeamMembers, getTeamActivity, logTeamActivity
├── components/team/
│   ├── TeamScopeToggle.tsx              # "My View" / "Team View" in MondayHeader
│   ├── TeamMembersTable.tsx             # Member management table
│   ├── InviteMemberDialog.tsx           # Invite modal (multi-email + role)
│   ├── TeamPipelineWidget.tsx           # Dashboard: team pipeline by status + per-agent
│   ├── TeamActivityFeed.tsx             # Activity feed component
│   ├── OffboardAgentDialog.tsx          # Offboarding wizard (reassignment choices)
│   ├── ContactVisibilitySelect.tsx      # Private/Team dropdown
│   └── AgentAvatarGroup.tsx             # Show multiple agent avatars on listings/deals
├── emails/
│   └── TeamInvite.tsx                   # Resend email: branded invite with CTA
├── lib/
│   ├── team-permissions.ts              # Permission checking (above)
│   ├── team-dedup.ts                    # Contact deduplication logic
│   ├── team-activity.ts                 # Activity logging helper
│   └── team-consent.ts                  # CASL team consent checks
└── types/
    └── team.ts                          # TeamRole, TeamPermission, TeamMember types
```

### Cron: Expire Stale Invites

```typescript
// /api/cron/expire-invites/route.ts
// Schedule: Weekly, Monday 6:00 AM
// Updates team_invites where status IN ('pending','sent') AND expires_at < now()
```

### Module-by-Module Impact Checklist

| Module | Files to Modify | Changes |
|--------|----------------|---------|
| **Contacts** | `actions/contacts.ts`, `ContactsTableClient.tsx`, `ContactForm.tsx` | Add visibility selector, assigned_to field, dedup check on create/share, team scope in list query |
| **Listings** | `actions/listings.ts`, `ListingsTableClient.tsx`, `ListingForm.tsx` | Add visibility, listing_agents UI, team scope in list query |
| **Showings** | `actions/showings.ts`, `ShowingsTableClient.tsx`, `StatusActions.tsx` | Add assigned_to, delegation UI, team-visible showing list |
| **Tasks** | `actions/tasks.ts` (or API), task list page | Add assigned_to dropdown, filter by assignee |
| **Deals** | `actions/deals.ts` (or API), pipeline page | Add deal_agents UI, commission split fields |
| **Newsletters** | `actions/newsletters.ts`, newsletter creation page | Add send_as toggle, team template scope, segment team filter |
| **Workflows** | `actions/workflows.ts`, enrollment logic | Add dedup check before enrollment |
| **Journeys** | `actions/journeys.ts`, cron processor | Add dedup check, rate limit per contact per team |
| **Calendar** | `actions/calendar.ts`, CalendarView | Add team availability aggregation |
| **Notifications** | `actions/notifications.ts`, NotificationDropdown | Add team routing config, prevent flood on bulk |
| **Command Palette** | `CommandPalette.tsx`, search API routes | Respect scope toggle, role-filter commands |
| **Dashboard** | `page.tsx`, dashboard widgets | Add Team View widgets (pipeline, activity) |
| **Settings** | Settings layout | Add `/settings/team` nav item (Owner/Admin only) |
| **Middleware** | `middleware.ts` | Add `/invite/accept` to public routes |
| **Auth** | `src/lib/auth.ts` | Add team context to JWT |
| **Tenant Client** | `src/lib/supabase/tenant.ts` | Enhance with scope param + team modes |
| **Export** | Wherever CSV export is triggered | Add field masking by role |
| **Onboarding** | Signup pages, onboarding wizard | Add team creation path |

---

## 7. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

**Week 1: Database + Auth**
- Run migration 098 (all schema changes)
- Enhance auth.ts: team context in JWT
- Create `team-permissions.ts` middleware
- Create `types/team.ts` type definitions
- Enhance `tenant.ts`: scope param support
- Create materialized view + refresh function

**Week 2: Core Team CRUD**
- `actions/team.ts`: createTeam, inviteMember, acceptInvite, updateRole, getTeamMembers
- Invite acceptance page (`/invite/accept`)
- `TeamInvite.tsx` email template (Resend)
- Team settings page (`/settings/team`) — member management
- `/api/cron/expire-invites` cron

**Week 3: Visibility & Sharing**
- Add TeamScopeToggle to MondayHeader
- Modify contacts list/detail: visibility select, assigned_to
- Modify listings list/detail: visibility select, listing_agents
- Modify showings: team view, assigned_to/delegation
- Contact dedup logic (`team-dedup.ts`)
- Command palette scope integration

**Week 4: Testing & Solo Regression**
- Full regression test: solo user flows unchanged
- Permission matrix integration tests (all 4 roles × all actions)
- Cross-team isolation tests (user from Team A cannot see Team B data)
- RLS policy verification tests
- Performance benchmarks: team queries < 200ms for teams of 20

**Launch Gate (Phase 1):**
- [ ] Team creation + invite + accept: end-to-end working
- [ ] All 4 roles enforced at server action level
- [ ] Contacts/Listings/Showings respect visibility + scope toggle
- [ ] Solo user: 0 test regressions
- [ ] Cross-team: 0 data leakage (verified by security test)
- [ ] Performance: team list queries < 200ms (team of 20 agents)

### Phase 2: Module Integration (Weeks 5-7)

**Week 5: Newsletter + Workflow + Journey**
- Newsletter: send_as toggle, team templates, segment team filter
- Workflow enrollment dedup (team-wide)
- Journey dedup + rate limiting
- Cron job updates (process-workflows, process-journeys)
- Daily digest cron: scope per-user correctly

**Week 6: Tasks, Deals, Calendar, Twilio**
- Tasks: assigned_to field + UI
- Deals: deal_agents table + UI + commission split fields
- Calendar: team availability aggregation for showing scheduler
- Twilio: team routing configuration (shared vs per-agent)

**Week 7: Notifications, Export, Activity**
- Team notification routing (configurable per event)
- CSV export field masking by role
- Export rate limiting + audit log
- Team activity feed (widget + API)
- Team dashboard widgets (pipeline, per-agent breakdown)

**Launch Gate (Phase 2):**
- [ ] Newsletters sendable as team brand
- [ ] Zero duplicate workflow/journey emails to same contact
- [ ] Tasks assignable and visible to assignee
- [ ] Team calendar shows aggregated availability
- [ ] Export respects role-based field masking
- [ ] Activity feed shows last 50 team events accurately

### Phase 3: Consent, Compliance & Offboarding (Weeks 8-9)

**Week 8: CASL + Offboarding**
- `contact_consents` table integration
- Consent checking on share + marketing
- Agent offboarding flow (reassignment wizard)
- Audit log integration (all security-sensitive actions)
- CASL consent expiry cron update (team-wide withdrawal)

**Week 9: Polish + Edge Cases**
- Team notes (private vs team visibility on communications)
- Contact merge workflow for dedup resolution
- Ownership transfer flow (Owner → Admin)
- Performance optimization (materialized view refresh scheduling)

**Launch Gate (Phase 3):**
- [ ] CASL consent tracked per-contact per-purpose
- [ ] Offboarding cleanly reassigns all data
- [ ] Audit log captures all sensitive actions
- [ ] Consent withdrawal propagates team-wide

### Phase 4: Analytics & Billing (Weeks 10-11)

**Week 10: Analytics + Billing**
- Team analytics dashboard (per-agent breakdown)
- Performance metrics: deals, showings, response time, conversions
- Seat-based billing enforcement
- Plan upgrade/downgrade paths

**Week 11: Advanced**
- Round-robin lead distribution
- Team templates (newsletter + workflow)
- Commission splits UI + reporting
- Performance leaderboard (gamification)

---

## 8. Billing Options (Decision Required)

### Option A: Per-Seat Flat Rate (Recommended for simplicity)
| Plan | Price | Seats | Features |
|------|-------|-------|----------|
| Solo | $49/mo | 1 | All current features, no team |
| Team | $39/agent/mo | 2-15 | + Shared data, team dashboard, lead assignment, team newsletters, analytics |

**Value:** Team of 5 = $195/mo vs Follow Up Boss $345/mo (43% savings).

### Option B: Tiered Fixed Plans
| Plan | Price | Seats | Features |
|------|-------|-------|----------|
| Solo | $49/mo | 1 | All current features |
| Team S | $149/mo | Up to 5 | Sharing, dashboard, assignment |
| Team M | $299/mo | Up to 15 | + Analytics, round-robin, audit log |

### Option C: Hybrid (Base + Per-Seat)
| Plan | Base | Per-Seat | Features |
|------|------|----------|----------|
| Solo | $49/mo | — | All current features |
| Team | $99/mo | +$25/agent | All team features |

**Implementation notes:**
- Mid-cycle seat additions: prorated to next billing date
- Seat removal: effective immediately, no refund for current cycle
- Enforce seat limit at invite time (cannot invite if at max)
- Downgrade path: Team → Solo = keep own data, lose team features, members disconnected

---

## 9. Risks & Mitigations

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|------------|
| **Cross-team data leakage** | Critical | Agent on Team A sees Team B's data | Triple-layer defense: app-level permission check + tenant client scope + RLS policies. Automated security test suite runs nightly. Materialized view bounds team membership. |
| **Solo user regression** | Critical | Existing 100% of users break | All team code behind `if (session.user.teamId)` guard. Full regression test suite. Feature flag for gradual rollout. Zero changes to single-user query path. |
| **CASL consent violation** | Critical | Legal liability for improper marketing | Consent check at share time + send time. Team-wide withdrawal propagation. Audit log on consent decisions. Warning (not blocking) when sharing without data_sharing consent. |
| **Duplicate sends** | High | Same contact gets 2x emails from team | Dedup key on workflow_enrollments (team + contact + blueprint). Rate limit: 1 auto-email per 24h per contact per team. Check before send in cron. |
| **Performance degradation** | High | Team queries 10-15x slower than single-user | Materialized view for team member IDs (refresh on membership change, not per-query). Indexes on (visibility, realtor_id). Query planner tested with 15-agent teams. |
| **Role escalation attack** | Critical | Agent promotes self to admin | Role changes ONLY by Owner/Admin, enforced server-side. Audit log every role change. JWT teamRole from DB on each session refresh (not self-declared). |
| **Agent departure data loss** | High | Contacts/deals orphaned or deleted | Formal offboarding flow required. Soft-delete membership. Data reassignment before removal. Activity history preserved. |
| **Notification flood** | Medium | Bulk action triggers 500 notifications | Aggregate notifications for bulk operations (one summary, not per-record). Configurable notification preferences per event type. |
| **Dedup conflicts** | Medium | Two agents claim same contact | Merge requires team leader approval when cross-agent. Ownership dispute flag with resolution workflow. |
| **Migration complexity** | Medium | 60+ tables need changes | Only add visibility/assigned_to to 3 core tables. Other tables inherit visibility via FK. Migration is additive (no column drops). Rollback plan: simply ignore new columns. |
| **Webhook routing** | Medium | Twilio/Resend webhook hits wrong agent | Webhook payloads include metadata (listing_agent_id, campaign_sender_id). Route based on metadata, not session. |
| **Calendar token expiry** | Low | Team availability check fails for one agent | Graceful degradation: show "unavailable info" for that agent. Notification to reconnect. Never block team scheduling. |

---

## 10. Why This Is Different

**What makes this different from Follow Up Boss + kvCORE + LionDesk:**

1. **Every module, one migration** — This isn't a "team add-on" bolted onto contacts only. Contacts, listings, showings, deals, tasks, newsletters, workflows, journeys, calendar, content, notifications, search — all become team-aware in a single architectural change. Competitors took years of incremental patches (and it shows in UX inconsistency).

2. **Progressive sharing, not all-or-nothing** — Contacts and listings start PRIVATE by default. Agents explicitly share what's relevant. kvCORE dumps everything into a shared pool. FUB is binary (shared ON or OFF for the whole account). Realtors360 gives agents control over their own book of business while enabling team collaboration — the privacy/transparency balance that real teams need.

3. **Workflow deduplication built-in from day one** — The #1 complaint about team CRMs is "my client got the same drip email from three agents." We solve this at the architecture level: team-wide dedup key on enrollments, rate limiting per contact per team, send-time verification. Not a patch — a design principle.

4. **CASL/PIPEDA compliance native** — No other team CRM tracks consent per-contact per-purpose with `granted_to` scope (agent vs. team). When a team shares contacts, consent must be explicit for data sharing — we enforce this with warnings and audit trails. kvCORE and FUB simply ignore this.

5. **Solo users are unaffected** — Every line of team code is behind `if (teamId)`. Solo users get zero UI changes, zero performance overhead, zero new concepts. They upgrade when ready. Competitors force team UX on everyone.

6. **Role-based visibility, not just access** — Assistants see only assigned records (no information overload). Agents see own + shared (clean workspace). Owners see everything (full pipeline). The SCOPE determines what data loads — it's not "hide the button but return the data in the API." Server-side enforcement at the query level.

7. **Offboarding protocol** — No competitor has a structured agent departure flow. They let admins manually reassign contacts one by one. We present the full impact (X contacts, Y deals, Z automations) and offer batch reassignment with automation pausing. Because in real estate, agents leave. It should take 2 minutes, not 2 hours.

8. **Built for Canadian agents specifically** — FINTRAC compliance, BCREA forms, CASL consent, and BC-specific enrichment (ParcelMap, LTSA) all work at team level. Co-listed agents both access the 8-phase workflow. No other team CRM understands Canadian regulatory requirements at this depth.

---

> **Version:** 2.1 | April 20, 2026
> **Based on:** Full codebase audit (60+ tables, 18 action files, 14 cron jobs), competitive analysis (Follow Up Boss, kvCORE, LionDesk), CASL/PIPEDA/GDPR compliance research, NAR 2025 team statistics, industry RBAC patterns

<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->

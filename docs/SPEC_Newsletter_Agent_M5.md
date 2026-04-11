# SPEC: Newsletter Agent — M5

> **Status:** DRAFT, needs user sign-off on §3 (Open Decisions) before implementation.
> **Author:** Claude (M4 session, 2026-04-08)
> **Foundation:** Builds on Newsletter Engine v3 M1→M4. Requires M3-D + M4 merged first.
> **Branch when implemented:** `claude/newsletter-m5-agent` off `feat/newsletter-engine-v3` (after M4 merges)

---

## 1. What changed since the original v3 architecture

The original 2026-04-07 design described the newsletter service as **15 pipelines** (one per email type) coordinated by a thin "AI orchestrator." On 2026-04-07 the user reframed it: **"we are talking about building a newsletter agent."**

That reframe is meaningful. It means:

- The brain is **one agent**, not 15 pipelines
- Pipelines, crons, and scrapers become **tools the agent can call**, not the primary architecture
- The agent decides *what to send*, *to whom*, *when*, *why* — using Claude's `tool_use` loop with the existing newsletter service as a side-effect substrate

This spec defines the agent layer. It does **not** delete the M1–M4 work — that's all the substrate the agent runs on. It adds a coordinator above it.

---

## 2. Architecture

```
                                ┌────────────────────────────────────┐
                                │  Newsletter Agent (M5)             │
                                │  Claude tool_use loop              │
                                │                                    │
                                │  ┌──────────────────────────────┐  │
                                │  │ System prompt: persona +     │  │
                                │  │ realtor voice profile +      │  │
                                │  │ adaptive marketing rules     │  │
                                │  └──────────────────────────────┘  │
                                │                                    │
                                │  ┌──────────────────────────────┐  │
                                │  │ Tool loop (max 12 turns)     │  │
                                │  │  READ → DECIDE → WRITE       │  │
                                │  └──────────────────────────────┘  │
                                └────────┬───────────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
        ▼                                ▼                                ▼
┌───────────────┐               ┌────────────────┐               ┌────────────────┐
│ READ tools    │               │ DECIDE tools   │               │ WRITE tools    │
│ (no side fx)  │               │ (pure compute) │               │ (irreversible) │
├───────────────┤               ├────────────────┤               ├────────────────┤
│ list_contacts │               │ score_intent   │               │ draft_email    │
│ get_contact   │               │ check_freq_cap │               │ render_template│
│ get_listings  │               │ pick_template  │               │ send_email     │
│ search_rag    │               │ generate_copy  │               │ queue_approval │
│ get_market    │               │ classify_event │               │ log_decision   │
│ get_events    │               │                │               │ schedule_send  │
│ get_intel     │               │                │               │                │
└───────────────┘               └────────────────┘               └────────────────┘
        │                                │                                │
        ▼                                ▼                                ▼
                            ┌────────────────────────┐
                            │ Substrate (M1-M4)      │
                            │ - 5 pipelines          │
                            │ - 4 ported crons       │
                            │ - hybrid RAG retriever │
                            │ - Resend / Voyage /    │
                            │   Anthropic / Bull /   │
                            │   Supabase             │
                            └────────────────────────┘
```

The agent **does not contain business logic.** Per playbook §1.6:
- **Agent** = decides + orchestrates
- **Tool** = deterministic function with typed schema, all logic lives here
- **Task** = logged unit of work

Every tool returns structured JSON, not free text. Every tool's input AND output is Zod-validated. Side-effecting tools (`send_email`, `queue_approval`, `log_decision`) are idempotent or write a transaction-id check.

---

## 3. Open decisions (need user sign-off)

These are the 5 questions I asked at the start of the session that haven't been answered. I'm proposing defaults — if any of these is wrong, fixing them costs nothing now but ~a week of code rework after implementation.

### 3.1 Trigger model

| Option | Description | Trade-off |
|---|---|---|
| (a) Scheduled tick | Agent wakes hourly, surveys state, decides actions | Predictable cost, slow to react to events |
| (b) Event-driven | CRM publishes event → agent reacts immediately | Fast, but cost spikes with traffic |
| **(c) BOTH (proposed default)** | Hourly surveys + event reactions for high-priority events (new listing match, price drop, milestone) | Best of both. Survey loop catches what events miss; events catch what surveys can't wait for |

**Default if no answer:** (c) BOTH. Hourly cron tick + event subscriber on `email_events` table with priority filter.

### 3.2 Autonomy level

| Option | Description | When to use |
|---|---|---|
| (a) Always auto-send | Agent sends without realtor approval | Cheap experiments, low-stakes content (birthdays, market updates) |
| (b) Always approval queue | Every email goes through realtor approval | Conservative, slow, doesn't scale past ~10 emails/day |
| **(c) Trust-based (proposed default)** | Per-contact trust level dictates auto vs approval. Trust grows with positive feedback (opens, clicks, replies) and shrinks with negative (unsubscribes, complaints, bounces). New contacts start at L0 (always approval); L2+ contacts get auto-send for low-stakes types |

**Default if no answer:** (c) Trust-based, starting conservative:
- **L0 (new contact, no history):** ALL emails go to approval queue
- **L1 (≥3 successful sends, no negatives):** Birthdays, anniversaries, market updates auto-send. Listing match, price drop go to approval.
- **L2 (≥10 successful sends, ≥1 reply):** All low-stakes types auto-send. High-stakes (cold pitch, re-engagement) still approval.
- **L3 (≥1 closed deal):** Everything auto-send except FINTRAC-adjacent and legal-adjacent.

This matches the existing voice-learning trust model (`project_voice_learning.md`).

### 3.3 Scope of one agent run

| Option | Description | Trade-off |
|---|---|---|
| (a) Per-realtor | One agent loop iterates all contacts, batches decisions | Cheap (one Claude conversation), shallow per-contact reasoning |
| (b) Per-contact | One agent loop per contact, parallel up to N | Deep per-contact reasoning, expensive (N Claude conversations) |
| **(c) Hybrid (proposed default)** | Per-realtor planning loop decides "who needs attention" → spawns per-contact loops only for the chosen contacts | Cheap + deep where it matters |

**Default if no answer:** (c) Hybrid. Per-realtor "triage" agent runs on every cron tick, identifies up to 20 contacts needing action, spawns per-contact agents in parallel (max 5 concurrent to respect Anthropic rate limits).

### 3.4 Tool list (initial v1)

Proposed initial set — 17 tools across READ / DECIDE / WRITE.

**READ (no side effects, idempotent):**

| Tool | Input | Output | Source |
|---|---|---|---|
| `list_contacts` | `{ realtor_id, filters?: {...}, limit }` | `Contact[]` | tenant client query |
| `get_contact` | `{ contact_id }` | `ContactProfile` (with intel JSONB) | tenant client query |
| `get_listings` | `{ realtor_id, status?, limit }` | `Listing[]` | tenant client query |
| `search_rag` | `{ query, filters, top_k }` | `{ formatted, sources }` | M4 retriever (`retrieveContext`) |
| `get_market_stats` | `{ area, period }` | `MarketStats` | `market_stats_cache` table (M2) |
| `get_recent_events` | `{ realtor_id, since, types? }` | `EventRow[]` | `email_events` table (M2) |
| `get_engagement_intel` | `{ contact_id }` | `NewsletterIntelligence` | `contacts.newsletter_intelligence` JSONB |

**DECIDE (pure compute, no side effects):**

| Tool | Input | Output |
|---|---|---|
| `score_intent` | `{ contact_id, recent_signals }` | `{ intent: 'cold'\|'warm'\|'hot', score 0-100, reasons[] }` |
| `check_frequency_cap` | `{ contact_id, email_type }` | `{ allowed: bool, last_sent_at, cap_remaining }` |
| `pick_template` | `{ email_type, contact_intel, listing? }` | `{ template_id, variables }` |
| `generate_copy` | `{ template_id, variables, voice_profile }` | `{ subject, body_html, body_text }` (calls Claude) |
| `classify_trust_level` | `{ contact_id, history }` | `'L0'\|'L1'\|'L2'\|'L3'` |

**WRITE (side effects, idempotent):**

| Tool | Input | Output | Idempotency key |
|---|---|---|---|
| `draft_email` | `{ contact_id, template_id, content }` | `{ draft_id }` | `(contact_id, email_type, content_hash)` |
| `queue_for_approval` | `{ draft_id, urgency }` | `{ approval_id }` | `draft_id` |
| `send_email` | `{ draft_id, override_approval? }` | `{ resend_id, status }` | `draft_id` |
| `schedule_send` | `{ draft_id, send_at }` | `{ scheduled_id }` | `draft_id` |
| `log_decision` | `{ contact_id, decision, reasoning, tool_calls[] }` | `{ log_id }` | `(contact_id, run_id)` |

**Anything missing?** The user might want:
- `cancel_scheduled_send` (revoke a future send)
- `update_contact_intel` (write back intelligence the agent inferred — but this should probably be a side effect of `log_decision`, not a user-callable tool)
- `get_competitor_signals` (cross-realtor learning — but this is a separate sprint per `project_competitive_intelligence.md`)

**Default if no answer:** ship the 17 above for v1. Add others as the agent demonstrates need.

### 3.5 Where it runs

The agent layer lives **inside the existing newsletter service** (`realtors360-newsletter/src/agent/`). Same Render deployment. Same Bull queue for triggering. Reasons:
- Same DB connection pool, no extra credentials
- Reuses M1–M4 substrate (pipelines, crons, RAG retriever) as direct imports
- Render starter plan ($7/mo web + $7/mo worker) is already paid for and has headroom

**Default if no answer:** keep it in the newsletter service. Don't spin up a new Render service for this.

---

## 4. File layout (when implemented)

```
realtors360-newsletter/src/agent/
├── orchestrator.ts          # Main agent loop (Claude tool_use)
├── system-prompt.ts         # Agent persona + voice profile assembly
├── tools/
│   ├── index.ts             # Tool registry (Zod schemas + handlers)
│   ├── read/
│   │   ├── list-contacts.ts
│   │   ├── get-contact.ts
│   │   ├── get-listings.ts
│   │   ├── search-rag.ts    # Wraps M4 retrieveContext
│   │   ├── get-market-stats.ts
│   │   ├── get-recent-events.ts
│   │   └── get-engagement-intel.ts
│   ├── decide/
│   │   ├── score-intent.ts
│   │   ├── check-frequency-cap.ts
│   │   ├── pick-template.ts
│   │   ├── generate-copy.ts
│   │   └── classify-trust-level.ts
│   └── write/
│       ├── draft-email.ts
│       ├── queue-for-approval.ts
│       ├── send-email.ts
│       ├── schedule-send.ts
│       └── log-decision.ts
├── triage/
│   ├── per-realtor-loop.ts  # Hourly cron — picks contacts needing action
│   └── per-contact-loop.ts  # Spawned by triage; deep per-contact reasoning
└── trust/
    ├── trust-level.ts       # L0-L3 promotion logic
    └── feedback-events.ts   # opens/clicks/replies/unsubscribes → trust delta
```

```
realtors360-newsletter/tests/agent/
├── tools/                   # Per-tool unit tests (mock DB, mock Claude)
├── triage.test.ts           # End-to-end with mocked Claude
└── trust.test.ts            # Trust promotion math
```

---

## 5. Database additions (migration 077)

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `agent_runs` | Each agent loop invocation | `id, realtor_id, trigger_type, started_at, completed_at, contact_ids_evaluated, decisions_made, status, error_message` |
| `agent_decisions` | Per-decision audit trail | `id, run_id, contact_id, decision_type, reasoning, tool_calls (JSONB), outcome, override_by_realtor` |
| `agent_drafts` | Drafts pending approval / send | `id, contact_id, email_type, content_hash, subject, body_html, body_text, status, idempotency_key, created_at` |
| `contact_trust_levels` | L0-L3 per contact | `contact_id, realtor_id, level, last_promoted_at, positive_signals, negative_signals` |

All tables: `realtor_id NOT NULL`, indexed, RLS scoped per HC-12/14. Migration 077 idempotent.

---

## 6. Open question that doesn't need a decision yet

**How does the agent learn the realtor's voice?** The voice-learning project memory (`project_voice_learning.md`) describes a system that extracts writing rules from realtor edits. That system isn't built yet. For M5 v1, the agent uses a hard-coded voice profile (tone: warm, formal, BC realtor) and the realtor manually edits drafts. M6+ wires the voice-learning loop in.

---

## 7. Estimate — what M5 looks like as a session

Per HC-15 / playbook discipline, this is one large session OR three medium sessions:

**Single large session (recommended if user wants velocity):**
- M5-A: Tool registry + 7 READ tools + tests
- M5-B: 5 DECIDE tools + tests
- M5-C: 5 WRITE tools + migration 077 + idempotency tests
- M5-D: Orchestrator loop + per-realtor triage + per-contact loop
- M5-E: Trust level system + feedback event hooks
- Total: ~20 files, ~3000 LoC, ~80 new tests

**Three medium sessions (recommended if user wants safer increments):**
- Session 1 (M5-A): Migration 077 + READ tools + DECIDE tools (no Claude calls yet — pure data layer)
- Session 2 (M5-B): WRITE tools + orchestrator + per-realtor triage (the agent loop comes alive)
- Session 3 (M5-C): Trust system + feedback hooks + e2e test against real Resend sandbox

I'd recommend **3 sessions**. The agent loop is the highest-risk part — getting tools wrong only costs a re-run, but getting the orchestrator wrong costs deleted data or duplicate sends.

---

## 8. Things explicitly OUT of scope for M5

Listed so they don't accidentally creep in:

- **Voice learning loop** — M6 (waits for existing voice-learning skeleton)
- **Cross-realtor competitive intelligence** — separate sprint per `project_competitive_intelligence.md`
- **A/B testing at the per-contact level** — M7
- **Adaptive marketing weekly cycle** — uses M3-C `weekly-learning` cron, no agent involvement
- **50 email types** — M5 ships with the 5 types from M2 + the templates added in M3-x. New types are added one per session.
- **Real-time event streaming via webhooks** — M5 polls `email_events` table on a 1-minute cron. Webhooks come in M6.
- **Agent-driven phone calls / SMS** — out of newsletter scope, belongs to the voice agent

---

## 9. What needs user sign-off before M5 starts

In one message, the user can say:

> "M5 OK. Defaults from §3.1, §3.2, §3.3, §3.4, §3.5 are fine. Do it as 3 sessions per §7. Start with M5-A."

OR pick differently per question. The implementation only needs answers to §3.1–3.5; everything else is fixed in this spec.

---

## 10. References

- `realtors360-newsletter/` — substrate (M1-M4)
- `realestate-crm/.claude/agent-playbook.md` §1.6 (Agent vs Tool vs Task boundaries)
- `realestate-crm/.claude/agent-playbook.md` §1.7 (Multi-tenancy)
- `MASTER_NEWSLETTER_PLAN.md` — authoritative roadmap
- Memory: `project_newsletter_engine_v3.md`, `project_ai_agent_architecture.md`,
  `project_voice_learning.md`, `project_adaptive_marketing.md`,
  `project_business_intelligence.md`

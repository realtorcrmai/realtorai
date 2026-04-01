# Design Documents

Located in repo root:

| Document | Description |
|----------|-------------|
| `ListingFlow_Realtor_Workflow_Design_Document.docx` | Complete 12-phase BC realtor listing lifecycle specification |
| `ListingFlow_Gap_Analysis_Report.docx` | Comparative analysis: design doc vs current implementation |
| `ListingFlow_Gap_Analysis_Report.md` | Same gap analysis in Markdown format |
| `PRD_Newsletter_Journey_Engine.md` | Full PRD for AI newsletter & journey engine |
| `PLAN_Email_Marketing_Engine.md` | 12-deliverable implementation plan (4 phases) |
| `PLAN_AI_Agent.md` | AI agent layer plan (lead scoring, send advisor, recommendations) |
| `SPEC_AI_Agent_Email_Marketing.md` | Technical specification for AI agent layer |

### Functional Specs & Guides
| Document | Location |
|----------|----------|
| `Email_Marketing_Engine.md` | `docs/functional-specs/` and `functional-specs/` |
| `Email_Marketing_User_Guide.html` | `guides/` — customer-facing HTML guide |
| `evals.md` | `realestate-crm/` — 200 QA test cases |

### QA Test Runner
```bash
# Run automated QA tests for the email marketing engine
RESEND_API_KEY=<key> ANTHROPIC_API_KEY=<key> CRON_SECRET=<secret> \
  node scripts/qa-test-email-engine.mjs
```

### Gap Analysis Summary (March 2026)
- **Overall coverage: ~40%** (34 built, 13 partial, 38 missing)
- **Strongest areas:** Data Enrichment (90%), Form Preparation (85%), Listing Intake (75%)
- **Major gaps:** Offer Management (0%), Contract-to-Close (0%), Post-Closing (10%)
- **Bonus features not in doc:** Content Engine (Claude + Kling AI), WhatsApp integration, AI Newsletter Engine

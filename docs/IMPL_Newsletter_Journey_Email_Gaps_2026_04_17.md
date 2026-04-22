<!-- docs-audit: none --># Implementation Plan — Newsletter, Journey & Email Quality Gaps
**Date:** 2026-04-17  
**Source:** Session audit covering newsletter functionality, contact intelligence/journey workflows, and email generation quality  
**Status:** PENDING EXECUTION

---

## Executive Summary

This plan addresses **25 gaps** discovered across three audit areas:

| Area | Gaps | Critical | High | Medium | Low |
|------|------|----------|------|--------|-----|
| A: Newsletter System | 9 | 0 | 3 | 4 | 2 |
| B: Journey & Intelligence | 6 | 1 | 3 | 1 | 1 |
| C: Email Quality & Design | 10 | 0 | 4 | 4 | 2 |
| **Total** | **25** | **1** | **10** | **9** | **5** |

**Estimated total effort:** 12–16 engineer days across 4 sprints

---

## Gap Registry

### Area A — Newsletter System Gaps

| ID | Gap | Priority | Effort | File(s) Affected |
|----|-----|----------|--------|-----------------|
| G-N01 | Column name mismatch `html_content` vs `html_body` in `/api/newsletters/edit` | P1-High | 1h | `src/app/api/newsletters/edit/route.ts` |
| G-N02 | Deferred newsletters wrongly shown in approval queue UI | P2-Med | 2h | `src/actions/newsletters.ts`, `src/components/newsletters/ApprovalQueueClient.tsx` |
| G-N03 | Missing event emissions in 3 locations (generate, send, webhook) | P1-High | 3h | `src/actions/newsletters.ts`, `src/app/api/webhooks/resend/route.ts` |
| G-N04 | Bulk approve hits Vercel 10s timeout for large campaigns | P2-Med | 4h | `src/actions/newsletters.ts` |
| G-N05 | No CASL consent expiry check (2-year BC law requirement) | P1-High | 4h | `src/actions/newsletters.ts`, DB migration needed |
| G-N06 | Compliance blocklist incomplete (6 rules, needs ~12) | P3-Low | 2h | `src/lib/text-pipeline.ts` |
| G-N07 | A/B testing page exists but logic is unimplemented | P2-Med | 8h | `src/app/(dashboard)/newsletters/ab-testing/page.tsx`, new action |
| G-N08 | No "Regenerate" button in approval queue UI | P2-Med | 3h | `src/components/newsletters/ApprovalQueueClient.tsx` |
| G-N09 | No error monitoring on newsletter send / webhook critical paths | P3-Low | 4h | `src/lib/resend.ts`, `src/app/api/webhooks/resend/route.ts` |

### Area B — Journey & Intelligence Gaps

| ID | Gap | Priority | Effort | File(s) Affected |
|----|-----|----------|--------|-----------------|
| G-J01 | Listing status change never triggers journey phase advance | **P0-Critical** | 6h | `src/actions/listings.ts`, `src/actions/journeys.ts` |
| G-J02 | Send governor completely bypassed in journey queue | P1-High | 4h | `src/actions/journeys.ts`, `src/lib/send-governor.ts` |
| G-J03 | Phase exhaustion silently freezes journey (`next_email_at = NULL`) | P1-High | 3h | `src/actions/journeys.ts` |
| G-J04 | Lead scoring has no daily cron — AI hints go stale | P1-High | 3h | New cron endpoint, `src/lib/ai-agent/lead-scorer.ts` |
| G-J05 | Hard bounce doesn't decay engagement score | P2-Med | 2h | `src/app/api/webhooks/resend/route.ts` |
| G-J06 | Complaint and unsubscribe handled identically — no CASL separation | P2-Med | 2h | `src/app/api/webhooks/resend/route.ts` |

### Area C — Email Quality & Design Gaps

| ID | Gap | Priority | Effort | File(s) Affected |
|----|-----|----------|--------|-----------------|
| G-E01 | Two competing design systems (purple CRM vs forest green editorial) | P1-High | 8h | `src/lib/email-blocks.ts`, editorial blocks |
| G-E02 | No design token file — 50+ hardcoded hex values | P1-High | 4h | New `src/lib/email-design-tokens.ts` |
| G-E03 | No modular typography scale — 11–32px with no rhythm | P2-Med | 3h | `src/lib/email-blocks.ts`, all block files |
| G-E04 | No 8px spacing grid — padding values scattered | P2-Med | 3h | `src/lib/email-blocks.ts`, all block files |
| G-E05 | Journey phase / contact state does not influence block layout | P1-High | 8h | `src/lib/email-blocks.ts`, `src/lib/newsletter-ai.ts` |
| G-E06 | `priceBar` block renders as UI widgets, not editorial text | P2-Med | 3h | `src/lib/email-blocks.ts` |
| G-E07 | `openHouse` block uses coral gradient — too loud for luxury listings | P2-Med | 2h | `src/lib/email-blocks.ts` |
| G-E08 | No luxury listing template composition matching EVVancouver reference | P1-High | 8h | `src/lib/email-blocks.ts`, new template |
| G-E09 | Photo grid has no aspect-ratio enforcement or fallback | P3-Low | 3h | `src/lib/email-blocks.ts` |
| G-E10 | CTA button uses gradient/heavy treatment — not premium | P3-Low | 2h | `src/lib/email-blocks.ts` |

---

## Sprint Plan

### Sprint 1 — Critical Fixes (Week 1)
**Goal:** Stop active data corruption and unblock the full lifecycle loop

| ID | Task | Day |
|----|------|-----|
| G-N01 | Fix `html_content` → `html_body` column mismatch | 1 |
| G-J01 | Wire listing status changes to journey phase advancement | 1–2 |
| G-J02 | Add send governor call to `processJourneyQueue()` | 2 |
| G-J03 | Handle phase exhaustion — auto-advance or pause gracefully | 3 |
| G-N03 | Add missing `emitNewsletterEvent()` calls in generate + send + webhook | 3 |
| G-J05 | Decay engagement score on hard bounce | 4 |
| G-J06 | Split complaint vs unsubscribe webhook handlers | 4 |

**Deliverables:** All P0 + P1-High journey gaps fixed. Newsletter data integrity restored.

---

### Sprint 2 — Newsletter System Polish (Week 2)
**Goal:** Complete the approval queue, CASL compliance, and bulk operations

| ID | Task | Day |
|----|------|-----|
| G-N02 | Fix deferred newsletter display in approval queue | 5 |
| G-N05 | Add CASL consent expiry (migration + gate in sendNewsletter) | 5–6 |
| G-N08 | Add "Regenerate" button to approval queue | 6 |
| G-J04 | Add daily cron for lead scoring batch | 7 |
| G-N04 | Migrate bulk approve to streaming / background job | 7–8 |
| G-N06 | Expand compliance blocklist to 12+ rules | 8 |

**Deliverables:** Full CASL compliance, approval UX improved, journey AI hints stay fresh.

---

### Sprint 3 — Email Design System (Week 3)
**Goal:** Unified design tokens, premium block redesigns

| ID | Task | Day |
|----|------|-----|
| G-E02 | Create `email-design-tokens.ts` with full token set | 9 |
| G-E01 | Merge design systems — single token-based color palette | 9–10 |
| G-E03 | Apply modular type scale across all blocks | 10 |
| G-E04 | Apply 8px spacing grid across all blocks | 10 |
| G-E06 | Redesign `priceBar` — editorial text metrics, no box widgets | 11 |
| G-E07 | Redesign `openHouse` — minimal bordered card, no gradient | 11 |
| G-E10 | Redesign CTA button — clean dark/white, no gradient | 11 |
| G-E09 | Add photo aspect-ratio enforcement and fallback placeholder | 12 |

**Deliverables:** Consistent, premium email design system. All blocks use tokens.

---

### Sprint 4 — Smart Layout & Luxury Template (Week 4)
**Goal:** Journey-aware block composition, Apple-quality listing email

| ID | Task | Day |
|----|------|-----|
| G-E05 | Build journey-phase → block layout mapping system | 13–14 |
| G-E08 | Build luxury listing template (EVVancouver reference quality) | 14–15 |
| G-N07 | Implement A/B testing variant selection and tracking | 15–16 |
| G-N09 | Add error monitoring hooks on send + webhook critical paths | 16 |

**Deliverables:** Every contact phase gets a distinct email layout. Luxury listing template ships.

---

## Dependencies

```
G-E02 (tokens) must precede G-E01 (merge systems)
G-E01 must precede G-E03, G-E04, G-E06, G-E07, G-E10
G-J01 must precede G-J03 (phase advance triggers exhaustion handling)
G-J04 (lead scoring cron) feeds G-E05 (journey layout mapping)
G-N05 (CASL expiry) requires DB migration before code changes
G-N07 (A/B testing) depends on G-N08 (regenerate) being done first
```

---

## Success Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| Contacts reaching `past_client` phase | 0% (broken) | 100% of closed listings |
| Contacts reaching `under_contract` phase | 0% (broken) | 100% of conditional listings |
| Send governor enforcement rate | 0% | 100% of journey sends |
| Frozen journeys (next_email_at = NULL) | Unknown | 0 |
| Lead scores refreshed daily | 0 contacts | All active contacts |
| Email design token coverage | 0% | 100% of blocks use tokens |
| CASL consent expiry compliance | Not tracked | Checked on every send |
| Luxury template live | No | Yes |

---

## Related Documents

- [PRD: Newsletter System Gaps](PRD_Newsletter_System_Gaps.md)
- [PRD: Journey & Intelligence Gaps](PRD_Journey_Intelligence_Gaps.md)
- [PRD: Email Quality & Design Redesign](PRD_Email_Quality_Redesign.md)
- [Test Plan: All Gap Fixes](TEST_PLAN_Gap_Fixes_2026_04_17.md)
- [Existing TEST_PLAN_1000.md](TEST_PLAN_1000.md) — add new cases to sections 8, 11, 14

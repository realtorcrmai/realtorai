<!-- Extracted from CLAUDE.md v1 during 2026-04-21 audit. See also: AGENTS.md for policy, CLAUDE.md for agent conventions. -->
<!-- docs-audit: src/** -->

# Known Issues & Improvement Areas

- **Contacts:** Filter bar (type/stage/engagement) + bulk operations (stage change, CSV export, delete) now built. Buyer agents still flat text, no archiving (hard delete only). 200-item cap still in place (no server-side pagination).
- **Communications:** Gmail for 1:1 (plain text), Resend for newsletters, no threading. Timeline now has Load More (50 limit + pagination). Showing SMS uses seller pref_channel.
- **UI/UX (2026-04-12 audit):** Mobile collapsible sidebars on 3 detail pages. Responsive form grids. Loading skeletons for listings/showings. Newsletter queue Preview button. Dashboard newLeadsToday live. Remaining gaps: ListingWorkflow.tsx 1,138-line monolith, no server-side pagination.
- **Workflow:** DocuSign UI exists but API unconfirmed, no Paragon API (Phase 8 manual), Phases 9-12 missing, no offer management. First pending phase now auto-expands.
- **Accessibility (2026-04-12):** Muted foreground contrast fixed (#476380, 5.2:1). Workflow step aria-labels. ContactForm aria-describedby. Print styles added. Remaining: not all forms have a11y annotations.
- **Compliance:** FINTRAC sellers only (not buyers), no Receipt of Funds, no retention policy, CASL consent no expiry tracking
- **Onboarding:** Full system built -- 5-step wizard (/onboarding), 6-screen personalization (/personalize), sample data seeding (5 contacts + 3 listings + 2 showings + 1 newsletter with `is_sample` flag), post-onboarding confetti + welcome tour + checklist (5 items) + NPS survey, 7-email branded drip sequence, empty states on listings/contacts/showings pages, new agent dashboard guide for `new_agent` persona, `data-tour` attributes on sidebar nav for guided tours. Migration 103 required.

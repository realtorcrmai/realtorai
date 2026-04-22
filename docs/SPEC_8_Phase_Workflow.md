<!-- Extracted from CLAUDE.md v1 during 2026-04-21 audit. See also: AGENTS.md for policy, CLAUDE.md for agent conventions. -->
<!-- docs-audit: src/actions/workflow.ts, src/components/workflow/** -->

# 8-Phase Listing Workflow

The CRM implements an 8-phase listing workflow (designed but not yet fully migrated to DB — `current_phase` column does not exist on `listings` table yet):

| Phase | Name | Key Features |
|-------|------|-------------|
| 1 | Seller Intake | FINTRAC identity collection, property details, commissions, showing instructions |
| 2 | Data Enrichment | BC Geocoder (API), ParcelMap BC (API), LTSA (manual), BC Assessment (manual) |
| 3 | CMA Analysis | Comparable market analysis fields |
| 4 | Pricing & Review | List price confirmation, price lock, marketing tier |
| 5 | Form Generation | 12 BCREA forms auto-filled via Python Realtors360 server |
| 6 | E-Signature | DocuSign envelope tracking (UI exists, integration partial) |
| 7 | MLS Preparation | Claude AI remarks generation, photo management |
| 8 | MLS Submission | Manual submission step (no Paragon API integration) |

Phase advancement is sequential with audit trail logging.

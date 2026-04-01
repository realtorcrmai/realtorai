# Known Issues & Improvement Areas

### Contact Management
- Minimal fields (no address, lead source, lead status, tags)
- No contact deletion or archiving
- No search bar on contacts page
- Buyer agents stored as flat text on appointments, not as contacts
- No relationship mapping between contacts

### Communication System
- Gmail API integration exists for 1:1 email (plain text only)
- Resend integration for newsletters (AI-powered, HTML templates)
- Flat timeline with no conversation threading or filtering
- Message templates exist with variable substitution
- Workflow engine handles scheduled messages
- Agent notifications exist for workflow events
- Showing messages to buyer agents hardcoded to SMS (ignores pref_channel)
- Inbound webhook only processes YES/NO for showings

### Workflow
- E-Signature (Phase 6): DocuSign UI exists but API integration not confirmed live
- MLS Submission (Phase 8): No Paragon API — manual step only
- Phases 9-12 not represented in the workflow stepper
- No offer management, subject tracking, or closing workflow

### Compliance
- FINTRAC only implemented for sellers (not buyers)
- No Receipt of Funds or Suspicious Transaction reporting
- No record retention policy enforcement
- CASL consent tracking exists as form but no expiry tracking

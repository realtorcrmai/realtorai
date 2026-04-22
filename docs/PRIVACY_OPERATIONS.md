<!-- docs-audit: src/actions/contacts.ts, src/lib/compliance/* -->

# Privacy Operations

**Regulation:** PIPEDA (Canada), CASL (anti-spam), FINTRAC (anti-money laundering)
**Last reviewed:** 2026-04-21

---

## Data subject request process

Under PIPEDA, individuals have the right to access, correct, and delete their personal information.

### Access request (export)

**Trigger:** Contact or realtor requests "What data do you have on me?"

**Process:**
1. Verify identity (email confirmation or phone verification)
2. Run export query:
   ```sql
   SELECT * FROM contacts WHERE email = '<email>' OR phone = '<phone>';
   SELECT * FROM communications WHERE contact_id = '<id>';
   SELECT * FROM seller_identities WHERE listing_id IN (SELECT id FROM listings WHERE seller_id = '<id>');
   ```
3. Deliver as CSV/JSON within 30 days (PIPEDA requirement)
4. Log the request in `data_subject_requests` table (to be created)

**Status:** Manual process. No self-service UI yet.

### Correction request

**Trigger:** "My phone number is wrong" or "Update my address."

**Process:**
1. Verify identity
2. Update via CRM UI (contacts detail page)
3. Log the change (communications table + audit trail)

**Status:** Supported via existing CRM edit flow.

### Deletion request

**Trigger:** "Delete all my data."

**Process:**
1. Verify identity
2. Check FINTRAC retention requirements (5+ years for identity records)
3. If retention period met: hard delete across all tables
4. If retention period not met: anonymize PII fields, retain record shell
5. Confirm deletion to requestor within 30 days

**Status:** Hard delete exists (contacts page). No anonymization option. No retention check.

---

## Retention policy

| Data type | Retention period | Basis | Auto-enforcement |
|-----------|-----------------|-------|-----------------|
| FINTRAC identity records | 5 years from transaction | FINTRAC regulations | Not implemented |
| CASL consent records | 3 years from last interaction | CASL requirements | Not implemented |
| Contact PII | Until deletion requested | PIPEDA | Manual |
| Communications log | 2 years | Business need | Not implemented |
| Newsletter analytics | 1 year | Business need | Not implemented |

**Action needed:** Implement automated retention enforcement (cron job to flag/anonymize expired records).

---

## Privacy Impact Assessment (PIA) template

Complete this for any new feature that collects, processes, or stores PII.

### Feature: <name>
- **What PII is collected?**
- **Why is it needed?** (purpose limitation)
- **How is it stored?** (encryption, access controls)
- **Who can access it?** (tenant isolation, admin access)
- **How long is it kept?** (retention period)
- **Can users access/correct/delete it?** (PIPEDA rights)
- **Is it shared with third parties?** (Twilio, Anthropic, Resend — list each)
- **Is consent collected?** (CASL for marketing, implied for transactional)

---

## Current gaps

- [ ] No `data_subject_requests` table for tracking access/deletion requests
- [ ] No automated retention enforcement
- [ ] No anonymization pathway (only hard delete)
- [ ] CASL consent has no expiry tracking
- [ ] FINTRAC retention period not enforced
- [ ] No PIA required before PII-touching features (process exists above, not enforced)

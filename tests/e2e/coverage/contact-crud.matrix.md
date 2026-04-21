# Contact CRUD — Coverage Matrix

> Generated: 2026-04-21
> Process: Contact Create / Read / Update / Delete
> Spec file: `tests/browser/journeys/contact-crud-4layer.spec.ts`

## Summary

- **Total scenarios:** 25
- **P0 (ship-blocker):** 8
- **P1 (nightly regression):** 10
- **P2 (weekly):** 7
- **Implemented:** 6
- **Deferred:** 19

## Matrix

| ID | Priority | Scenario | Preconditions | UI Assertion | DB Assertion | Integration | Side-Effect | Status |
|---|---|---|---|---|---|---|---|---|
| **READ** | | | | | | | | |
| TC-CR-001 | P0 | View contact shows correct data from DB | Contact exists | Name in h1 matches DB | Row exists with correct realtor_id | No external calls | — | ✅ implemented |
| TC-CR-002 | P0 | All tabs present and switchable | Contact exists | 4 tabs visible, click activates | — | No external calls | — | ✅ implemented |
| TC-CR-003 | P1 | Invalid contact ID shows error | — | Content visible, no NaN/undefined | Row is null | No external calls | — | ✅ implemented |
| TC-CR-004 | P1 | Contact list shows correct count | Multiple contacts | List length matches | Count matches DB query | No external calls | — | deferred |
| TC-CR-005 | P2 | Contact search filters results | Multiple contacts | Filtered list shorter | — | — | — | deferred |
| **TENANT ISOLATION** | | | | | | | | |
| TC-CR-010 | P0 | API returns only current tenant data | Multi-tenant DB | Response is array | All rows have correct realtor_id | No external calls | — | ✅ implemented |
| TC-CR-011 | P0 | Cannot access other tenant's contact by ID | Other tenant data exists | Shows error/redirect | Row belongs to other tenant | — | — | deferred |
| **CREATE** | | | | | | | | |
| TC-CR-030 | P0 | Create contact with valid data | Logged in | Success toast | New row in contacts table | — | Speed-to-lead notification | deferred |
| TC-CR-031 | P0 | Create contact rejects duplicate phone | Existing contact | Error message shown | No new row created | — | — | deferred |
| TC-CR-032 | P1 | Create contact rejects invalid email | — | Validation error on field | No DB write | — | — | deferred |
| TC-CR-033 | P1 | Create contact with empty optional fields | — | Success | Row has nulls for optional | — | — | deferred |
| TC-CR-034 | P2 | Create contact with all fields filled | — | Success | All fields match input | — | Notification created | deferred |
| TC-CR-035 | P1 | Create contact phone auto-formats to E.164 | — | Formatted phone shown | DB has +1XXXXXXXXXX | — | — | deferred |
| **UPDATE** | | | | | | | | |
| TC-CR-040 | P0 | Edit contact name updates DB | Existing contact | New name in h1 | DB row updated | — | — | deferred |
| TC-CR-041 | P1 | Edit phone reformats to E.164 | Existing contact | Formatted phone | DB has E.164 | — | — | deferred |
| TC-CR-042 | P1 | Edit type from buyer to seller | Existing contact | Type badge changes | DB type updated | — | — | deferred |
| TC-CR-043 | P2 | Edit with invalid data shows validation | Existing contact | Error on field | DB unchanged | — | — | deferred |
| TC-CR-044 | P2 | Concurrent edit doesn't corrupt | Two sessions | Last write wins | Consistent state | — | — | deferred |
| **DELETE** | | | | | | | | |
| TC-CR-050 | P0 | Delete contact removes from list | Existing contact | Contact gone from list | Row soft-deleted | — | — | deferred |
| TC-CR-051 | P1 | Delete cascades communications | Contact with comms | — | Communications deleted | — | — | deferred |
| TC-CR-052 | P1 | Delete blocked if active listings | Contact with listing | Error message | DB unchanged | — | — | deferred |
| **DATA INTEGRITY** | | | | | | | | |
| TC-CR-020 | P1 | No NaN/undefined in display | Multiple contacts | Text clean | All fields have valid types | No external calls | — | ✅ implemented |
| TC-CR-021 | P1 | Phone displayed matches DB | Contact with phone | Digits match | E.164 format in DB | No external calls | — | ✅ implemented |
| TC-CR-022 | P2 | Email displayed matches DB | Contact with email | Email visible | DB email matches | — | — | deferred |
| TC-CR-023 | P2 | Tags displayed match DB | Contact with tags | Tags visible | JSONB array matches | — | — | deferred |

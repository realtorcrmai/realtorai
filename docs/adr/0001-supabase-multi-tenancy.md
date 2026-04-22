# ADR-0001: Supabase with app-level multi-tenancy

**Status:** Accepted
**Date:** 2026-03-01
**Decision makers:** Rahul Mittal

## Context

Realtors360 handles PII (PIPEDA/FINTRAC regulated) for multiple realtors. Need tenant isolation to prevent cross-realtor data access.

## Decision

Use Supabase PostgreSQL with:
- `realtor_id` column on every data table
- App-level tenant wrapper (`getAuthenticatedTenantClient()`) auto-injecting `.eq("realtor_id", userId)`
- DB-level RLS policies as defense-in-depth
- Admin client only for cron, webhooks, auth, migrations

## Consequences

### Positive
- Single DB simplifies ops (one Supabase project)
- RLS + app-level = defense in depth
- Tenant client is ergonomic — one function call secures all queries

### Negative
- No physical tenant separation (shared tables)
- RLS policies must be maintained on every new table (HC-4, HC-14)
- Admin client bypass requires vigilance (HC-12 enforced by review-pr.mjs)

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|--------|------|------|----------------|
| Schema-per-tenant | Strong isolation | Complex migrations, connection pooling issues | Over-engineered for <100 tenants |
| Database-per-tenant | Strongest isolation | Expensive, migration nightmare | Cost prohibitive |
| Firebase | Simpler security rules | Vendor lock-in, no SQL, weaker for relational data | Need relational queries |

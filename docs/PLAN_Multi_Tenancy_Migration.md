# Multi-Tenancy Migration Plan — Realtors360

> **Date:** March 31, 2026
> **Status:** Planning
> **Priority:** P0 — Launch Blocker
> **Estimated Effort:** 10-15 days
> **Risk:** High (data integrity, 90 tables, 50+ query locations)

---

## 1. Problem Statement

The Realtors360 CRM is **single-tenant**. All authenticated users see all data. RLS policies use `USING (true)` or `auth.role() = 'authenticated'` — providing zero tenant isolation. The admin client (`createAdminClient()`) bypasses RLS entirely and is used in 30+ files without manual filtering.

**Impact:** If two realtors sign up today, Realtor A can see all of Realtor B's contacts, listings, emails, deals, and client data.

---

## 2. Architecture Decision

### Chosen: Pattern 1 (Application-Level Filtering) + Pattern 3 (Custom JWT, future)

**Why not Supabase Auth RLS directly:**
- App uses NextAuth (not Supabase Auth)
- `auth.uid()` doesn't work without Supabase Auth
- Admin client bypasses RLS in 30+ files
- Switching auth systems is a larger migration than adding tenant filtering

**Approach:**
1. Add `realtor_id` column to all tables
2. Create `tenantQuery()` wrapper that auto-injects `.eq('realtor_id', id)`
3. All server actions/API routes use the wrapper
4. RLS policies added as defense-in-depth (safety net)
5. Custom JWT minting added later for `auth.uid()` support

---

## 3. Scope

### Tables Needing `realtor_id` (by tier)

**Tier 1 — Core Data (26 tables)**
| Table | Current Tenant Column | FK Chain |
|-------|----------------------|----------|
| contacts | NONE | — (root) |
| listings | NONE | seller_id → contacts |
| appointments | NONE | listing_id → listings |
| communications | NONE | contact_id → contacts |
| listing_documents | NONE | listing_id → listings |
| listing_enrichment | NONE | listing_id → listings |
| listing_activities | NONE | listing_id → listings |
| seller_identities | NONE | listing_id → listings |
| prompts | NONE | listing_id → listings |
| media_assets | NONE | listing_id → listings |
| open_houses | NONE | listing_id → listings |
| open_house_visitors | NONE | open_house_id → open_houses |
| contact_dates | NONE | contact_id → contacts |
| contact_journeys | NONE | contact_id → contacts |
| contact_relationships | NONE | contact_id → contacts |
| contact_family_members | NONE | contact_id → contacts |
| contact_instructions | NONE | contact_id → contacts |
| contact_watchlist | NONE | contact_id → contacts |
| contact_context | NONE | contact_id → contacts |
| contact_properties | NONE | contact_id → contacts |
| contact_segments | NONE | — |
| contact_consent | NONE | contact_id → contacts |
| consent_records | NONE | contact_id → contacts |
| households | NONE | primary_contact_id → contacts |
| tasks | NONE | contact_id → contacts |
| activities | NONE | contact_id → contacts |

**Tier 2 — Transactions (12 tables)**
| Table | Current Tenant Column |
|-------|----------------------|
| deals | NONE |
| deal_parties | NONE |
| deal_checklist | NONE |
| offers | NONE |
| offer_conditions | NONE |
| offer_history | NONE |
| mortgages | NONE |
| referrals | NONE |
| workflows | NONE (may stay global) |
| workflow_enrollments | NONE |
| workflow_step_logs | NONE |
| extension_tasks | NONE |

**Tier 3 — Email & Newsletters (8 tables)**
| Table | Current Tenant Column |
|-------|----------------------|
| newsletters | NONE |
| newsletter_events | NONE |
| newsletter_templates | NONE (may stay global for system templates) |
| message_templates | NONE |
| email_feedback | NONE |
| form_submissions | NONE |
| form_templates | NONE (global) |
| outcome_events | NONE |

**Tier 4 — AI & Intelligence (10 tables)**
| Table | Current Tenant Column |
|-------|----------------------|
| agent_recommendations | NONE |
| agent_decisions | NONE |
| agent_notifications | NONE |
| agent_learning_log | realtor_id (TEXT — needs FK) |
| realtor_agent_config | realtor_id (TEXT — needs FK) |
| realtor_weekly_feedback | realtor_id (TEXT — needs FK) |
| rag_embeddings | NONE |
| rag_sessions | user_email (needs migration) |
| rag_audit_log | user_email (needs migration) |
| rag_feedback | NONE |

**Tier 5 — Social Media (9 tables)**
| Table | Current Tenant Column |
|-------|----------------------|
| social_brand_kits | user_email (needs migration) |
| social_accounts | brand_kit_id (inherits) |
| social_posts | brand_kit_id (inherits) |
| social_post_publishes | post_id (inherits) |
| social_analytics_daily | brand_kit_id (inherits) |
| social_usage_tracking | brand_kit_id (inherits) |
| social_audit_log | brand_kit_id (inherits) |
| social_hashtag_performance | brand_kit_id (inherits) |
| social_templates | NONE (global for system) |

**Tier 6 — Website & Analytics (5 tables)**
| Table | Current Tenant Column |
|-------|----------------------|
| realtor_sites | NONE (1 per realtor — IS the tenant for sites) |
| site_analytics_events | site_id (inherits) |
| site_sessions | site_id (inherits) |
| site_session_recordings | session_id (inherits) |
| site_leads | NONE |

**Tier 7 — Auth & Config (6 tables)**
| Table | Current Tenant Column |
|-------|----------------------|
| users | NONE (needs tenant_id FK) |
| google_tokens | user_email (needs migration) |
| user_integrations | user_email (needs migration) |
| feature_overrides | NONE |
| send_governor_log | NONE |
| trust_audit_log | NONE |

**Global Tables (NO tenant_id needed):**
- knowledge_articles (system knowledge base)
- competitive_insights (platform-level)
- platform_intelligence (platform-level)
- help_events, help_community_tips
- tutor_* tables (separate product)
- tenants, tenant_memberships, tenant_api_keys, tenant_audit_log (tenant infra itself)

---

## 4. Files Needing Code Changes

### Server Actions (15 files)
| File | Queries to Update |
|------|------------------|
| src/actions/contacts.ts | 10+ |
| src/actions/listings.ts | 8+ |
| src/actions/newsletters.ts | 8+ |
| src/actions/journeys.ts | 5+ |
| src/actions/recommendations.ts | 4+ |
| src/actions/templates.ts | 3+ |
| src/actions/segments.ts | 3+ |
| src/actions/calendar.ts | 3+ |
| src/actions/content.ts | 3+ |
| src/actions/showings.ts | 5+ |
| src/actions/workflow.ts | 4+ |
| src/actions/households.ts | 3+ |
| src/actions/social-content.ts | 8+ |
| src/actions/knowledge-base.ts | 3+ |
| src/actions/contact-merge.ts | 3+ |

### API Routes (20+ files)
| Directory | Routes |
|-----------|--------|
| src/app/api/contacts/* | 8 routes |
| src/app/api/listings/* | 6 routes |
| src/app/api/cron/* | 8 routes |
| src/app/api/webhooks/* | 3 routes |
| src/app/api/voice-agent/* | 12 routes |
| src/app/api/social/* | 2 routes |
| src/app/api/rag/* | 5 routes |
| src/app/api/deals/* | 3 routes |

### Dashboard Pages (15+ files)
| File | Data Queries |
|------|-------------|
| src/app/(dashboard)/page.tsx | 5+ |
| src/app/(dashboard)/contacts/page.tsx | 2+ |
| src/app/(dashboard)/contacts/[id]/page.tsx | 3+ |
| src/app/(dashboard)/listings/page.tsx | 2+ |
| src/app/(dashboard)/listings/[id]/page.tsx | 5+ |
| src/app/(dashboard)/newsletters/page.tsx | 8+ |
| src/app/(dashboard)/social/page.tsx | 5+ |
| src/app/(dashboard)/showings/page.tsx | 2+ |
| (+ 10 more pages) | |

---

## 5. Implementation Steps

### Step 1: Create Tenant Infrastructure

**New file: `src/lib/supabase/tenant.ts`**
```typescript
// Tenant-scoped query wrapper
// Auto-injects .eq('realtor_id', id) on all operations
// Prevents accidental cross-tenant data access

export function tenantClient(supabase, realtorId: string) {
  return {
    from(table: string) {
      return {
        select: (...args) => supabase.from(table).select(...args).eq('realtor_id', realtorId),
        insert: (data) => supabase.from(table).insert({ ...data, realtor_id: realtorId }),
        update: (data) => supabase.from(table).update(data).eq('realtor_id', realtorId),
        delete: () => supabase.from(table).delete().eq('realtor_id', realtorId),
        upsert: (data) => supabase.from(table).upsert({ ...data, realtor_id: realtorId }),
      }
    }
  }
}

// Get realtor_id from NextAuth session
export async function getRealtorId(): Promise<string> {
  const { auth } = await import('@/lib/auth')
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')
  return session.user.id
}
```

**New file: `src/lib/supabase/admin-tenant.ts`**
```typescript
// Admin client with mandatory tenant scoping
// For server actions that need service role but must stay tenant-scoped

export function adminForTenant(realtorId: string) {
  if (!realtorId) throw new Error('realtorId required')
  const supabase = createAdminClient()
  return tenantClient(supabase, realtorId)
}
```

### Step 2: Database Migration — Add Columns (nullable)

**Migration: `062_add_realtor_id_columns.sql`**
- Add `realtor_id uuid REFERENCES users(id)` to all 90 tables (nullable)
- Add indexes on every `realtor_id` column
- Create trigger to prevent `realtor_id` modification after insert

### Step 3: Backfill Existing Data

**Migration: `063_backfill_realtor_id.sql`**
- Get the single existing user's ID
- UPDATE all tables SET realtor_id = that ID WHERE realtor_id IS NULL

### Step 4: Update Auth System

**Modify: `src/lib/auth.ts`**
- Add `realtorId` (same as userId) to JWT session
- Ensure session always has a realtor context

**Modify: `src/middleware.ts`**
- Extract realtorId from session
- Pass to downstream handlers via headers

### Step 5: Update All Server Actions

**For each file in `src/actions/*.ts`:**
1. Import `adminForTenant` and `getRealtorId`
2. Replace `createAdminClient()` with `adminForTenant(realtorId)`
3. Test that queries return only tenant's data

### Step 6: Update All API Routes

**For each route in `src/app/api/**/*.ts`:**
1. Routes that serve authenticated users → add tenant filter
2. Cron routes → iterate per tenant
3. Webhook routes → resolve tenant from payload data

### Step 7: Add NOT NULL Constraint

**Migration: `064_enforce_realtor_id.sql`**
- ALTER TABLE ... ALTER COLUMN realtor_id SET NOT NULL
- Only after backfill verified and all code updated

### Step 8: Update RLS Policies (Defense-in-Depth)

**Migration: `065_tenant_rls_policies.sql`**
- Drop all `USING (true)` and `auth.role() = 'authenticated'` policies
- Drop all anon access policies (migration 003)
- Add `USING (realtor_id = auth.uid())` on every table (requires custom JWT later)
- Or use `USING (true)` with comment noting that application-level filtering is primary

### Step 9: Security Hardening

- Remove hardcoded CRON secret from `DailyDigestCard.tsx`
- Remove hardcoded demo credentials from `auth.ts`
- HMAC-signed unsubscribe tokens (replace plain UUID)
- Rate limiting on sensitive endpoints

---

## 6. Testing Plan

### Isolation Tests (per table)

For each of the 90 tenant-scoped tables, test:
1. **Read isolation:** Realtor A query returns 0 rows from Realtor B
2. **Write isolation:** Realtor A insert sets correct realtor_id
3. **Update isolation:** Realtor A can't update Realtor B's rows
4. **Delete isolation:** Realtor A can't delete Realtor B's rows
5. **Count isolation:** count(*) returns only tenant's rows
6. **Join isolation:** Joined tables don't leak cross-tenant data

### Auth Tests
1. Unauthenticated request returns 401
2. Session includes realtorId
3. realtorId matches database user

### Webhook Tests
1. Twilio webhook resolves tenant from phone number
2. Resend webhook resolves tenant from contact email
3. Lead capture webhook resolves tenant from API key

### Cron Tests
1. Cron processes each tenant independently
2. Cron doesn't mix data between tenants
3. Cron handles tenant with no data gracefully

### Edge Cases
1. New user signup creates proper tenant context
2. User with no data sees empty dashboard (not other tenant's data)
3. Bulk operations (import, export) scoped to tenant
4. Search results scoped to tenant
5. RAG embeddings scoped to tenant

### Regression Tests
1. All existing pages still load
2. All existing CRUD operations still work
3. Email marketing still sends correctly
4. Social media posts still publish
5. Voice agent still functions

---

## 7. Rollback Plan

If multi-tenancy breaks production:

1. **Immediate:** Revert code changes (git revert)
2. **Database:** realtor_id columns are nullable — old code ignores them
3. **RLS:** Old permissive policies can be re-applied instantly
4. **No data loss:** Adding columns and backfilling is non-destructive

---

## 8. Migration Order (Dependency-Safe)

```
Step 1: tenant.ts + admin-tenant.ts (new utility files)
   ↓ (no deps)
Step 2: Migration 062 — add realtor_id columns (nullable, all tables)
   ↓ (no deps — nullable means no breakage)
Step 3: Migration 063 — backfill existing data
   ↓ (depends on step 2)
Step 4: Update auth.ts + middleware.ts
   ↓ (depends on step 1)
Step 5: Update server actions (one file at a time, test each)
   ↓ (depends on steps 1, 2, 4)
Step 6: Update API routes (one at a time)
   ↓ (depends on steps 1, 2, 4)
Step 7: Migration 064 — NOT NULL constraint
   ↓ (depends on step 3 verified, steps 5-6 complete)
Step 8: Migration 065 — RLS policies
   ↓ (depends on step 7)
Step 9: Security hardening
   ↓ (independent)
Step 10: Full test suite
   ↓ (depends on all above)
Step 11: Remove anon access (migration 003 policies)
   ↓ (depends on step 10 passing)
```

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Missed query leaks data | High | Critical | tenantQuery wrapper auto-injects filter. Grep audit after migration. |
| Backfill sets wrong tenant | Low | High | Only 1 tenant exists now. Verify with COUNT before/after. |
| NOT NULL breaks existing inserts | Medium | High | Add NOT NULL only after all code updated and tested. |
| Join queries leak cross-tenant | Medium | High | Test every join. Add realtor_id filter on both sides. |
| Webhooks can't resolve tenant | Medium | Medium | Lookup tenant from phone/email/API key in payload. |
| Performance regression from added filters | Low | Medium | Indexes on all realtor_id columns. |
| Cron jobs mix tenant data | Medium | High | Process per-tenant in loop, never batch across tenants. |

---

## 10. Success Criteria

- [ ] Two test realtors can sign up and see ONLY their own data
- [ ] Zero cross-tenant data leaks in isolation test suite
- [ ] All 90 tables have realtor_id with NOT NULL constraint
- [ ] All server actions use tenantQuery wrapper
- [ ] All API routes filter by tenant
- [ ] Webhooks resolve to correct tenant
- [ ] Cron jobs process per-tenant
- [ ] Build passes, all existing tests pass
- [ ] No regression in UI functionality

---

*Multi-Tenancy Migration Plan v1.0 — March 31, 2026*

<!-- docs-audit: src/lib/features.ts, src/lib/plans.ts -->
# Feature Gating Architecture — Simplified

> **Date:** April 2, 2026
> **Status:** Proposed
> **Replaces:** Current per-user JSONB feature arrays

---

## Current Problems

1. Features stored per-user (JSONB), not per-plan — can't change plan features without updating every user
2. No billing tier concept — no `plan` column, can't query "who's on Pro?"
3. Release gates mixed with billing — R1/R2 constants conflate "what's launched" vs "what's paid for"
4. No admin dashboard — must use SQL to manage users
5. JWT caching — feature changes require re-login
6. Default features hardcoded in old DB migration

## New Architecture (3 Layers)

```
Layer 1: PLANS (what features each plan includes)
  ↓
Layer 2: USERS (which plan each user is on)
  ↓
Layer 3: RELEASE GATE (which features are launched globally)
  ↓
VISIBLE FEATURES = intersection(user's plan features, released features)
```

### Layer 1: Plans (in code, not DB)

```typescript
// src/lib/plans.ts

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    features: ["contacts", "calendar", "tasks"],
    limits: { contacts: 50, listings: 0, emails_per_month: 0 },
  },
  professional: {
    id: "professional",
    name: "Professional",
    price: 29,
    features: ["contacts", "calendar", "tasks", "newsletters", "automations", "listings", "showings", "forms"],
    limits: { contacts: -1, listings: -1, emails_per_month: 500 },
  },
  studio: {
    id: "studio",
    name: "Studio",
    price: 69,
    features: ["contacts", "calendar", "tasks", "newsletters", "automations", "listings", "showings", "forms", "social", "website", "content"],
    limits: { contacts: -1, listings: -1, emails_per_month: -1 },
  },
  team: {
    id: "team",
    name: "Team",
    price: 129,
    features: ALL_FEATURES,
    limits: { contacts: -1, listings: -1, emails_per_month: -1, seats: 5 },
  },
  admin: {
    id: "admin",
    name: "Admin",
    price: 0,
    features: ALL_FEATURES,
    limits: { contacts: -1, listings: -1, emails_per_month: -1 },
  },
} as const;

export type PlanId = keyof typeof PLANS;
export const DEFAULT_PLAN: PlanId = "free";
```

### Layer 2: Users (DB change)

```sql
-- Add plan column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
-- Drop enabled_features column (plan determines features)
-- Keep for now as override, but plan takes priority
```

### Layer 3: Release Gate (stays in code)

```typescript
// src/lib/features.ts
// RELEASED_FEATURES controls what's available globally
// Even if a plan includes "social", it won't show until it's released

export const RELEASED_FEATURES: FeatureKey[] = [
  "contacts", "calendar", "tasks", "newsletters", "automations",
  // Uncomment to release:
  // "listings", "showings", "forms",
  // "social",
  // "website", "content", "import", "workflow",
  // "assistant", "search",
];
```

### How Features Are Resolved

```typescript
// src/lib/features.ts
export function getUserFeatures(plan: PlanId, overrides?: FeatureKey[]): FeatureKey[] {
  // If user has manual overrides (admin set), use those
  if (overrides && overrides.length > 0) {
    return overrides.filter(f => RELEASED_FEATURES.includes(f));
  }
  // Otherwise, use plan features filtered by what's released
  const planFeatures = PLANS[plan]?.features || PLANS.free.features;
  return planFeatures.filter(f => RELEASED_FEATURES.includes(f));
}
```

### Auth Flow (simplified)

```typescript
// In auth.ts JWT callback:
if (existingUser) {
  token.plan = existingUser.plan || "free";
  token.enabledFeatures = getUserFeatures(
    existingUser.plan,
    existingUser.enabled_features // manual overrides
  );
}
```

---

## Admin Dashboard

### Route: `/admin`

Simple admin page (only visible to `role: "admin"`) with:

**Users Tab:**
| Column | Info |
|--------|------|
| Email | User email |
| Name | Display name |
| Plan | Dropdown: free/professional/studio/team |
| Features | Auto-populated from plan (show as badges) |
| Overrides | Manual feature toggles (override plan) |
| Status | Active/Inactive toggle |
| Created | Sign-up date |
| Last Login | Last activity |

**Actions:**
- Change user's plan (updates `users.plan`)
- Toggle individual features (updates `users.enabled_features` as override)
- Deactivate user
- No need to manage feature arrays manually

**Stats:**
- Total users by plan
- Active users (last 7 days)
- Feature usage (which features are actually used)

---

## Migration Plan

### Step 1: Add `plan` column to users
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
-- Existing users get 'professional' (they were on the full CRM)
UPDATE users SET plan = 'professional' WHERE plan = 'free';
-- Admin users get 'admin'
UPDATE users SET plan = 'admin' WHERE role = 'admin';
```

### Step 2: Create `plans.ts`
Define all plans with features and limits.

### Step 3: Update `features.ts`
Replace `CURRENT_RELEASE_FEATURES` with `RELEASED_FEATURES`.
Add `getUserFeatures()` function.

### Step 4: Update `auth.ts`
Read `plan` from user record.
Call `getUserFeatures(plan, overrides)`.

### Step 5: Build admin page
Simple table of users with plan dropdown.

### Step 6: Remove old constants
Delete `R1_FEATURES`, `R2_FEATURES`, etc.
Delete `CURRENT_RELEASE_FEATURES`.

---

## Benefits

1. **Change plan features once, affects all users on that plan** — no per-user updates
2. **Clear separation:** Plans (billing) vs Release Gate (what's launched) vs Overrides (admin exceptions)
3. **Admin dashboard** — manage users without SQL
4. **Simple queries:** `SELECT COUNT(*) FROM users WHERE plan = 'professional'`
5. **Feature override** — admin can give a beta tester access to unreleased features
6. **No JWT staleness** — features resolved on each request, not cached in token (optional: can still cache for performance)

---

## Example Scenarios

**Scenario 1: Release Social Media to all users**
Edit `RELEASED_FEATURES` → add `"social"`. Deploy. All users whose plan includes social can now see it.

**Scenario 2: Give one user early access to Social**
Admin dashboard → find user → add "social" to overrides. User sees it immediately even though it's not in RELEASED_FEATURES.

**Scenario 3: Upgrade user to Studio plan**
Admin dashboard → change plan to "studio". User now has all Studio features (that are released).

**Scenario 4: New user signs up**
Gets `plan: "free"` by default. Sees only features in free plan that are also released.

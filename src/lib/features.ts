// Realtors360 — Feature Gating
// 3-layer system: Plans (billing) → Release Gate (what's launched) → User Features

import { PLANS, DEFAULT_PLAN } from "./plans";
import type { PlanId } from "./plans";

// ============================================================
// Feature Keys
// ============================================================

export const FEATURE_KEYS = [
  "listings",
  "contacts",
  "tasks",
  "showings",
  "calendar",
  "content",
  "search",
  "workflow",
  "import",
  "forms",
  "automations",
  "newsletters",
  "website",
  "social",
  "assistant",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const ALL_FEATURES = [...FEATURE_KEYS] as FeatureKey[];

// ============================================================
// Release Gate — controls what's available globally
// Even if a plan includes a feature, it won't show until released here.
// To release a feature: uncomment it and deploy.
// ============================================================

export const RELEASED_FEATURES: FeatureKey[] = [
  // R1: Core CRM + Email Marketing
  "contacts",
  "calendar",
  "tasks",
  "newsletters",
  "automations",
  // R2: Uncomment to release
  // "listings",
  // "showings",
  // "forms",
  // "social",
  // R3: Uncomment to release
  // "website",
  // "content",
  // "import",
  // "workflow",
  // R4: Uncomment to release
  // "assistant",
  // "search",
];

// ============================================================
// Feature Resolution
// ============================================================

/**
 * Get the features a user can access.
 * = intersection(plan features, released features) + any manual overrides
 *
 * @param plan - user's billing plan (free, professional, studio, team, admin)
 * @param overrides - manual feature overrides set by admin (optional)
 */
export function getUserFeatures(plan?: string, overrides?: string[]): FeatureKey[] {
  // If user has manual overrides from admin, use those (filtered by released)
  if (overrides && Array.isArray(overrides) && overrides.length > 0) {
    return overrides.filter((f): f is FeatureKey => RELEASED_FEATURES.includes(f as FeatureKey));
  }

  // Get plan features, filtered by what's released
  const planId = (plan || DEFAULT_PLAN) as PlanId;
  const planDef = PLANS[planId] || PLANS[DEFAULT_PLAN];
  return planDef.features.filter((f) => RELEASED_FEATURES.includes(f));
}

// Backward compatibility
export const CURRENT_RELEASE_FEATURES = RELEASED_FEATURES;
export const R1_FEATURES = RELEASED_FEATURES;

// ============================================================
// Feature Metadata
// ============================================================

export const FEATURE_META: Record<
  FeatureKey,
  { label: string; description: string }
> = {
  listings: {
    label: "Listings",
    description: "Manage property listings, photos & pricing",
  },
  contacts: {
    label: "Contacts",
    description: "Buyers, sellers & agent relationships",
  },
  tasks: {
    label: "Tasks",
    description: "Daily to-do items & follow-ups",
  },
  showings: {
    label: "Showings",
    description: "Track & manage showing requests",
  },
  calendar: {
    label: "Calendar",
    description: "View your schedule at a glance",
  },
  content: {
    label: "Content Engine",
    description: "AI-powered MLS remarks, video & images",
  },
  search: {
    label: "Property Search",
    description: "Find properties for your buyers",
  },
  workflow: {
    label: "MLS Workflow",
    description: "7-phase listing pipeline tracker",
  },
  import: {
    label: "Excel Import",
    description: "Import listings from spreadsheets",
  },
  forms: {
    label: "BC Forms",
    description: "Standard BC real estate documents",
  },
  automations: {
    label: "Automations",
    description: "Workflow automations & drip campaigns",
  },
  newsletters: {
    label: "Email Marketing",
    description: "AI newsletters, journeys & analytics",
  },
  website: {
    label: "Website Marketing",
    description: "Build & manage your realtor website",
  },
  social: {
    label: "Social Media",
    description: "AI content studio — auto-generate & publish to all platforms",
  },
  assistant: {
    label: "AI Assistant",
    description: "RAG-powered chat — ask questions about your CRM data",
  },
};

/** Map feature keys to their nav href */
export const FEATURE_HREF: Record<FeatureKey, string> = {
  listings: "/listings",
  contacts: "/contacts",
  tasks: "/tasks",
  showings: "/showings",
  calendar: "/calendar",
  content: "/content",
  search: "/search",
  workflow: "/workflow",
  import: "/import",
  forms: "/forms",
  automations: "/automations",
  newsletters: "/newsletters",
  website: "/websites",
  social: "/social",
  assistant: "/assistant",
};

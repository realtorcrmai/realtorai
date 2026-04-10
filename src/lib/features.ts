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
  "mls-browse",
  "social",
  "assistant",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const ALL_FEATURES = [...FEATURE_KEYS] as FeatureKey[];

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
  "mls-browse": {
    label: "MLS Browse",
    description: "Search & import listings from Repliers MLS",
  },
  social: {
    label: "Social Media",
    description: "AI-powered social content studio",
  },
  assistant: {
    label: "AI Assistant",
    description: "RAG-powered chat assistant & knowledge base",
  },
};

/**
 * Returns the set of enabled FeatureKeys for a given plan, optionally
 * merged with per-user overrides stored in the `enabled_features` DB column.
 * Filters out any keys that are not in FEATURE_KEYS (e.g. legacy "social" /
 * "assistant" entries in plans.ts) so the result is always type-safe.
 */
export function getUserFeatures(
  plan: string,
  overrides?: string[] | null,
): FeatureKey[] {
  // Inline plan→feature map to avoid circular import with plans.ts
  const PLAN_FEATURES: Record<string, string[]> = {
    free: ["contacts", "calendar", "tasks", "listings"],
    professional: [
      "contacts", "calendar", "tasks",
      "newsletters", "automations",
      "listings", "showings", "forms",
    ],
    studio: [
      "contacts", "calendar", "tasks",
      "newsletters", "automations",
      "listings", "showings", "forms",
      "website", "content", "import", "workflow",
    ],
    team: [
      "contacts", "calendar", "tasks",
      "newsletters", "automations",
      "listings", "showings", "forms",
      "website", "content", "import", "workflow",
      "search",
    ],
    admin: [
      "contacts", "calendar", "tasks",
      "newsletters", "automations",
      "listings", "showings", "forms",
      "website", "content", "import", "workflow",
      "search",
    ],
  };

  const validSet = new Set<string>(FEATURE_KEYS);
  const base: string[] = PLAN_FEATURES[plan] ?? PLAN_FEATURES["free"];
  const merged = new Set<string>(base);

  if (overrides) {
    for (const key of overrides) merged.add(key);
  }

  return [...merged].filter((k): k is FeatureKey => validSet.has(k));
}

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
  "mls-browse": "/mls-browse",
  social: "/social",
  assistant: "/assistant",
};

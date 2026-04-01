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

/** Release-gated feature sets — controls what users see per release */
export const R1_FEATURES: FeatureKey[] = [
  "listings", "contacts", "showings", "calendar",
  "tasks", "forms", "newsletters", "automations",
];

export const R2_FEATURES: FeatureKey[] = [
  ...R1_FEATURES, "social",
];

export const R3_FEATURES: FeatureKey[] = [
  ...R2_FEATURES, "website", "content", "import", "workflow",
];

export const R4_FEATURES: FeatureKey[] = [
  ...R3_FEATURES, "assistant", "search",
];

/** Current release — change this to roll out features to new users */
export const CURRENT_RELEASE_FEATURES = R1_FEATURES;

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

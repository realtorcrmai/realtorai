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
  "website",
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
  website: {
    label: "Website Marketing",
    description: "Build & manage your realtor website",
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
  website: "http://localhost:3001",
};

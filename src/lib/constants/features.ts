/**
 * Feature Flag System — Config File (Source of Truth)
 *
 * Each feature can be overridden at runtime via the `feature_overrides` table
 * in Supabase. The config here provides defaults; runtime overrides take precedence.
 */

export type FeatureDefinition = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  /** Nav item href — used to conditionally hide navigation links */
  href?: string;
  /** Dashboard tile index — used to conditionally hide feature tiles */
  tileIndex?: number;
};

export const FEATURES: Record<string, FeatureDefinition> = {
  listings: {
    id: "listings",
    label: "Listings",
    description: "Property listing management, photos, and pricing",
    enabled: true,
    href: "/listings",
  },
  contacts: {
    id: "contacts",
    label: "Contacts",
    description: "Buyer and seller relationship management",
    enabled: true,
    href: "/contacts",
  },
  showings: {
    id: "showings",
    label: "Showings",
    description: "Showing request tracking and management",
    enabled: true,
    href: "/showings",
  },
  tasks: {
    id: "tasks",
    label: "Tasks",
    description: "Daily to-do items and follow-ups",
    enabled: true,
    href: "/tasks",
  },
  calendar: {
    id: "calendar",
    label: "Calendar",
    description: "Schedule and appointment views",
    enabled: true,
    href: "/calendar",
  },
  analytics: {
    id: "analytics",
    label: "Reports & Analytics",
    description: "Performance reports and market analytics",
    enabled: true,
    href: "/reports",
  },
  pipeline: {
    id: "pipeline",
    label: "Pipeline",
    description: "Contact pipeline / kanban board",
    enabled: true,
    href: "/pipeline",
  },
  property_search: {
    id: "property_search",
    label: "Property Search",
    description: "Search properties for buyers",
    enabled: true,
    href: "/search",
  },
  mls_workflow: {
    id: "mls_workflow",
    label: "MLS Workflow",
    description: "7-phase listing pipeline tracker",
    enabled: true,
    href: "/workflow",
  },
  excel_import: {
    id: "excel_import",
    label: "Excel Import",
    description: "Import listings from spreadsheets",
    enabled: true,
    href: "/import",
  },
  bc_forms: {
    id: "bc_forms",
    label: "BC Forms",
    description: "Standard BC real estate documents",
    enabled: true,
    href: "/forms",
  },
  mls_extension: {
    id: "mls_extension",
    label: "MLS Extension",
    description: "Chrome extension for Paragon MLS form filling",
    enabled: true,
  },
  interest_explorer: {
    id: "interest_explorer",
    label: "Interest Explorer",
    description: "Browse and import listings from MLS portal",
    enabled: false,
  },
  reminders: {
    id: "reminders",
    label: "Date Reminders",
    description: "Birthday, anniversary, and mortgage renewal reminders",
    enabled: true,
  },
  form_preview: {
    id: "form_preview",
    label: "Form Preview",
    description: "View/edit form data as structured HTML",
    enabled: true,
  },
};

/** Get a feature's default enabled state from config */
export function getFeatureDefault(featureId: string): boolean {
  return FEATURES[featureId]?.enabled ?? false;
}

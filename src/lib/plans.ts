// Realtors360 — Plan Definitions
// Single source of truth for what each pricing tier includes

import type { FeatureKey } from "./features";

export interface Plan {
  id: string;
  name: string;
  price: number; // monthly USD
  features: FeatureKey[];
  limits: {
    contacts: number;    // -1 = unlimited
    listings: number;    // -1 = unlimited
    emails_per_month: number; // -1 = unlimited
    seats?: number;      // for team plans
  };
}

export const PLANS: Record<string, Plan> = {
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
    features: [
      "contacts", "calendar", "tasks",
      "newsletters", "automations",
      "listings", "showings", "forms",
    ],
    limits: { contacts: -1, listings: -1, emails_per_month: 500 },
  },
  studio: {
    id: "studio",
    name: "Studio",
    price: 69,
    features: [
      "contacts", "calendar", "tasks",
      "newsletters", "automations",
      "listings", "showings", "forms",
      "social", "website", "content",
      "import", "workflow",
    ],
    limits: { contacts: -1, listings: -1, emails_per_month: -1 },
  },
  team: {
    id: "team",
    name: "Team",
    price: 129,
    features: [
      "contacts", "calendar", "tasks",
      "newsletters", "automations",
      "listings", "showings", "forms",
      "social", "website", "content",
      "import", "workflow",
      "assistant", "search",
    ],
    limits: { contacts: -1, listings: -1, emails_per_month: -1, seats: 5 },
  },
  admin: {
    id: "admin",
    name: "Admin",
    price: 0,
    features: [
      "contacts", "calendar", "tasks",
      "newsletters", "automations",
      "listings", "showings", "forms",
      "social", "website", "content",
      "import", "workflow",
      "assistant", "search",
    ],
    limits: { contacts: -1, listings: -1, emails_per_month: -1 },
  },
};

export type PlanId = keyof typeof PLANS;
export const DEFAULT_PLAN: PlanId = "free";
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

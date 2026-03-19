export const CONTACT_TYPES = ["buyer", "seller"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  seller: "bg-purple-100 text-purple-800",
  buyer: "bg-blue-100 text-blue-800",
};

export const PREF_CHANNELS = ["whatsapp", "sms"] as const;
export type PrefChannel = (typeof PREF_CHANNELS)[number];

// ── Lead Status ──────────────────────────────────────────────
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "nurturing",
  "active",
  "under_contract",
  "closed",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  nurturing: "Nurturing",
  active: "Active",
  under_contract: "Under Contract",
  closed: "Closed",
  lost: "Lost",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-sky-100 text-sky-800",
  contacted: "bg-amber-100 text-amber-800",
  qualified: "bg-emerald-100 text-emerald-800",
  nurturing: "bg-violet-100 text-violet-800",
  active: "bg-green-100 text-green-800",
  under_contract: "bg-orange-100 text-orange-800",
  closed: "bg-gray-100 text-gray-800",
  lost: "bg-red-100 text-red-800",
};

// ── Lead Sources ─────────────────────────────────────────────
export const LEAD_SOURCES = [
  "Referral",
  "Website",
  "Open House",
  "Social Media",
  "Cold Call",
  "Door Knock",
  "Zillow",
  "Realtor.ca",
  "Google Ads",
  "Sphere of Influence",
  "Past Client",
  "Other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

// ── Contact Document Types ───────────────────────────────────
export const CONTACT_DOC_TYPES = [
  "Pre-Approval",
  "ID Copy",
  "Agreement",
  "Contract",
  "Other",
] as const;
export type ContactDocType = (typeof CONTACT_DOC_TYPES)[number];

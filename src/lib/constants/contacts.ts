export const CONTACT_TYPES = ["buyer", "seller", "customer", "agent", "partner", "other"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  customer: "bg-green-100 text-green-800",
  buyer: "bg-blue-100 text-blue-800",
  seller: "bg-purple-100 text-purple-800",
  agent: "bg-orange-100 text-orange-800",
  partner: "bg-teal-100 text-teal-800",
  other: "bg-gray-100 text-gray-800",
};

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  customer: "Customer (Lead)",
  buyer: "Buyer",
  seller: "Seller",
  agent: "Agent",
  partner: "Partner",
  other: "Other",
};

// ── Partner Types ─────────────────────────────────────────────
export const PARTNER_TYPES = [
  "mortgage_broker",
  "lawyer",
  "inspector",
  "agent",
  "financial_advisor",
  "other",
] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  mortgage_broker: "Mortgage Broker",
  lawyer: "Lawyer / Notary",
  inspector: "Home Inspector",
  agent: "Real Estate Agent",
  financial_advisor: "Financial Advisor",
  other: "Other",
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

// ── Contact Tags (Predefined) ────────────────────────────────
export const CONTACT_TAGS = [
  // Priority / Temperature
  "vip",
  "hot lead",
  "warm lead",
  "cold lead",
  // Buyer Tags
  "first-time buyer",
  "pre-approved",
  "investor",
  "downsizer",
  "upsizer",
  "relocating",
  // Seller Tags
  "listing active",
  "listing expired",
  "listing sold",
  "fsbo",
  // Relationship
  "past client",
  "referral",
  "sphere of influence",
  "repeat client",
  // Status
  "under contract",
  "closing soon",
  "on hold",
  "do not contact",
  // Source-based
  "open house lead",
  "online lead",
  "sign call",
] as const;
export type ContactTag = (typeof CONTACT_TAGS)[number];

export const CONTACT_TAG_GROUPS: Record<string, readonly string[]> = {
  "Priority": ["vip", "hot lead", "warm lead", "cold lead"],
  "Buyer": ["first-time buyer", "pre-approved", "investor", "downsizer", "upsizer", "relocating"],
  "Seller": ["listing active", "listing expired", "listing sold", "fsbo"],
  "Relationship": ["past client", "referral", "sphere of influence", "repeat client"],
  "Status": ["under contract", "closing soon", "on hold", "do not contact"],
  "Source": ["open house lead", "online lead", "sign call"],
};

// ── Stage Bar (Pipeline Stages) ──────────────────────────────

export const BUYER_STAGES = [
  "new",
  "qualified",
  "active_search",
  "under_contract",
  "closed",
  "cold",
] as const;
export type BuyerStage = (typeof BUYER_STAGES)[number];

export const SELLER_STAGES = [
  "new",
  "qualified",
  "active_listing",
  "under_contract",
  "closed",
  "cold",
] as const;
export type SellerStage = (typeof SELLER_STAGES)[number];

export const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  active_search: "Active Search",
  active_listing: "Active Listing",
  under_contract: "Under Contract",
  closed: "Closed",
  cold: "Cold",
};

export const STAGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  new: { bg: "bg-sky-100", text: "text-sky-800", dot: "bg-sky-500" },
  qualified: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  active_search: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  active_listing: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  under_contract: { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
  closed: { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-600" },
  cold: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
};

// ── Financing Statuses ───────────────────────────────────────
export const FINANCING_STATUSES = [
  "not_started",
  "in_progress",
  "preapproved",
] as const;
export type FinancingStatus = (typeof FINANCING_STATUSES)[number];

export const FINANCING_STATUS_LABELS: Record<FinancingStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  preapproved: "Pre-Approved",
};

// ── Contact Document Types ───────────────────────────────────
export const CONTACT_DOC_TYPES = [
  "Pre-Approval",
  "ID Copy",
  "Agreement",
  "Contract",
  "Other",
] as const;
export type ContactDocType = (typeof CONTACT_DOC_TYPES)[number];

// ── Relationship Types ──────────────────────────────────────
export const RELATIONSHIP_TYPES = [
  "spouse", "parent", "child", "sibling", "friend",
  "colleague", "neighbour", "other",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  spouse: "Spouse",
  parent: "Parent",
  child: "Child",
  sibling: "Sibling",
  friend: "Friend",
  colleague: "Colleague",
  neighbour: "Neighbour",
  other: "Other",
};

export const RELATIONSHIP_TYPE_EMOJI: Record<RelationshipType, string> = {
  spouse: "👫",
  parent: "👨‍👧",
  child: "👧",
  sibling: "👨‍👦",
  friend: "🤝",
  colleague: "👔",
  neighbour: "🏘️",
  other: "👤",
};

export const RELATIONSHIP_INVERSE: Record<RelationshipType, RelationshipType> = {
  parent: "child",
  child: "parent",
  spouse: "spouse",
  sibling: "sibling",
  friend: "friend",
  colleague: "colleague",
  neighbour: "neighbour",
  other: "other",
};

// ── Event Types ─────────────────────────────────────────────
export const EVENT_TYPES = [
  "birthday", "anniversary", "move_in", "closing", "renewal", "custom",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  move_in: "Move-in Date",
  closing: "Closing Date",
  renewal: "Renewal Date",
  custom: "Custom",
};

export const EVENT_TYPE_EMOJI: Record<EventType, string> = {
  birthday: "🎂",
  anniversary: "💍",
  move_in: "🏠",
  closing: "🔑",
  renewal: "📋",
  custom: "📅",
};

// ── Income Ranges ───────────────────────────────────────────
export const INCOME_RANGES = [
  "Under $50K",
  "$50K - $100K",
  "$100K - $150K",
  "$150K - $250K",
  "$250K - $500K",
  "$500K+",
  "Prefer not to say",
] as const;
export type IncomeRange = (typeof INCOME_RANGES)[number];

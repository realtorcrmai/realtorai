export const BUYER_STAGES = [
  "new_lead",
  "qualified",
  "showing",
  "offer",
  "conditional",
  "subject_removal",
  "closing",
  "closed",
] as const;

export const SELLER_STAGES = [
  "pre_listing",
  "listed",
  "showing",
  "offer_received",
  "conditional",
  "subject_removal",
  "closing",
  "closed",
] as const;

export const ALL_STAGES = [
  "new_lead",
  "qualified",
  "pre_listing",
  "listed",
  "showing",
  "offer",
  "offer_received",
  "conditional",
  "subject_removal",
  "closing",
  "closed",
] as const;

export type PipelineStage = (typeof ALL_STAGES)[number];

export const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  qualified: "Qualified",
  pre_listing: "Pre-Listing",
  listed: "Listed",
  showing: "Showing",
  offer: "Offer",
  offer_received: "Offer Received",
  conditional: "Conditional",
  subject_removal: "Subject Removal",
  closing: "Closing",
  closed: "Closed",
};

export const STAGE_COLORS: Record<string, string> = {
  new_lead: "bg-blue-50 text-blue-700 border-blue-200",
  qualified: "bg-[#0F7694]/5 text-[#0A6880] border-[#0F7694]/20",
  pre_listing: "bg-slate-50 text-slate-700 border-slate-200",
  listed: "bg-[#0F7694]/5 text-[#0A6880] border-[#0F7694]/20",
  showing: "bg-[#0F7694]/10 text-[#0A6880] border-[#0F7694]/20",
  offer: "bg-amber-50 text-amber-700 border-amber-200",
  offer_received: "bg-amber-50 text-amber-700 border-amber-200",
  conditional: "bg-orange-50 text-orange-700 border-orange-200",
  subject_removal: "bg-rose-50 text-rose-700 border-rose-200",
  closing: "bg-[#0F7694]/5 text-[#0A6880] border-[#0F7694]/20",
  closed: "bg-[#0F7694]/5 text-[#0A6880] border-[#0F7694]/20",
};

export const DEAL_STATUS_COLORS: Record<string, string> = {
  active: "bg-[#0F7694]/5 text-[#0A6880] border-[#0F7694]/20",
  won: "bg-[#0F7694]/5 text-[#0A6880] border-[#0F7694]/20",
  lost: "bg-red-50 text-red-700 border-red-200",
};

export const PARTY_ROLES = [
  "buyer_agent",
  "seller_agent",
  "lawyer",
  "lender",
  "inspector",
  "appraiser",
  "other",
] as const;

export const PARTY_ROLE_LABELS: Record<string, string> = {
  buyer_agent: "Buyer's Agent",
  seller_agent: "Seller's Agent",
  lawyer: "Lawyer",
  lender: "Lender",
  inspector: "Inspector",
  appraiser: "Appraiser",
  other: "Other",
};

export const DEFAULT_BUYER_CHECKLIST = [
  "Pre-approval letter obtained",
  "Property viewed",
  "Offer submitted",
  "Offer accepted",
  "Home inspection scheduled",
  "Home inspection completed",
  "Appraisal ordered",
  "Appraisal received",
  "Subjects removed",
  "Mortgage finalized",
  "Title search completed",
  "Closing documents signed",
  "Keys received",
];

export const DEFAULT_SELLER_CHECKLIST = [
  "Comparative market analysis",
  "Listing agreement signed",
  "Property photos taken",
  "MLS listing published",
  "Lockbox installed",
  "Open house scheduled",
  "Offer received",
  "Offer accepted",
  "Buyer conditions review",
  "Subjects removed",
  "Closing documents prepared",
  "Closing completed",
  "Possession transferred",
];

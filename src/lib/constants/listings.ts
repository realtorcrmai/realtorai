export const LISTING_STATUSES = [
  "active",
  "pending",
  "conditional",
  "sold",
  "cancelled",
  "expired",
  "withdrawn",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Consistent status badge colors used across sidebar, cards, and detail pages */
export const LISTING_STATUS_COLORS: Record<ListingStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  conditional: "bg-purple-50 text-purple-700 border-purple-200",
  sold: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-gray-100 text-gray-600 border-gray-200",
  withdrawn: "bg-orange-50 text-orange-700 border-orange-200",
};

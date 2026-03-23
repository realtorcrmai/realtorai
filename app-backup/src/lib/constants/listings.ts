export const LISTING_STATUSES = ["active", "pending", "sold"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Consistent status badge colors used across sidebar, cards, and detail pages */
export const LISTING_STATUS_COLORS: Record<ListingStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  sold: "bg-blue-50 text-blue-700 border-blue-200",
};

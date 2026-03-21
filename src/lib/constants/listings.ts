import { getStatusColor } from "./theme";

export const LISTING_STATUSES = ["active", "pending", "sold"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Consistent status badge colors used across sidebar, cards, and detail pages */
export const LISTING_STATUS_COLORS: Record<ListingStatus, string> = {
  active: getStatusColor("listing", "active").badge,
  pending: getStatusColor("listing", "pending").badge,
  sold: getStatusColor("listing", "sold").badge,
};

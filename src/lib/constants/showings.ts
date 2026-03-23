export const SHOWING_STATUSES = ["requested", "confirmed", "denied", "cancelled"] as const;
export type ShowingStatus = (typeof SHOWING_STATUSES)[number];

export const SHOWING_STATUS_CONFIG: Record<
  ShowingStatus,
  { label: string; className: string }
> = {
  requested: {
    label: "Requested",
    className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
  },
  denied: {
    label: "Denied",
    className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50",
  },
};

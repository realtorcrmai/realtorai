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
    className: "bg-[#0F7694]/5 text-[#0A6880] border-[#0F7694]/20 hover:bg-[#0F7694]/5",
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

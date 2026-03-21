import { getStatusColor } from "./theme";

export const SHOWING_STATUSES = ["requested", "confirmed", "denied", "cancelled"] as const;
export type ShowingStatus = (typeof SHOWING_STATUSES)[number];

export const SHOWING_STATUS_CONFIG: Record<
  ShowingStatus,
  { label: string; className: string }
> = {
  requested: {
    label: "Requested",
    className: `${getStatusColor("showing", "requested").badge} ${getStatusColor("showing", "requested").hoverBg}`,
  },
  confirmed: {
    label: "Confirmed",
    className: `${getStatusColor("showing", "confirmed").badge} ${getStatusColor("showing", "confirmed").hoverBg}`,
  },
  denied: {
    label: "Denied",
    className: `${getStatusColor("showing", "denied").badge} ${getStatusColor("showing", "denied").hoverBg}`,
  },
  cancelled: {
    label: "Cancelled",
    className: `${getStatusColor("showing", "cancelled").badge} ${getStatusColor("showing", "cancelled").hoverBg}`,
  },
};

import { getStatusColor } from "./theme";

export const CONTACT_TYPES = ["buyer", "seller"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  seller: getStatusColor("contact", "seller").badge,
  buyer: getStatusColor("contact", "buyer").badge,
};

export const PREF_CHANNELS = ["whatsapp", "sms"] as const;
export type PrefChannel = (typeof PREF_CHANNELS)[number];

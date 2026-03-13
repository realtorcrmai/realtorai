export const CONTACT_TYPES = ["buyer", "seller"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  seller: "bg-purple-100 text-purple-800",
  buyer: "bg-blue-100 text-blue-800",
};

export const PREF_CHANNELS = ["whatsapp", "sms"] as const;
export type PrefChannel = (typeof PREF_CHANNELS)[number];

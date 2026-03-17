import { z } from "zod";
import { CONTACT_TYPES, PREF_CHANNELS, LEAD_STATUSES } from "@/lib/constants";

export const contactSchema = z.object({
  name: z.string().min(2),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[\d\s\-\(\)\+\.]+$/, "Invalid phone number format"),
  email: z.string().email().optional().or(z.literal("")),
  type: z.enum(CONTACT_TYPES),
  pref_channel: z.enum(PREF_CHANNELS).default("sms"),
  notes: z.string().optional(),
  address: z.string().optional(),
  referred_by_id: z.string().uuid().optional().or(z.literal("")),
  source: z.string().optional(),
  lead_status: z.enum(LEAD_STATUSES).optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;

import { z } from "zod";
import { CONTACT_TYPES, PREF_CHANNELS, LEAD_STATUSES, PARTNER_TYPES } from "@/lib/constants";

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
  // Partner-specific fields
  partner_type: z.enum(PARTNER_TYPES).optional().or(z.literal("")),
  company_name: z.string().optional(),
  job_title: z.string().optional(),
  typical_client_profile: z.string().optional(),
  referral_agreement_terms: z.string().optional(),
  // JSONB preference fields
  buyer_preferences: z.record(z.string(), z.unknown()).optional(),
  seller_preferences: z.record(z.string(), z.unknown()).optional(),
  demographics: z.record(z.string(), z.unknown()).optional(),
  // Social media handles: { instagram: "handle", linkedin: "handle", ... }
  social_profiles: z.record(z.string(), z.string()).optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;

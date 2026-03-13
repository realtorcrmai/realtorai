import { z } from "zod";
import { CONTACT_TYPES, PREF_CHANNELS } from "@/lib/constants";

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
});

export type ContactFormData = z.infer<typeof contactSchema>;

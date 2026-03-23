import { z } from "zod";

export const showingSchema = z.object({
  listingId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  buyerAgentName: z.string().min(2),
  buyerAgentPhone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[\d\s\-\(\)\+\.]+$/, "Invalid phone number format"),
  buyerAgentEmail: z.string().email().optional(),
});

export type ShowingFormData = z.infer<typeof showingSchema>;

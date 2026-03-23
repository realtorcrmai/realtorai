import { z } from "zod";
import { LISTING_STATUSES } from "@/lib/constants";

export const listingSchema = z.object({
  address: z.string().min(5),
  seller_id: z.string().uuid(),
  lockbox_code: z.string().min(1),
  status: z.enum(LISTING_STATUSES).default("active"),
  property_type: z.enum(["Residential", "Condo/Apartment", "Townhouse", "Land", "Commercial", "Multi-Family"]).optional(),
  mls_number: z.string().optional(),
  list_price: z.number().positive().optional(),
  showing_window_start: z.string().optional(),
  showing_window_end: z.string().optional(),
  notes: z.string().optional(),
});

export type ListingFormData = z.infer<typeof listingSchema>;

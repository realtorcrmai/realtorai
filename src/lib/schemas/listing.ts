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
  // Property details (migration 141)
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  total_sqft: z.number().positive().optional(),
  finished_sqft: z.number().positive().optional(),
  lot_sqft: z.number().positive().optional(),
  year_built: z.number().int().min(1800).max(2030).optional(),
  parking_spaces: z.number().int().min(0).optional(),
  stories: z.number().int().min(1).optional(),
  basement_type: z.string().optional(),
  heating_type: z.string().optional(),
  cooling_type: z.string().optional(),
  roof_type: z.string().optional(),
  exterior_type: z.string().optional(),
  flooring: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
});

export type ListingFormData = z.infer<typeof listingSchema>;

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

// ============================================================
// Types
// ============================================================

export type PropertyStatus =
  | "interested" | "scheduled" | "viewed" | "offer_pending"
  | "offer_made" | "accepted" | "rejected" | "withdrawn" | "closed";

export type OfferStatus =
  | "pending" | "accepted" | "rejected" | "countered" | "withdrawn" | "subject_removed";

export type BuyerJourneyProperty = {
  id: string;
  realtor_id: string;
  journey_id: string;
  contact_id: string;
  listing_id: string | null;
  mls_number: string | null;
  address: string;
  list_price: number | null;
  property_type: string | null;
  status: PropertyStatus;
  interest_level: number | null;
  notes: string | null;
  showing_id: string | null;
  offer_price: number | null;
  offer_date: string | null;
  offer_expiry: string | null;
  offer_status: OfferStatus | null;
  counter_price: number | null;
  subjects: string[];
  subject_removal_date: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================
// Schemas
// ============================================================

const AddPropertySchema = z.object({
  journey_id: z.string().min(1),
  contact_id: z.string().min(1),
  address: z.string().min(1),
  listing_id: z.string().nullable().optional(),
  mls_number: z.string().nullable().optional(),
  list_price: z.number().positive().nullable().optional(),
  property_type: z.string().nullable().optional(),
  interest_level: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum([
    "interested","scheduled","viewed","offer_pending",
    "offer_made","accepted","rejected","withdrawn","closed",
  ]).default("interested"),
});

const RecordOfferSchema = z.object({
  offer_price: z.number().positive(),
  offer_date: z.string().min(1),
  offer_expiry: z.string().nullable().optional(),
  subjects: z.array(z.string()).default([]),
  offer_status: z.enum([
    "pending","accepted","rejected","countered","withdrawn","subject_removed",
  ]).default("pending"),
  counter_price: z.number().positive().nullable().optional(),
  subject_removal_date: z.string().nullable().optional(),
});

// ============================================================
// addPropertyToJourney
// ============================================================

export async function addPropertyToJourney(
  data: z.infer<typeof AddPropertySchema>
): Promise<{ property: BuyerJourneyProperty | null; error: string | null }> {
  const parsed = AddPropertySchema.safeParse(data);
  if (!parsed.success) {
    return { property: null, error: parsed.error.issues[0].message };
  }

  try {
    const tc = await getAuthenticatedTenantClient();

    const { data: prop, error } = await tc
      .from("buyer_journey_properties")
      .insert(parsed.data)
      .select()
      .single();

    if (error) return { property: null, error: error.message };

    revalidatePath(`/contacts/${parsed.data.contact_id}`);

    return { property: prop as BuyerJourneyProperty, error: null };
  } catch (err) {
    return { property: null, error: String(err) };
  }
}

// ============================================================
// updatePropertyStatus
// ============================================================

export async function updatePropertyStatus(
  propertyId: string,
  status: PropertyStatus
): Promise<{ error: string | null }> {
  try {
    const tc = await getAuthenticatedTenantClient();

    const { data: prop, error: fetchErr } = await tc
      .from("buyer_journey_properties")
      .select("contact_id, journey_id")
      .eq("id", propertyId)
      .single();

    if (fetchErr || !prop) return { error: fetchErr?.message ?? "Property not found" };

    const { error } = await tc
      .from("buyer_journey_properties")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", propertyId);

    if (error) return { error: error.message };

    // If offer accepted → advance journey to conditional
    if (status === "accepted") {
      const { advanceBuyerJourneyStatus } = await import("./buyer-journeys");
      const { data: journey } = await tc
        .from("buyer_journeys")
        .select("id, status")
        .eq("id", (prop as { journey_id: string }).journey_id)
        .single();

      if (journey && (journey as { status: string }).status === "offer_made") {
        await advanceBuyerJourneyStatus((prop as { journey_id: string }).journey_id);
      }
    }

    revalidatePath(`/contacts/${(prop as { contact_id: string }).contact_id}`);

    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

// ============================================================
// recordOffer
// ============================================================

export async function recordOffer(
  propertyId: string,
  offerData: z.infer<typeof RecordOfferSchema>
): Promise<{ error: string | null }> {
  const parsed = RecordOfferSchema.safeParse(offerData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const tc = await getAuthenticatedTenantClient();

    const { data: prop, error: fetchErr } = await tc
      .from("buyer_journey_properties")
      .select("contact_id, journey_id")
      .eq("id", propertyId)
      .single();

    if (fetchErr || !prop) return { error: fetchErr?.message ?? "Property not found" };

    const { error } = await tc
      .from("buyer_journey_properties")
      .update({
        ...parsed.data,
        status: "offer_made",
        updated_at: new Date().toISOString(),
      })
      .eq("id", propertyId);

    if (error) return { error: error.message };

    // Advance journey to offer_made
    const { advanceBuyerJourneyStatus } = await import("./buyer-journeys");
    const { data: journey } = await tc
      .from("buyer_journeys")
      .select("id, status")
      .eq("id", (prop as { journey_id: string }).journey_id)
      .single();

    if (journey && (journey as { status: string }).status === "viewing") {
      await advanceBuyerJourneyStatus((prop as { journey_id: string }).journey_id);
    }

    // If subjects removed → advance to firm
    if (parsed.data.offer_status === "subject_removed") {
      await tc
        .from("buyer_journey_properties")
        .update({ subject_removal_date: parsed.data.subject_removal_date ?? new Date().toISOString().split("T")[0] })
        .eq("id", propertyId);

      const { data: updatedJourney } = await tc
        .from("buyer_journeys")
        .select("status")
        .eq("id", (prop as { journey_id: string }).journey_id)
        .single();

      if (updatedJourney && (updatedJourney as { status: string }).status === "conditional") {
        await advanceBuyerJourneyStatus((prop as { journey_id: string }).journey_id);
      }
    }

    revalidatePath(`/contacts/${(prop as { contact_id: string }).contact_id}`);

    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

// ============================================================
// getPropertiesForJourney
// ============================================================

export async function getPropertiesForJourney(
  journeyId: string
): Promise<{ properties: BuyerJourneyProperty[]; error: string | null }> {
  try {
    const tc = await getAuthenticatedTenantClient();

    const { data, error } = await tc
      .from("buyer_journey_properties")
      .select("*")
      .eq("journey_id", journeyId)
      .order("created_at", { ascending: false });

    if (error) return { properties: [], error: error.message };

    return { properties: (data ?? []) as BuyerJourneyProperty[], error: null };
  } catch (err) {
    return { properties: [], error: String(err) };
  }
}

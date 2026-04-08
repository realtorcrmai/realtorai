"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTenantClient, getRealtorId } from "@/lib/supabase/tenant";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Types
// ============================================================

export type BuyerJourneyStatus =
  | "searching" | "viewing" | "offer_made" | "conditional"
  | "firm" | "closed" | "paused" | "cancelled";

export type BuyerJourney = {
  id: string;
  realtor_id: string;
  contact_id: string;
  status: BuyerJourneyStatus;
  min_price: number | null;
  max_price: number | null;
  pre_approval_amount: number | null;
  financing_status: string | null;
  preferred_areas: string[];
  property_types: string[];
  min_beds: number | null;
  max_beds: number | null;
  min_baths: number | null;
  must_haves: string[];
  nice_to_haves: string[];
  target_close_date: string | null;
  urgency: "low" | "medium" | "high" | "very_high" | null;
  conditional_on_sale: boolean;
  conditional_listing_id: string | null;
  notes: string | null;
  ai_buyer_score: number | null;
  ai_summary: string | null;
  purchased_address: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  linked_portfolio_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BuyerMatch = {
  journey_id: string;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  min_price: number | null;
  max_price: number | null;
  preferred_areas: string[];
  status: BuyerJourneyStatus;
  ai_buyer_score: number | null;
};

// ============================================================
// Schemas
// ============================================================

const CreateJourneySchema = z.object({
  contact_id: z.string().min(1),
  status: z.enum(["searching", "viewing", "offer_made", "conditional", "firm", "closed", "paused", "cancelled"]).default("searching"),
  min_price: z.number().positive().nullable().optional(),
  max_price: z.number().positive().nullable().optional(),
  pre_approval_amount: z.number().positive().nullable().optional(),
  financing_status: z.string().nullable().optional(),
  preferred_areas: z.array(z.string()).default([]),
  property_types: z.array(z.string()).default([]),
  min_beds: z.number().int().min(0).nullable().optional(),
  max_beds: z.number().int().min(0).nullable().optional(),
  min_baths: z.number().min(0).nullable().optional(),
  must_haves: z.array(z.string()).default([]),
  nice_to_haves: z.array(z.string()).default([]),
  target_close_date: z.string().nullable().optional(),
  urgency: z.enum(["low", "medium", "high", "very_high"]).nullable().optional(),
  conditional_on_sale: z.boolean().default(false),
  conditional_listing_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const UpdateJourneySchema = CreateJourneySchema.partial().extend({
  ai_buyer_score: z.number().int().min(1).max(100).nullable().optional(),
  ai_summary: z.string().nullable().optional(),
  purchased_address: z.string().nullable().optional(),
  purchase_price: z.number().positive().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  linked_portfolio_id: z.string().nullable().optional(),
});

const JOURNEY_STATUS_ORDER: BuyerJourneyStatus[] = [
  "searching", "viewing", "offer_made", "conditional", "firm", "closed",
];

// ============================================================
// createBuyerJourney
// ============================================================

export async function createBuyerJourney(
  data: z.infer<typeof CreateJourneySchema>
): Promise<{ journey: BuyerJourney | null; error: string | null }> {
  const parsed = CreateJourneySchema.safeParse(data);
  if (!parsed.success) {
    return { journey: null, error: parsed.error.issues[0].message };
  }

  try {
    const tc = await getAuthenticatedTenantClient();

    const { data: journey, error } = await tc
      .from("buyer_journeys")
      .insert(parsed.data)
      .select()
      .single();

    if (error) return { journey: null, error: error.message };

    // Auto-add 'buyer' to contact roles + advance lifecycle_stage
    await _addRoleToContact(parsed.data.contact_id, "buyer", tc.realtorId);

    revalidatePath(`/contacts/${parsed.data.contact_id}`);
    revalidatePath("/contacts");

    return { journey: journey as BuyerJourney, error: null };
  } catch (err) {
    return { journey: null, error: String(err) };
  }
}

// ============================================================
// updateBuyerJourney
// ============================================================

export async function updateBuyerJourney(
  journeyId: string,
  data: z.infer<typeof UpdateJourneySchema>
): Promise<{ journey: BuyerJourney | null; error: string | null }> {
  const parsed = UpdateJourneySchema.safeParse(data);
  if (!parsed.success) {
    return { journey: null, error: parsed.error.issues[0].message };
  }

  try {
    const tc = await getAuthenticatedTenantClient();

    const { data: journey, error } = await tc
      .from("buyer_journeys")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", journeyId)
      .select()
      .single();

    if (error) return { journey: null, error: error.message };

    revalidatePath(`/contacts/${(journey as BuyerJourney).contact_id}`);

    return { journey: journey as BuyerJourney, error: null };
  } catch (err) {
    return { journey: null, error: String(err) };
  }
}

// ============================================================
// advanceBuyerJourneyStatus
// ============================================================

export async function advanceBuyerJourneyStatus(
  journeyId: string
): Promise<{ status: BuyerJourneyStatus | null; error: string | null }> {
  try {
    const tc = await getAuthenticatedTenantClient();

    const { data: journey, error: fetchErr } = await tc
      .from("buyer_journeys")
      .select("id, contact_id, status")
      .eq("id", journeyId)
      .single();

    if (fetchErr || !journey) return { status: null, error: fetchErr?.message ?? "Journey not found" };

    const current = (journey as { status: BuyerJourneyStatus }).status;
    const idx = JOURNEY_STATUS_ORDER.indexOf(current);
    if (idx === -1 || idx >= JOURNEY_STATUS_ORDER.length - 1) {
      return { status: current, error: "Journey is already at the final status" };
    }

    const nextStatus = JOURNEY_STATUS_ORDER[idx + 1];

    const { error: updateErr } = await tc
      .from("buyer_journeys")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", journeyId);

    if (updateErr) return { status: null, error: updateErr.message };

    // Advance lifecycle_stage when journey moves to conditional/firm
    if (nextStatus === "conditional" || nextStatus === "firm") {
      await _computeAndSaveLifecycleStage(
        (journey as { contact_id: string }).contact_id,
        tc.realtorId
      );
    }

    revalidatePath(`/contacts/${(journey as { contact_id: string }).contact_id}`);

    return { status: nextStatus, error: null };
  } catch (err) {
    return { status: null, error: String(err) };
  }
}

// ============================================================
// closeBuyerJourney
// ============================================================

export async function closeBuyerJourney(
  journeyId: string,
  closeData: { purchased_address: string; purchase_price: number; purchase_date: string }
): Promise<{ error: string | null }> {
  try {
    const tc = await getAuthenticatedTenantClient();

    const { data: journey, error: fetchErr } = await tc
      .from("buyer_journeys")
      .select("*")
      .eq("id", journeyId)
      .single();

    if (fetchErr || !journey) return { error: fetchErr?.message ?? "Journey not found" };

    const { error: updateErr } = await tc
      .from("buyer_journeys")
      .update({
        status: "closed",
        purchased_address: closeData.purchased_address,
        purchase_price: closeData.purchase_price,
        purchase_date: closeData.purchase_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", journeyId);

    if (updateErr) return { error: updateErr.message };

    // Auto-create portfolio item for the buyer
    const { addPortfolioItem } = await import("./contact-portfolio");
    await addPortfolioItem({
      contact_id: (journey as BuyerJourney).contact_id,
      address: closeData.purchased_address,
      purchase_price: closeData.purchase_price,
      purchase_date: closeData.purchase_date,
      status: "owned",
      property_category: "primary_residence",
      source_journey_id: journeyId,
    });

    // Advance lifecycle to past_client
    await _computeAndSaveLifecycleStage(
      (journey as BuyerJourney).contact_id,
      tc.realtorId
    );

    revalidatePath(`/contacts/${(journey as BuyerJourney).contact_id}`);

    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

// ============================================================
// matchBuyersToListing
// ============================================================

export async function matchBuyersToListing(
  listingId: string
): Promise<{ matches: BuyerMatch[]; error: string | null }> {
  try {
    const tc = await getAuthenticatedTenantClient();

    // Fetch listing details
    const { data: listing, error: listingErr } = await tc
      .from("listings")
      .select("list_price, property_type, address")
      .eq("id", listingId)
      .single();

    if (listingErr || !listing) return { matches: [], error: listingErr?.message ?? "Listing not found" };

    const { list_price, property_type } = listing as {
      list_price: number | null;
      property_type: string;
      address: string;
    };

    // Extract city/area from listing address (simple: first word before comma)
    const listingArea = (listing as { address: string }).address?.split(",")[0]?.trim() ?? "";

    // Query active buyer journeys with overlapping criteria
    const supabase = createAdminClient();
    const { data: journeys, error: journeysErr } = await supabase
      .from("buyer_journeys")
      .select(`
        id,
        contact_id,
        min_price,
        max_price,
        preferred_areas,
        property_types,
        status,
        ai_buyer_score,
        contacts!inner(name, phone)
      `)
      .eq("realtor_id", tc.realtorId)
      .in("status", ["searching", "viewing"])
      .or(
        list_price
          ? `min_price.lte.${list_price},max_price.gte.${list_price}`
          : "min_price.is.null"
      );

    if (journeysErr) return { matches: [], error: journeysErr.message };

    // Filter: price range AND (area overlap OR property type overlap)
    const matches: BuyerMatch[] = ((journeys ?? []) as Record<string, unknown>[])
      .filter((j) => {
        const areas = (j.preferred_areas as string[]) ?? [];
        const types = (j.property_types as string[]) ?? [];
        const areaMatch = areas.length === 0 || areas.some((a) =>
          listingArea.toLowerCase().includes(a.toLowerCase()) ||
          a.toLowerCase().includes(listingArea.toLowerCase())
        );
        const typeMatch = types.length === 0 || types.includes(property_type);
        return areaMatch || typeMatch;
      })
      .map((j) => {
        const contact = j.contacts as { name: string; phone: string };
        return {
          journey_id: j.id as string,
          contact_id: j.contact_id as string,
          contact_name: contact.name,
          contact_phone: contact.phone,
          min_price: j.min_price as number | null,
          max_price: j.max_price as number | null,
          preferred_areas: (j.preferred_areas as string[]) ?? [],
          status: j.status as BuyerJourneyStatus,
          ai_buyer_score: j.ai_buyer_score as number | null,
        };
      });

    return { matches, error: null };
  } catch (err) {
    return { matches: [], error: String(err) };
  }
}

// ============================================================
// getBuyerJourneysForContact
// ============================================================

export async function getBuyerJourneysForContact(
  contactId: string
): Promise<{ journeys: BuyerJourney[]; error: string | null }> {
  try {
    const tc = await getAuthenticatedTenantClient();

    const { data, error } = await tc
      .from("buyer_journeys")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });

    if (error) return { journeys: [], error: error.message };

    return { journeys: (data ?? []) as BuyerJourney[], error: null };
  } catch (err) {
    return { journeys: [], error: String(err) };
  }
}

// ============================================================
// Private helpers
// ============================================================

async function _addRoleToContact(
  contactId: string,
  role: string,
  realtorId: string
): Promise<void> {
  const supabase = createAdminClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("roles, lifecycle_stage")
    .eq("id", contactId)
    .eq("realtor_id", realtorId)
    .single();

  if (!contact) return;

  const existing: string[] = (contact as { roles: string[] }).roles ?? [];
  const newRoles = existing.includes(role) ? existing : [...existing, role];

  await supabase
    .from("contacts")
    .update({
      roles: newRoles,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .eq("realtor_id", realtorId);

  await _computeAndSaveLifecycleStage(contactId, realtorId);
}

async function _computeAndSaveLifecycleStage(
  contactId: string,
  realtorId: string
): Promise<void> {
  const { computeLifecycleStage } = await import("./contacts");
  await computeLifecycleStage(contactId, realtorId);
}

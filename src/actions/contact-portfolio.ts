"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

// ============================================================
// Types
// ============================================================

export type PortfolioStatus = "owned" | "selling" | "sold" | "refinancing" | "transferred";
export type PropertyCategory = "primary_residence" | "investment" | "vacation" | "commercial" | "other";

export type PortfolioItem = {
  id: string;
  realtor_id: string;
  contact_id: string;
  address: string;
  unit_number: string | null;
  city: string | null;
  province: string;
  postal_code: string | null;
  property_type: string | null;
  property_category: PropertyCategory | null;
  ownership_pct: number;
  co_owners: unknown[];
  purchase_price: number | null;
  purchase_date: string | null;
  estimated_value: number | null;
  bc_assessed_value: number | null;
  mortgage_balance: number | null;
  monthly_rental_income: number | null;
  strata_fee: number | null;
  status: PortfolioStatus;
  linked_listing_id: string | null;
  source_journey_id: string | null;
  notes: string | null;
  enrichment_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// ============================================================
// Schemas
// ============================================================

const AddPortfolioSchema = z.object({
  contact_id: z.string().min(1),
  address: z.string().min(1),
  unit_number: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().default("BC"),
  postal_code: z.string().nullable().optional(),
  property_type: z.string().nullable().optional(),
  property_category: z.enum(["primary_residence","investment","vacation","commercial","other"]).nullable().optional(),
  ownership_pct: z.number().min(0).max(100).default(100),
  co_owners: z.array(z.object({
    name: z.string().min(1),
    role: z.enum(["individual", "partner", "spouse", "trust", "corporation"]),
    ownership_pct: z.number().min(0).max(100),
    contact_id: z.string().optional(),
  })).max(10).default([]),
  purchase_price: z.number().positive().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  estimated_value: z.number().positive().nullable().optional(),
  bc_assessed_value: z.number().positive().nullable().optional(),
  mortgage_balance: z.number().min(0).nullable().optional(),
  monthly_rental_income: z.number().min(0).nullable().optional(),
  strata_fee: z.number().min(0).nullable().optional(),
  status: z.enum(["owned","selling","sold","refinancing","transferred"]).default("owned"),
  linked_listing_id: z.string().nullable().optional(),
  source_journey_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  enrichment_data: z.record(z.string(), z.unknown()).default({}),
});

const UpdatePortfolioSchema = AddPortfolioSchema.partial().omit({ contact_id: true });

// ============================================================
// addPortfolioItem
// ============================================================

export async function addPortfolioItem(
  data: z.input<typeof AddPortfolioSchema>
): Promise<{ item: PortfolioItem | null; error: string | null }> {
  const parsed = AddPortfolioSchema.safeParse(data);
  if (!parsed.success) {
    return { item: null, error: parsed.error.issues[0].message };
  }

  try {
    const tc = await getAuthenticatedTenantClient();

    const { data: item, error } = await tc
      .from("contact_portfolio")
      .insert(parsed.data)
      .select()
      .single();

    if (error) return { item: null, error: error.message };

    // Mirror: create portfolio entries for co-owners so the property
    // appears on their contact pages too
    const coOwners = parsed.data.co_owners ?? [];
    const primaryContactId = parsed.data.contact_id;
    for (const co of coOwners) {
      if (!co.contact_id || co.contact_id === primaryContactId) continue;
      // Build co_owners list from the perspective of this co-owner
      const otherOwners = [
        // The primary contact becomes a co-owner from this perspective
        ...coOwners
          .filter((o) => o.contact_id !== co.contact_id)
          .map((o) => ({ name: o.name, role: o.role, ownership_pct: o.ownership_pct, contact_id: o.contact_id })),
        { name: "", role: "individual" as const, ownership_pct: parsed.data.ownership_pct ?? 100, contact_id: primaryContactId },
      ];
      await tc.from("contact_portfolio").upsert({
        contact_id: co.contact_id,
        address: parsed.data.address,
        unit_number: parsed.data.unit_number ?? null,
        city: parsed.data.city ?? null,
        province: parsed.data.province ?? "BC",
        postal_code: parsed.data.postal_code ?? null,
        property_type: parsed.data.property_type ?? null,
        property_category: parsed.data.property_category ?? null,
        ownership_pct: co.ownership_pct,
        co_owners: otherOwners,
        status: parsed.data.status ?? "owned",
        purchase_price: parsed.data.purchase_price ?? null,
        purchase_date: parsed.data.purchase_date ?? null,
        estimated_value: parsed.data.estimated_value ?? null,
        notes: parsed.data.notes ?? null,
      }, { onConflict: "contact_id,address" }).then(() => {
        revalidatePath(`/contacts/${co.contact_id}`);
      });
    }

    revalidatePath(`/contacts/${parsed.data.contact_id}`);

    return { item: item as PortfolioItem, error: null };
  } catch (err) {
    return { item: null, error: String(err) };
  }
}

// ============================================================
// updatePortfolioItem
// ============================================================

export async function updatePortfolioItem(
  itemId: string,
  data: z.input<typeof UpdatePortfolioSchema>
): Promise<{ item: PortfolioItem | null; error: string | null }> {
  const parsed = UpdatePortfolioSchema.safeParse(data);
  if (!parsed.success) {
    return { item: null, error: parsed.error.issues[0].message };
  }

  try {
    const tc = await getAuthenticatedTenantClient();

    const { data: item, error } = await tc
      .from("contact_portfolio")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .select()
      .single();

    if (error) return { item: null, error: error.message };

    revalidatePath(`/contacts/${(item as PortfolioItem).contact_id}`);

    return { item: item as PortfolioItem, error: null };
  } catch (err) {
    return { item: null, error: String(err) };
  }
}

// ============================================================
// linkPortfolioToListing
// ============================================================

export async function linkPortfolioToListing(
  itemId: string,
  listingId: string
): Promise<{ error: string | null }> {
  try {
    const tc = await getAuthenticatedTenantClient();

    const { data: item, error } = await tc
      .from("contact_portfolio")
      .update({
        linked_listing_id: listingId,
        status: "selling",
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .select("contact_id")
      .single();

    if (error) return { error: error.message };

    revalidatePath(`/contacts/${(item as { contact_id: string }).contact_id}`);
    revalidatePath(`/listings/${listingId}`);

    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

// ============================================================
// autoCreateFromListingClose
// Triggered when a listing status changes to 'sold'
// Creates portfolio items for seller (status=sold) and buyer (status=owned) if buyer_contact_id set
// ============================================================

export async function autoCreateFromListingClose(
  listingId: string
): Promise<{ error: string | null }> {
  try {
    const tc = await getAuthenticatedTenantClient();

    const { data: listing, error: listingErr } = await tc
      .from("listings")
      .select("id, address, seller_id, buyer_contact_id, sold_price, closing_date, property_type, realtor_id")
      .eq("id", listingId)
      .single();

    if (listingErr || !listing) return { error: listingErr?.message ?? "Listing not found" };

    const l = listing as {
      id: string;
      address: string;
      seller_id: string;
      buyer_contact_id: string | null;
      sold_price: number | null;
      closing_date: string | null;
      property_type: string;
      realtor_id: string;
    };

    const { computeLifecycleStage } = await import("./contacts");

    // Seller side: mark as sold (skip if already exists for this listing)
    const { data: existingSeller } = await tc
      .from("contact_portfolio")
      .select("id")
      .eq("contact_id", l.seller_id)
      .eq("linked_listing_id", l.id)
      .maybeSingle();

    if (!existingSeller) {
      const { error: sellerInsertErr } = await tc.from("contact_portfolio").insert({
        contact_id: l.seller_id,
        address: l.address,
        property_type: l.property_type,
        status: "sold",
        purchase_price: l.sold_price,
        purchase_date: l.closing_date,
        linked_listing_id: l.id,
        notes: "Auto-created on listing close",
      });
      if (sellerInsertErr) return { error: sellerInsertErr.message };
    }

    // Buyer side: mark as owned (skip if already exists for this listing)
    if (l.buyer_contact_id) {
      const { data: existingBuyer } = await tc
        .from("contact_portfolio")
        .select("id")
        .eq("contact_id", l.buyer_contact_id)
        .eq("linked_listing_id", l.id)
        .maybeSingle();

      if (!existingBuyer) {
        const { error: buyerInsertErr } = await tc.from("contact_portfolio").insert({
          contact_id: l.buyer_contact_id,
          address: l.address,
          property_type: l.property_type,
          status: "owned",
          purchase_price: l.sold_price,
          purchase_date: l.closing_date,
          linked_listing_id: l.id,
          notes: "Auto-created on listing close",
        });
        if (buyerInsertErr) return { error: buyerInsertErr.message };
      }

      await computeLifecycleStage(l.buyer_contact_id, l.realtor_id);
    }

    // Advance seller's lifecycle to past_client
    await computeLifecycleStage(l.seller_id, l.realtor_id);

    revalidatePath(`/listings/${listingId}`);
    revalidatePath(`/contacts/${l.seller_id}`);
    if (l.buyer_contact_id) revalidatePath(`/contacts/${l.buyer_contact_id}`);

    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

// ============================================================
// deletePortfolioItem
// ============================================================

export async function deletePortfolioItem(
  itemId: string
): Promise<{ error: string | null }> {
  try {
    const tc = await getAuthenticatedTenantClient();

    // Fetch contact_id first so we can revalidate
    const { data: item, error: fetchErr } = await tc
      .from("contact_portfolio")
      .select("contact_id")
      .eq("id", itemId)
      .single();

    if (fetchErr || !item) return { error: fetchErr?.message ?? "Item not found" };

    const { error } = await tc
      .from("contact_portfolio")
      .delete()
      .eq("id", itemId);

    if (error) return { error: error.message };

    revalidatePath(`/contacts/${(item as { contact_id: string }).contact_id}`);
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

// ============================================================
// upsertPrimaryResidence
// Called when contact.address is updated — keeps portfolio in sync
// ============================================================

export async function upsertPrimaryResidence(
  contactId: string,
  address: string,
  city?: string | null,
  province?: string,
  postalCode?: string | null
): Promise<{ error: string | null }> {
  if (!address) return { error: null };

  try {
    const tc = await getAuthenticatedTenantClient();

    // Find existing primary residence entry for this contact
    const { data: existing } = await tc
      .from("contact_portfolio")
      .select("id")
      .eq("contact_id", contactId)
      .eq("property_category", "primary_residence")
      .eq("status", "owned")
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await tc
        .from("contact_portfolio")
        .update({
          address,
          city: city ?? null,
          province: province ?? "BC",
          postal_code: postalCode ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateErr) return { error: updateErr.message };
    } else {
      const { error: insertErr } = await tc
        .from("contact_portfolio")
        .insert({
          contact_id: contactId,
          address,
          city: city ?? null,
          province: province ?? "BC",
          postal_code: postalCode ?? null,
          property_category: "primary_residence",
          status: "owned",
          ownership_pct: 100,
          notes: "Auto-created from contact address",
        });
      if (insertErr) return { error: insertErr.message };
    }

    revalidatePath(`/contacts/${contactId}`);
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

// ============================================================
// createContactFromCoOwner
// Creates a minimal contact record for a co-owner who isn't in the system yet.
// Uses tenant client — realtor_id derived from authenticated session.
// ============================================================

function formatPhoneE164(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (!clean) return "";
  return clean.startsWith("1") ? `+${clean}` : `+1${clean}`;
}

export async function createContactFromCoOwner(data: {
  name: string;
  phone?: string;
  email?: string;
}): Promise<{ contactId: string | null; error: string | null }> {
  try {
    const tc = await getAuthenticatedTenantClient();

    const phone = data.phone?.trim() ? formatPhoneE164(data.phone.trim()) : "";
    const email = data.email?.trim() || null;

    const { data: row, error } = await tc
      .from("contacts")
      .insert({
        name: data.name.trim(),
        phone,
        email,
        type: "buyer",
        pref_channel: "sms",
        source: "portfolio_co_owner",
      })
      .select("id")
      .single();

    if (error) return { contactId: null, error: `Could not create contact: ${error.message}` };
    return { contactId: row.id, error: null };
  } catch (err) {
    return { contactId: null, error: String(err) };
  }
}

// ============================================================
// getPortfolioForContact
// ============================================================

export async function getPortfolioForContact(
  contactId: string
): Promise<{ items: PortfolioItem[]; error: string | null }> {
  try {
    const tc = await getAuthenticatedTenantClient();

    const { data, error } = await tc
      .from("contact_portfolio")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });

    if (error) return { items: [], error: error.message };

    return { items: (data ?? []) as PortfolioItem[], error: null };
  } catch (err) {
    return { items: [], error: String(err) };
  }
}

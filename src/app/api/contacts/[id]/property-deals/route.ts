import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth";

// ── GET: list all property deals for a contact ───────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contactId } = await params;
  const tc = await getAuthenticatedTenantClient();

  // Find all deals this contact is a partner in
  const { data: partnerRows, error } = await tc
    .from("property_deal_partners")
    .select(`
      id, role, ownership_pct, is_primary, notes,
      property_deals (
        id, address, property_type, listing_id, notes, created_at,
        property_deal_partners (
          id, role, ownership_pct, is_primary,
          contacts ( id, name, phone, email, is_indirect )
        )
      )
    `)
    .eq("contact_id", contactId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deals: partnerRows ?? [] });
}

// ── POST: create a property deal + link/create partners ──────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contactId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const realtorId = (session.user as Record<string, string>).realtorId || session.user.id;
  const tc = await getAuthenticatedTenantClient();
  const admin = createAdminClient();

  const body = await req.json();
  const { address, property_type, listing_id, notes, partners } = body as {
    address: string;
    property_type?: string;
    listing_id?: string | null;
    notes?: string;
    partners: Array<{
      // Existing contact
      contact_id?: string;
      // Or new contact to create
      name?: string;
      phone?: string;
      email?: string;
      // Partner metadata
      role: string;
      ownership_pct?: number | null;
      is_primary?: boolean;
    }>;
  };

  if (!address?.trim()) return NextResponse.json({ error: "Address is required" }, { status: 422 });
  if (!partners?.length) return NextResponse.json({ error: "At least one partner is required" }, { status: 422 });

  // 1. Create the property deal
  const { data: deal, error: dealErr } = await tc
    .from("property_deals")
    .insert({ realtor_id: realtorId, address: address.trim(), property_type: property_type || "residential", listing_id: listing_id || null, notes: notes || null })
    .select()
    .single();

  if (dealErr) return NextResponse.json({ error: dealErr.message }, { status: 500 });

  const createdContacts: string[] = [];
  const linkedPartners: string[] = [];
  const errors: string[] = [];

  // 2. Process each partner
  for (const p of partners) {
    let contactId2 = p.contact_id;

    // Auto-create contact if no existing contact_id
    if (!contactId2) {
      if (!p.name?.trim()) { errors.push("Partner missing name"); continue; }

      // Check if phone already exists
      if (p.phone) {
        const { data: existing } = await tc
          .from("contacts")
          .select("id")
          .eq("phone", p.phone)
          .single();
        if (existing) contactId2 = existing.id;
      }

      if (!contactId2) {
        const { data: newContact, error: cErr } = await admin
          .from("contacts")
          .insert({
            realtor_id: realtorId,
            name: p.name.trim(),
            phone: p.phone || null,
            email: p.email || null,
            type: "customer",
            pref_channel: "sms",
            source: "property_partner",
            is_indirect: true,
            indirect_source: "property_partner",
            notes: `Added as partner on ${address} — not a direct client`,
            is_sample: false,
          })
          .select("id")
          .single();

        if (cErr) { errors.push(`Could not create contact "${p.name}": ${cErr.message}`); continue; }
        contactId2 = newContact!.id as string;
        createdContacts.push(contactId2 as string);
      }
    }

    // 3. Link partner to deal
    const { error: linkErr } = await tc
      .from("property_deal_partners")
      .insert({
        deal_id: deal.id,
        contact_id: contactId2,
        role: p.role || "co-owner",
        ownership_pct: p.ownership_pct ?? null,
        is_primary: p.is_primary ?? false,
      });

    if (linkErr && !linkErr.message.includes("unique")) {
      errors.push(`Could not link partner: ${linkErr.message}`);
    } else {
      if (contactId2) linkedPartners.push(contactId2);
    }
  }

  // 4. Also ensure the requesting contact is linked (if not already in the partners list)
  const alreadyLinked = partners.some((p) => p.contact_id === contactId);
  if (!alreadyLinked) {
    await tc.from("property_deal_partners").upsert(
      { deal_id: deal.id, contact_id: contactId, role: "owner", is_primary: true },
      { onConflict: "deal_id,contact_id" }
    );
  }

  return NextResponse.json({
    ok: true,
    deal,
    partners_linked: linkedPartners.length,
    contacts_created: createdContacts.length,
    errors,
  });
}

// ── PATCH: update deal details ───────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  const tc = await getAuthenticatedTenantClient();
  const url = new URL(req.url);
  const dealId = url.searchParams.get("deal_id");
  if (!dealId) return NextResponse.json({ error: "deal_id required" }, { status: 400 });

  const body = await req.json();
  const { data, error } = await tc
    .from("property_deals")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", dealId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── DELETE: remove deal ──────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  const tc = await getAuthenticatedTenantClient();
  const url = new URL(req.url);
  const dealId = url.searchParams.get("deal_id");
  if (!dealId) return NextResponse.json({ error: "deal_id required" }, { status: 400 });

  const { error } = await tc.from("property_deals").delete().eq("id", dealId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

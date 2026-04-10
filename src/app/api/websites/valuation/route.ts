import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, corsHeaders, handleCORS, normalizePhone, createAdminClient } from "@/lib/website-api";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request);
}

/**
 * POST /api/websites/valuation
 * Home valuation request — creates a seller lead with property details.
 * Body: { name, phone, email?, address, property_type?, beds?, baths?, sqft? }
 */
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) return auth.error!;

  const body = await request.json();
  const { name, phone, email, address, property_type, beds, baths, sqft } = body;

  if (!name || !phone || !address) {
    return NextResponse.json(
      { error: "Name, phone, and address are required", code: "VALIDATION" },
      { status: 422, headers: corsHeaders(request) }
    );
  }

  const supabase = createAdminClient();
  const normalizedPhone = normalizePhone(phone);

  // Build property notes
  const propertyDetails = [
    `Address: ${address}`,
    property_type ? `Type: ${property_type}` : null,
    beds ? `Beds: ${beds}` : null,
    baths ? `Baths: ${baths}` : null,
    sqft ? `Sqft: ${sqft}` : null,
    "Requested home valuation via website.",
  ].filter(Boolean).join("\n");

  // Find or create contact
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("phone", normalizedPhone)
    .limit(1)
    .maybeSingle();

  let contactId: string;

  if (existing) {
    contactId = existing.id;
    // Update to seller type + add notes
    await supabase.from("contacts").update({
      type: "seller",
      notes: propertyDetails,
      source: "website_valuation",
    }).eq("id", contactId);
  } else {
    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        name,
        phone: normalizedPhone,
        email: email || null,
        type: "seller",
        source: "website_valuation",
        pref_channel: "sms",
        notes: propertyDetails,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create contact", code: "DB_ERROR" },
        { status: 500, headers: corsHeaders(request) }
      );
    }
    contactId = contact.id;

    // Enroll in seller journey
    try {
      const { autoEnrollNewContact } = await import("@/actions/journeys");
      await autoEnrollNewContact(contactId, "seller");
    } catch (err) { console.error("[website-api] non-fatal:", err instanceof Error ? err.message : err); }
  }

  // Create high-priority task
  await supabase.from("tasks").insert({
    title: `Home Valuation Request — ${name}`,
    description: propertyDetails,
    contact_id: contactId,
    due_date: new Date().toISOString().slice(0, 10),
    priority: "high",
    status: "pending",
  });

  // Create urgent notification
  await supabase.from("agent_notifications").insert({
    title: "Home Valuation Request",
    body: `${name} wants a valuation for ${address}. Call them!`,
    type: "urgent",
    contact_id: contactId,
    action_url: `/contacts/${contactId}`,
  });

  return NextResponse.json(
    { success: true, contact_id: contactId, message: "We'll send your valuation within 24 hours!" },
    { status: 201, headers: corsHeaders(request) }
  );
}

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, corsHeaders, handleCORS, normalizePhone, createAdminClient } from "@/lib/website-api";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request);
}

/**
 * POST /api/websites/lead
 * Create a contact in CRM from a website form submission.
 * Body: { name, phone, email?, message?, source_page?, property_interest?, type? }
 */
export async function POST(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.valid) return auth.error!;

  const body = await request.json();
  const { name, phone, email, message, source_page, property_interest, type } = body;

  if (!name || !phone) {
    return NextResponse.json(
      { error: "Missing required fields: name and phone", code: "VALIDATION" },
      { status: 422, headers: corsHeaders(request) }
    );
  }

  const supabase = createAdminClient();
  const normalizedPhone = normalizePhone(phone);

  // Check for existing contact by phone (dedup)
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("phone", normalizedPhone)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update existing contact
    const updates: Record<string, unknown> = { source: "website" };
    if (email) updates.email = email;
    if (message) updates.notes = message;
    await supabase.from("contacts").update(updates).eq("id", existing.id);

    return NextResponse.json(
      { success: true, contact_id: existing.id, updated: true },
      { status: 200, headers: corsHeaders(request) }
    );
  }

  // Create new contact
  const contactType = type || (property_interest === "selling" ? "seller" : "buyer");
  const notes = [
    message,
    property_interest ? `Interest: ${property_interest}` : null,
    source_page ? `From: ${source_page}` : null,
  ].filter(Boolean).join("\n");

  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      name,
      phone: normalizedPhone,
      email: email || null,
      type: contactType,
      source: "website",
      pref_channel: "sms",
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create contact", code: "DB_ERROR" },
      { status: 500, headers: corsHeaders(request) }
    );
  }

  // Fire-and-forget: enroll in journey
  try {
    const { autoEnrollNewContact } = await import("@/actions/journeys");
    await autoEnrollNewContact(contact.id, contactType as "buyer" | "seller");
  } catch {}

  // Fire-and-forget: workflow triggers
  try {
    const { fireTrigger } = await import("@/lib/workflow-triggers");
    await fireTrigger({ type: "new_lead", contactId: contact.id, contactType });
  } catch {}

  return NextResponse.json(
    { success: true, contact_id: contact.id },
    { status: 201, headers: corsHeaders(request) }
  );
}

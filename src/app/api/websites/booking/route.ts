import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, corsHeaders, handleCORS, normalizePhone, createAdminClient } from "@/lib/website-api";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request);
}

/**
 * POST /api/websites/booking
 * Create an appointment booking request from the website.
 * Body: { name, phone, email?, date, time, appointment_type?, notes? }
 */
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) return auth.error!;

  if (!auth.realtorId) {
    return NextResponse.json(
      { error: "Tenant context required", code: "MISSING_TENANT" },
      { status: 401, headers: corsHeaders(request) }
    );
  }

  const body = await request.json();
  const { name, phone, email, date, time, appointment_type, notes, listing_id } = body;

  if (!name || !phone) {
    return NextResponse.json(
      { error: "Name and phone are required", code: "VALIDATION" },
      { status: 422, headers: corsHeaders(request) }
    );
  }

  const supabase = createAdminClient();
  const normalizedPhone = normalizePhone(phone);

  // Find or create contact
  let contactId: string;
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("realtor_id", auth.realtorId)
    .eq("phone", normalizedPhone)
    .limit(1)
    .maybeSingle();

  if (existing) {
    contactId = existing.id;
    if (email) {
      await supabase.from("contacts").update({ email }).eq("id", contactId);
    }
  } else {
    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        realtor_id: auth.realtorId,
        name,
        phone: normalizedPhone,
        email: email || null,
        type: "buyer",
        source: "website_booking",
        pref_channel: "sms",
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

    // Enroll in journey
    try {
      const { autoEnrollNewContact } = await import("@/actions/journeys");
      await autoEnrollNewContact(contactId, "buyer");
    } catch (err) { console.error("[website-api] non-fatal:", err instanceof Error ? err.message : err); }
  }

  // Create task for the appointment
  const taskTitle = appointment_type
    ? `${appointment_type} — ${name}`
    : `Appointment request — ${name}`;

  const taskNotes = [
    date ? `Date: ${date}` : null,
    time ? `Time: ${time}` : null,
    appointment_type ? `Type: ${appointment_type}` : null,
    listing_id ? `Listing: ${listing_id}` : null,
    notes,
  ].filter(Boolean).join("\n");

  await supabase.from("tasks").insert({
    realtor_id: auth.realtorId,
    title: taskTitle,
    description: taskNotes,
    contact_id: contactId,
    due_date: date || new Date().toISOString().slice(0, 10),
    priority: "high",
    status: "pending",
  });

  // Create notification for realtor
  await supabase.from("agent_notifications").insert({
    realtor_id: auth.realtorId,
    title: "New Appointment Request",
    body: `${name} requested an appointment${date ? ` on ${date}` : ""}${time ? ` at ${time}` : ""} via your website.`,
    type: "urgent",
    contact_id: contactId,
    action_url: `/contacts/${contactId}`,
  });

  return NextResponse.json(
    { success: true, contact_id: contactId, message: "Appointment request received!" },
    { status: 201, headers: corsHeaders(request) }
  );
}

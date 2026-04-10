import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, corsHeaders, handleCORS, createAdminClient } from "@/lib/website-api";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request);
}

/**
 * POST /api/websites/newsletter
 * Newsletter signup — creates/updates contact with newsletter opt-in.
 * Body: { email, name?, consent (required, boolean) }
 */
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) return auth.error!;

  const body = await request.json();
  const { email, name, consent } = body;

  if (!email) {
    return NextResponse.json(
      { error: "Email is required", code: "VALIDATION" },
      { status: 422, headers: corsHeaders(request) }
    );
  }

  if (!consent) {
    return NextResponse.json(
      { error: "CASL consent is required", code: "CONSENT_REQUIRED" },
      { status: 422, headers: corsHeaders(request) }
    );
  }

  const supabase = createAdminClient();

  // Check for existing contact by email
  const { data: existing } = await supabase
    .from("contacts")
    .select("id, newsletter_unsubscribed")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update: opt back in
    await supabase.from("contacts").update({
      newsletter_unsubscribed: false,
      source: existing.newsletter_unsubscribed ? "website_newsletter_resubscribe" : undefined,
    }).eq("id", existing.id);

    // Record consent
    try {
      await supabase.from("consent_records").insert({
        contact_id: existing.id,
        consent_type: "newsletter",
        status: "active",
        collected_via: "website_signup",
        collected_at: new Date().toISOString(),
      });
    } catch (err) { console.error("[website-api] non-fatal:", err instanceof Error ? err.message : err); }

    return NextResponse.json(
      { success: true, contact_id: existing.id, message: "You're subscribed!" },
      { status: 200, headers: corsHeaders(request) }
    );
  }

  // Create new contact
  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      name: name || email.split("@")[0],
      email,
      phone: "",
      type: "buyer",
      source: "website_newsletter",
      pref_channel: "sms",
      newsletter_unsubscribed: false,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to subscribe", code: "DB_ERROR" },
      { status: 500, headers: corsHeaders(request) }
    );
  }

  // Record consent
  try {
    await supabase.from("consent_records").insert({
      contact_id: contact.id,
      consent_type: "newsletter",
      status: "active",
      collected_via: "website_signup",
      collected_at: new Date().toISOString(),
    });
  } catch (err) { console.error("[website-api] non-fatal:", err instanceof Error ? err.message : err); }

  // Enroll in journey
  try {
    const { autoEnrollNewContact } = await import("@/actions/journeys");
    await autoEnrollNewContact(contact.id, "buyer");
  } catch (err) { console.error("[website-api] non-fatal:", err instanceof Error ? err.message : err); }

  // Fire workflow trigger
  try {
    const { fireTrigger } = await import("@/lib/workflow-triggers");
    await fireTrigger({ type: "new_lead", contactId: contact.id, contactType: "buyer" });
  } catch (err) { console.error("[website-api] non-fatal:", err instanceof Error ? err.message : err); }

  return NextResponse.json(
    { success: true, contact_id: contact.id, message: "You're subscribed!" },
    { status: 201, headers: corsHeaders(request) }
  );
}

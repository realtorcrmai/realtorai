import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendLockboxCode, sendShowingDenied } from "@/lib/twilio";

function validateTwilioRequest(req: NextRequest, body: string): boolean {
  const twilioSignature = req.headers.get("x-twilio-signature") ?? "";
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`;
  const params = Object.fromEntries(new URLSearchParams(body));
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    twilioSignature,
    url,
    params
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Always validate Twilio signature — never skip in any environment
  const isValid = validateTwilioRequest(req, rawBody);
  if (!isValid) {
    console.warn("[twilio-webhook] Invalid signature from", req.headers.get("x-forwarded-for"));
    return new NextResponse("Forbidden", { status: 403 });
  }

  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const inboundBody = (params.Body ?? "").trim().toUpperCase();
  const fromNumber = params.From ?? "";

  const cleanPhone = fromNumber.replace("whatsapp:", "").replace(/\D/g, "");

  const supabase = createAdminClient();

  // Find seller contact by phone
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, phone")
    .ilike("phone", `%${cleanPhone.slice(-10)}%`)
    .single();

  if (!contact) {
    console.error(`Twilio webhook: no contact found for number ${fromNumber}`);
    return new NextResponse(
      "<?xml version='1.0'?><Response></Response>",
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  // Find latest pending appointment for this seller's listing
  const { data: appointment } = await supabase
    .from("appointments")
    .select(`
      *,
      listings!inner (
        address,
        lockbox_code,
        seller_id
      )
    `)
    .eq("listings.seller_id", contact.id)
    .eq("status", "requested")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!appointment) {
    return new NextResponse(
      "<?xml version='1.0'?><Response></Response>",
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  // Validate joined listing data
  const listing = (appointment as Record<string, unknown>).listings as {
    address: string;
    lockbox_code: string;
    seller_id: string;
  } | null;

  if (!listing?.address) {
    console.error("[twilio-webhook] Missing listing data for appointment", appointment.id);
    return new NextResponse(
      "<?xml version='1.0'?><Response></Response>",
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  // Log inbound communication
  await supabase.from("communications").insert({
    contact_id: contact.id,
    direction: "inbound",
    channel: fromNumber.includes("whatsapp") ? "whatsapp" : "sms",
    body: params.Body ?? "",
    related_id: appointment.id,
  });

  // Check workflow exit-on-reply conditions
  try {
    const { checkExitOnReply } = await import("@/lib/workflow-engine");
    await checkExitOnReply(contact.id);
  } catch (err) {
    console.error("[twilio-webhook] Exit-on-reply check failed:", err instanceof Error ? err.message : err);
  }

  // Handle STOP opt-out (CASL/TCPA compliance)
  if (inboundBody === "STOP") {
    await supabase
      .from("contacts")
      .update({
        sms_opted_out: true,
        whatsapp_opted_out: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contact.id);

    // Audit log
    await supabase.from("activity_log").insert({
      contact_id: contact.id,
      activity_type: "sms_opted_out",
      description: `${contact.name} opted out of SMS/WhatsApp messages via STOP reply`,
      metadata: {
        phone: contact.phone,
        timestamp: new Date().toISOString(),
        source: "twilio_stop_reply",
      },
    });

    return new NextResponse(
      "<?xml version='1.0' encoding='UTF-8'?><Response></Response>",
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  if (inboundBody === "YES" || inboundBody === "Y") {
    // Confirm the showing
    await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", appointment.id);

    // Add to Google Calendar
    const { data: tokenData } = await supabase
      .from("google_tokens")
      .select("*")
      .limit(1);

    const tokenRow = tokenData?.[0] ?? null;

    if (tokenRow) {
      try {
        const gcalEvent = await createCalendarEvent(tokenRow.user_email, {
          title: `Showing: ${listing.address}`,
          description: `Buyer's Agent: ${appointment.buyer_agent_name} (${appointment.buyer_agent_phone})\nLockbox: ${listing.lockbox_code}`,
          startTime: appointment.start_time,
          endTime: appointment.end_time,
          location: listing.address,
        });

        await supabase
          .from("appointments")
          .update({ google_event_id: gcalEvent.id })
          .eq("id", appointment.id);
      } catch (err) {
        console.error("Failed to create Google Calendar event:", err);
      }
    }

    // Send lockbox code to buyer's agent
    await sendLockboxCode({
      to: appointment.buyer_agent_phone,
      channel: "sms",
      address: listing.address,
      lockboxCode: listing.lockbox_code,
      showingTime: new Date(appointment.start_time),
    });

    // Log outbound communication
    await supabase.from("communications").insert({
      contact_id: contact.id,
      direction: "outbound",
      channel: "sms",
      body: `Confirmed showing at ${listing.address}. Lockbox code sent to ${appointment.buyer_agent_name}.`,
      related_id: appointment.id,
    });

    // Fire showing_completed trigger for buyer follow-up workflows
    try {
      const { fireTrigger } = await import("@/lib/workflow-triggers");
      const { data: buyerContact } = await supabase
        .from("contacts")
        .select("id")
        .ilike("phone", `%${appointment.buyer_agent_phone.replace(/\D/g, "").slice(-10)}%`)
        .single();

      if (buyerContact) {
        await fireTrigger({
          type: "showing_completed",
          contactId: buyerContact.id,
          data: { appointmentId: appointment.id, address: listing.address },
        });
      }
    } catch (err) {
      console.error("[twilio-webhook] Workflow trigger failed:", err instanceof Error ? err.message : err);
    }
  } else if (inboundBody === "NO" || inboundBody === "N") {
    // Deny the showing
    await supabase
      .from("appointments")
      .update({ status: "denied" })
      .eq("id", appointment.id);

    await sendShowingDenied({
      to: appointment.buyer_agent_phone,
      address: listing.address,
      showingTime: new Date(appointment.start_time),
    });
  }

  return new NextResponse(
    "<?xml version='1.0' encoding='UTF-8'?><Response></Response>",
    { headers: { "Content-Type": "text/xml" } }
  );
}

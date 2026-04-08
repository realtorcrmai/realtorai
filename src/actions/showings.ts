"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { sendShowingRequest } from "@/lib/twilio";
import { fetchBusyBlocks, isSlotAvailable } from "@/lib/google-calendar";
import { revalidatePath } from "next/cache";
import { showingSchema, type ShowingFormData } from "@/lib/schemas";
import { emitNewsletterEvent } from "@/lib/newsletter-events";

export async function createShowingRequest(
  formData: ShowingFormData
) {
  const parsed = showingSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid form data", issues: parsed.error.issues };
  }

  const {
    listingId,
    startTime,
    endTime,
    buyerAgentName,
    buyerAgentPhone,
    buyerAgentEmail,
  } = parsed.data;

  const tc = await getAuthenticatedTenantClient();
  const adminSupabase = createAdminClient();

  // Fetch listing and seller
  const { data: listing, error: listingError } = await tc
    .from("listings")
    .select("*, contacts(*)")
    .eq("id", listingId)
    .single();

  if (listingError || !listing) {
    return { error: "Listing not found" };
  }

  // Safe type extraction for joined seller data
  const seller = (listing as Record<string, unknown>).contacts as {
    id: string;
    phone: string;
    pref_channel: "whatsapp" | "sms";
  } | null;

  if (!seller) {
    return { error: "No seller contact found for this listing" };
  }

  // Check Google Calendar availability (google_tokens uses user_email, keep admin)
  let calendarWarning: string | undefined;

  const { data: tokenData } = await adminSupabase
    .from("google_tokens")
    .select("*")
    .limit(1);

  const tokenRow = tokenData?.[0] ?? null;

  if (tokenRow) {
    try {
      const busyBlocks = await fetchBusyBlocks(
        tokenRow.user_email,
        new Date(startTime),
        new Date(endTime)
      );
      const available = isSlotAvailable(
        busyBlocks,
        new Date(startTime),
        new Date(endTime)
      );
      if (!available) {
        return {
          error:
            "The requested time slot conflicts with an existing calendar event.",
        };
      }
    } catch (err) {
      console.warn("Could not check calendar availability:", err);
      calendarWarning =
        "Showing created, but calendar availability could not be verified. Please check manually.";
    }
  }

  // Create appointment
  const { data: apptRows, error: apptError } = await tc
    .from("appointments")
    .insertAndSelect({
      listing_id: listingId,
      start_time: startTime,
      end_time: endTime,
      buyer_agent_name: buyerAgentName,
      buyer_agent_phone: buyerAgentPhone,
      buyer_agent_email: buyerAgentEmail,
      status: "requested",
    });
  const appointment = apptRows?.[0] ?? null;

  if (apptError) {
    return { error: "Failed to create appointment" };
  }

  // Send Twilio notification to seller
  try {
    const messageSid = await sendShowingRequest({
      to: seller.phone,
      channel: seller.pref_channel,
      address: listing.address,
      startTime: new Date(startTime),
      buyerAgentName,
    });

    await tc
      .from("appointments")
      .update({ twilio_message_sid: messageSid })
      .eq("id", appointment.id);

    await tc.from("communications").insert({
      contact_id: seller.id,
      direction: "outbound",
      channel: seller.pref_channel,
      body: `Showing request sent for ${listing.address} at ${new Date(startTime).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}`,
      related_id: appointment.id,
    });
  } catch (err) {
    console.error("Failed to send Twilio notification:", err);
    await tc
      .from("appointments")
      .update({
        notification_status: "failed",
        notification_error: err instanceof Error ? err.message : "Unknown Twilio error",
      })
      .eq("id", appointment.id);
  }

  revalidatePath("/showings");
  revalidatePath(`/listings/${listingId}`);

  return {
    success: true,
    appointmentId: appointment.id,
    calendarWarning,
  };
}

export async function updateShowingStatus(
  appointmentId: string,
  status: "confirmed" | "denied" | "cancelled"
) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) {
    return { error: "Failed to update appointment status" };
  }

  // Fire showing_completed trigger for buyer contacts when showing is confirmed
  // AND emit newsletter event for the seller (Newsletter Engine v3 — non-blocking)
  if (status === "confirmed") {
    try {
      const { data: appointment } = await tc
        .from("appointments")
        .select("listing_id, start_time")
        .eq("id", appointmentId)
        .single();

      if (appointment?.listing_id) {
        const { data: listing } = await tc
          .from("listings")
          .select("buyer_id, seller_id")
          .eq("id", appointment.listing_id)
          .single();

        if (listing?.buyer_id) {
          const { fireTrigger } = await import("@/lib/workflow-triggers");
          await fireTrigger({
            type: "showing_completed",
            contactId: listing.buyer_id,
            data: { appointmentId, listingId: appointment.listing_id },
          });
        }

        // Newsletter Engine v3: notify the seller that a showing was confirmed
        const sellerId = (listing as { seller_id?: string | null } | null)?.seller_id ?? null;
        if (sellerId) {
          await emitNewsletterEvent(tc, {
            event_type: "showing_confirmed",
            listing_id: appointment.listing_id,
            contact_id: sellerId,
            event_data: {
              appointment_id: appointmentId,
              listing_id: appointment.listing_id,
              seller_id: sellerId,
              start_time: appointment.start_time,
            },
          });
        }
      }
    } catch {
      // Don't fail status update if triggers fail
    }
  }

  revalidatePath("/showings");
  revalidatePath("/calendar");
  return { success: true };
}

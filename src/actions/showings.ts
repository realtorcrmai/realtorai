"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendShowingRequest } from "@/lib/twilio";
import { fetchBusyBlocks, isSlotAvailable } from "@/lib/google-calendar";
import { revalidatePath } from "next/cache";
import { showingSchema, type ShowingFormData } from "@/lib/schemas";

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

  const supabase = createAdminClient();

  // Fetch listing and seller
  const { data: listing, error: listingError } = await supabase
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

  // Check Google Calendar availability
  let calendarWarning: string | undefined;

  const { data: tokenData } = await supabase
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
  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .insert({
      listing_id: listingId,
      start_time: startTime,
      end_time: endTime,
      buyer_agent_name: buyerAgentName,
      buyer_agent_phone: buyerAgentPhone,
      buyer_agent_email: buyerAgentEmail,
      status: "requested",
    })
    .select()
    .single();

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

    await supabase
      .from("appointments")
      .update({ twilio_message_sid: messageSid })
      .eq("id", appointment.id);

    await supabase.from("communications").insert({
      contact_id: seller.id,
      direction: "outbound",
      channel: seller.pref_channel,
      body: `Showing request sent for ${listing.address} at ${new Date(startTime).toLocaleString("en-CA", { timeZone: "America/Vancouver" })}`,
      related_id: appointment.id,
    });
  } catch (err) {
    console.error("[createShowingRequest] Twilio notification failed:", err);
    // Flag the appointment so the agent knows the seller was not notified
    await supabase
      .from("appointments")
      .update({
        notification_status: "failed",
        notification_error: err instanceof Error ? err.message : "Twilio send failed",
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
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) {
    return { error: "Failed to update appointment status" };
  }

  // Fire showing_completed trigger for buyer contacts when showing is confirmed
  if (status === "confirmed") {
    try {
      const { data: appointment } = await supabase
        .from("appointments")
        .select("listing_id")
        .eq("id", appointmentId)
        .single();

      if (appointment?.listing_id) {
        const { data: listing } = await supabase
          .from("listings")
          .select("buyer_id")
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
      }
    } catch (error) {
      console.error("[updateShowingStatus] Trigger emission failed:", error);
    }
  }

  revalidatePath("/showings");
  revalidatePath("/calendar");
  return { success: true };
}

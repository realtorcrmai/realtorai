"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendShowingRequest } from "@/lib/twilio";
import { fetchBusyBlocks, isSlotAvailable } from "@/lib/google-calendar";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const showingSchema = z.object({
  listingId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  buyerAgentName: z.string().min(2),
  buyerAgentPhone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[\d\s\-\(\)\+\.]+$/, "Invalid phone number format"),
  buyerAgentEmail: z.string().email().optional(),
});

export async function createShowingRequest(
  formData: z.infer<typeof showingSchema>
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
    console.error("Failed to send Twilio notification:", err);
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

  revalidatePath("/showings");
  revalidatePath("/calendar");
  return { success: true };
}

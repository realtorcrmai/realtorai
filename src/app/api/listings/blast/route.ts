import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/resend";

export const maxDuration = 120;

/**
 * POST /api/listings/blast
 *
 * Send a listing announcement email to multiple agents.
 *
 * Body: {
 *   listingId: string,
 *   recipientEmails: string[],      // explicit list
 *   sendToAllAgents?: boolean,       // OR send to all agent/partner contacts
 *   customMessage?: string,          // optional personal note from realtor
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listingId, recipientEmails, sendToAllAgents, customMessage } = body;

    if (!listingId) {
      return NextResponse.json({ error: "listingId required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Get listing data
    const { data: listing, error: listingErr } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (listingErr || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // 2. Build recipient list
    let emails: string[] = [];

    if (sendToAllAgents) {
      // Get all agent/partner contacts with emails
      const { data: agents } = await supabase
        .from("contacts")
        .select("email")
        .in("type", ["agent", "partner"])
        .not("email", "is", null);

      emails = (agents || [])
        .map((a: { email: string | null }) => a.email)
        .filter((e): e is string => !!e && e.includes("@"));
    }

    if (recipientEmails && Array.isArray(recipientEmails)) {
      const parsed = recipientEmails
        .map((e: string) => e.trim().toLowerCase())
        .filter((e: string) => e.includes("@"));
      emails = [...new Set([...emails, ...parsed])]; // dedup
    }

    if (emails.length === 0) {
      return NextResponse.json({ error: "No valid recipient emails" }, { status: 400 });
    }

    // 3. Get realtor config for branding
    const { data: config } = await supabase
      .from("realtor_agent_config")
      .select("brand_config")
      .limit(1)
      .single();

    const brand = (config?.brand_config as Record<string, string>) || {};

    // 4. Build the blast email
    const address = listing.address || "New Listing";
    const price = listing.list_price
      ? `$${Number(listing.list_price).toLocaleString()}`
      : "Price on Request";

    // Use Unsplash for hero image if no listing photos
    const heroImage = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=600&fit=crop";

    const subject = `NEW LISTING: ${address} — ${price}`;

    const intro = customMessage ||
      `I'm pleased to present my new listing at ${address}. This property is now available at ${price}. Please share with any interested buyers.`;

    const listingDetails = [];
    if (listing.bedrooms) listingDetails.push(`${listing.bedrooms} BD`);
    if (listing.bathrooms) listingDetails.push(`${listing.bathrooms} BA`);
    if (listing.square_feet) listingDetails.push(`${Number(listing.square_feet).toLocaleString()} sqft`);
    const detailsStr = listingDetails.join(" · ");

    // Use Apple-quality block-based email builder
    const { assembleEmail } = await import("@/lib/email-blocks");
    const html = assembleEmail("listing_alert", {
      contact: { name: "Fellow Agent", firstName: "Fellow Agent", type: "agent" },
      agent: {
        name: brand.realtorName || "Kunal",
        brokerage: brand.brokerage || "RE/MAX City Realty",
        phone: brand.phone || "604-555-0123",
        initials: (brand.realtorName || "K")[0],
      },
      content: { subject, intro, body: "", ctaText: "Schedule a Showing" },
      listing: {
        address,
        area: listing.city || "Vancouver",
        price,
        beds: listing.bedrooms,
        baths: listing.bathrooms,
        sqft: listing.square_feet ? String(listing.square_feet) : undefined,
        photos: [heroImage],
      },
    });

    // 5. Send batch
    const emailPayloads = emails.map((to) => ({
      to,
      subject,
      html,
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      tags: [
        { name: "type", value: "listing_blast" },
        { name: "listing_id", value: listingId },
      ],
    }));

    const result = await sendBatchEmails(emailPayloads);

    // 6. Log the blast in newsletters table
    await supabase.from("newsletters").insert({
      subject,
      email_type: "listing_blast",
      status: "sent",
      sent_at: new Date().toISOString(),
      html_body: html,
      ai_context: {
        blast: true,
        listing_id: listingId,
        recipient_count: emails.length,
        sent: result.sent,
        failed: result.failed,
      },
    });

    // 7. Log to activity
    await supabase.from("activity_log").insert({
      activity_type: "listing_blast_sent",
      description: `Listing blast for ${address} sent to ${result.sent} agents`,
      metadata: {
        listing_id: listingId,
        address,
        recipients: emails.length,
        sent: result.sent,
        failed: result.failed,
      },
    });

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      recipients: emails.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

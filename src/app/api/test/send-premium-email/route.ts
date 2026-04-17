import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { render } from "@react-email/components";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";
import { PremiumListingShowcase } from "@/emails/PremiumListingShowcase";
import type { RealtorBranding } from "@/emails/BaseLayout";
import React from "react";

/**
 * POST /api/test/send-premium-email
 * Sends premium photo-forward email templates with real CRM data + branding.
 * Dev-only endpoint.
 *
 * Body: { contactId, template?: "listing_showcase" }
 */

export async function POST(req: NextRequest) {
  // Block in production AND require auth in all environments
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  // Require cron secret even in dev to prevent unauthorized email sending
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { contactId, template = "listing_showcase" } = body;

  if (!contactId) {
    return NextResponse.json({ error: "contactId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get contact
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, email, type, realtor_id")
    .eq("id", contactId)
    .single();

  if (!contact?.email) {
    return NextResponse.json({ error: "Contact not found or has no email" }, { status: 404 });
  }

  // Get realtor branding
  const rid = (contact as Record<string, unknown>).realtor_id as string | undefined;
  if (!rid) {
    return NextResponse.json({ error: "Contact has no realtor_id" }, { status: 400 });
  }
  const { data: config } = await supabase
    .from("realtor_agent_config")
    .select("brand_config")
    .eq("realtor_id", rid)
    .single();

  const bc = (config?.brand_config as Record<string, string>) || {};
  const branding: RealtorBranding = {
    name: bc.realtorName || bc.name || "Amanda Chen",
    title: bc.realtorTitle || "REALTOR®",
    brokerage: bc.brokerage || "RE/MAX City Realty",
    phone: bc.phone || "604-555-0123",
    email: bc.email || "amanda@remax.ca",
    accentColor: bc.accentColor || "#1a1a1a",
    headshotUrl: bc.headshotUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face",
    logoUrl: bc.logoUrl || undefined,
  };

  // Get a real listing
  const { data: listings } = await supabase
    .from("listings")
    .select("id, address, list_price, prop_type")
    .eq("status", "active")
    .order("list_price", { ascending: false })
    .limit(1);

  const listing = listings?.[0];
  const firstName = contact.name.split(" ")[0];
  const unsubscribeUrl = buildUnsubscribeUrl(contactId);

  // Real estate stock photos from Unsplash (architecture/interiors)
  const heroPhoto = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=700&fit=crop";
  const galleryPhotos = [
    { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop", alt: "Living room" },
    { url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&h=400&fit=crop", alt: "Kitchen" },
    { url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&h=400&fit=crop", alt: "Master bedroom" },
    { url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop", alt: "Bathroom" },
  ];

  // Parse address into address + city
  const addr = listing?.address || "1234 W 4th Ave, Vancouver, BC";
  const parts = addr.split(",").map((s: string) => s.trim());
  const streetAddress = parts[0] || addr;
  const cityStatePostal = parts.slice(1).join(", ") || "Vancouver, BC";

  const propertyType = listing?.prop_type || "detached";
  const bedBathMap: Record<string, [number, number, string]> = {
    detached: [4, 3, "2,850 sq.ft."],
    townhouse: [3, 2, "1,650 sq.ft."],
    condo: [2, 2, "950 sq.ft."],
    apartment: [1, 1, "650 sq.ft."],
  };
  const [beds, baths, sqft] = bedBathMap[propertyType] || [3, 2, "1,500 sq.ft."];

  const html = await render(
    React.createElement(PremiumListingShowcase, {
      branding,
      recipientName: firstName,
      address: streetAddress,
      cityStatePostal,
      price: `$${(listing?.list_price || 1850000).toLocaleString()}`,
      beds,
      baths,
      sqft,
      propertyType: propertyType.charAt(0).toUpperCase() + propertyType.slice(1),
      heroPhoto,
      galleryPhotos,
      headline: "A rare offering in one of Vancouver's most coveted neighbourhoods.",
      description: "This stunning residence features expansive open-concept living, a chef's kitchen with premium appliances, and floor-to-ceiling windows that flood every room with natural light. The primary suite offers a spa-inspired ensuite and walk-in closet. Outside, a private south-facing patio is perfect for entertaining year-round. Located steps from the beach, top-rated schools, and the city's best restaurants.",
      features: [
        "Open-concept main floor with 10-ft ceilings",
        "Chef's kitchen with quartz counters and premium appliances",
        "South-facing private patio and garden",
        "Primary suite with spa ensuite and walk-in closet",
        "1 parking space and storage locker included",
        "Steps to Kits Beach, Granville Island, and transit",
      ],
      openHouseDate: "Saturday, April 12, 2026",
      openHouseTime: "2:00 PM – 4:00 PM",
      listingUrl: "http://localhost:3000/listings",
      unsubscribeUrl,
    })
  );

  const subject = `${streetAddress} — ${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} in ${cityStatePostal.split(",")[0]?.trim() || "Vancouver"}`;

  // Save to DB
  const { data: newsletter } = await supabase
    .from("newsletters")
    .insert({
      contact_id: contactId,
      email_type: "premium_listing_showcase",
      subject,
      html_body: html,
      status: "sending",
      send_mode: "auto",
      ai_context: { test: true, template: "premium_listing_showcase" },
    })
    .select("id")
    .single();

  // Send via Resend
  try {
    const { messageId } = await sendEmail({
      to: contact.email,
      subject,
      html,
      tags: [
        { name: "newsletter_id", value: newsletter?.id || "" },
        { name: "contact_id", value: contactId },
        { name: "email_type", value: "premium_listing_showcase" },
      ],
      metadata: {
        emailType: "premium_listing_showcase",
        contactName: contact.name,
        contactType: contact.type,
        contactId,
        triggeredBy: "Premium Email Test",
      },
    });

    if (newsletter?.id) {
      await supabase.from("newsletters").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        resend_message_id: messageId || null,
      }).eq("id", newsletter.id);
    }

    return NextResponse.json({
      ok: true,
      template,
      messageId,
      to: contact.email,
      subject,
      htmlSize: html.length,
    });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "Send failed",
    }, { status: 500 });
  }
}

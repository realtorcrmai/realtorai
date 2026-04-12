import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { render } from "@react-email/components";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";
import { NewListingAlert } from "@/emails/NewListingAlert";
import { MarketUpdate } from "@/emails/MarketUpdate";
import { JustSold } from "@/emails/JustSold";
import { OpenHouseInvite } from "@/emails/OpenHouseInvite";
import { NeighbourhoodGuide } from "@/emails/NeighbourhoodGuide";
import { HomeAnniversary } from "@/emails/HomeAnniversary";
import type { RealtorBranding } from "@/emails/BaseLayout";
import React from "react";

/**
 * POST /api/test/send-rich-email
 * Sends rich React Email templates with real CRM data + realtor branding.
 * Dev-only endpoint.
 *
 * Body: { contactId, emailType, realtorId? }
 * emailType: "new_listing_alert" | "market_update" | "just_sold" |
 *            "open_house_invite" | "neighbourhood_guide" | "home_anniversary"
 *
 * To send all 6: { contactId, emailType: "all" }
 */

const VALID_TYPES = [
  "new_listing_alert",
  "market_update",
  "just_sold",
  "open_house_invite",
  "neighbourhood_guide",
  "home_anniversary",
] as const;

type EmailType = (typeof VALID_TYPES)[number];

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = await req.json();
  const { contactId, emailType, realtorId } = body;

  if (!contactId || !emailType) {
    return NextResponse.json({ error: "contactId and emailType required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get contact
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, email, type, address, realtor_id")
    .eq("id", contactId)
    .single();

  if (!contact?.email) {
    return NextResponse.json({ error: "Contact not found or has no email" }, { status: 404 });
  }

  // Get realtor branding
  const rid = realtorId || (contact as any).realtor_id || "7de22757-dd3a-4a4f-a088-c422746e88d4";
  const { data: config } = await supabase
    .from("realtor_agent_config")
    .select("brand_config")
    .eq("realtor_id", rid)
    .single();

  const bc = config?.brand_config || {};
  const branding: RealtorBranding = {
    name: bc.realtorName || bc.name || "Amanda Chen",
    title: bc.realtorTitle || "REALTOR®",
    brokerage: bc.brokerage || "RE/MAX City Realty",
    phone: bc.phone || "604-555-0123",
    email: bc.email || "amanda@remax.ca",
    accentColor: bc.accentColor || "#4f35d2",
    headshotUrl: bc.headshotUrl || undefined,
    logoUrl: bc.logoUrl || undefined,
  };

  // Get real listings for listing-based emails
  const { data: listings } = await supabase
    .from("listings")
    .select("id, address, list_price, prop_type, status")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(4);

  const unsubscribeUrl = buildUnsubscribeUrl(contactId);
  const firstName = contact.name.split(" ")[0];

  const typesToSend: EmailType[] =
    emailType === "all"
      ? [...VALID_TYPES]
      : VALID_TYPES.includes(emailType)
        ? [emailType as EmailType]
        : [];

  if (typesToSend.length === 0) {
    return NextResponse.json({
      error: `Invalid emailType. Use: ${VALID_TYPES.join(", ")} or "all"`,
    }, { status: 400 });
  }

  const results: Array<{ type: string; status: string; subject?: string; messageId?: string; error?: string }> = [];

  for (const type of typesToSend) {
    try {
      const { subject, html } = await renderEmail(type, {
        branding,
        firstName,
        recipientName: firstName,
        contact,
        listings: listings || [],
        unsubscribeUrl,
      });

      // Save to newsletters table
      const { data: newsletter } = await supabase
        .from("newsletters")
        .insert({
          contact_id: contactId,
          email_type: type,
          subject,
          html_body: html,
          status: "sending",
          send_mode: "auto",
          ai_context: { test: true, richTemplate: true },
        })
        .select("id")
        .single();

      // Send via Resend
      const { messageId } = await sendEmail({
        to: contact.email,
        subject,
        html,
        tags: [
          { name: "newsletter_id", value: newsletter?.id || "" },
          { name: "contact_id", value: contactId },
          { name: "email_type", value: type },
        ],
        metadata: {
          emailType: type,
          contactName: contact.name,
          contactType: contact.type,
          contactId,
          triggeredBy: "Rich Email Test",
        },
      });

      // Mark as sent
      if (newsletter?.id) {
        await supabase.from("newsletters").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          resend_message_id: messageId || null,
        }).eq("id", newsletter.id);
      }

      results.push({ type, status: "sent", subject, messageId: messageId || undefined });
    } catch (e) {
      results.push({ type, status: "failed", error: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    to: contact.email,
    branding: { name: branding.name, brokerage: branding.brokerage },
    results,
  });
}

interface RenderContext {
  branding: RealtorBranding;
  firstName: string;
  recipientName: string;
  contact: { id: string; name: string; email: string; type: string; address?: string };
  listings: Array<{
    id: string;
    address: string;
    list_price: number;
    prop_type?: string;
    status?: string;
  }>;
  unsubscribeUrl: string;
}

async function renderEmail(
  type: EmailType,
  ctx: RenderContext
): Promise<{ subject: string; html: string }> {
  const { branding, firstName, listings, unsubscribeUrl } = ctx;

  switch (type) {
    case "new_listing_alert": {
      const bedBathMap: Record<string, [number, number]> = {
        detached: [4, 3], townhouse: [3, 2], condo: [2, 2], apartment: [1, 1], duplex: [3, 2],
      };
      const listingItems = (listings.length > 0 ? listings : [
        { id: "1", address: "3456 W 4th Ave, Kitsilano", list_price: 899000, prop_type: "condo" },
        { id: "2", address: "2845 Vine St, Kitsilano", list_price: 1195000, prop_type: "townhouse" },
        { id: "3", address: "1890 W 1st Ave, False Creek", list_price: 749000, prop_type: "condo" },
      ]).slice(0, 4).map((l) => {
        const [beds, baths] = bedBathMap[l.prop_type || "condo"] || [3, 2];
        return {
          address: l.address,
          price: `$${(l.list_price || 899000).toLocaleString()}`,
          beds,
          baths,
        };
      });

      const html = await render(
        React.createElement(NewListingAlert, {
          branding,
          recipientName: firstName,
          area: "Greater Vancouver",
          intro: `I just found ${listingItems.length} new properties that match what you're looking for. These are fresh on the market — take a look before they get scooped up!`,
          listings: listingItems,
          ctaText: "Book a Showing",
          ctaUrl: "http://localhost:3000/showings",
          unsubscribeUrl,
        })
      );
      return {
        subject: `${listingItems.length} New Listings in Greater Vancouver — Just for You, ${firstName}`,
        html,
      };
    }

    case "market_update": {
      const html = await render(
        React.createElement(MarketUpdate, {
          branding,
          recipientName: firstName,
          area: "Greater Vancouver",
          month: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
          intro: "Here's your monthly snapshot of what's happening in the Greater Vancouver real estate market. The spring season is heating up with new inventory and strong buyer demand.",
          stats: [
            { label: "Avg Sale Price", value: "$1,125,000", change: "+3.2%" },
            { label: "Days on Market", value: "18", change: "-4 days" },
            { label: "New Listings", value: "1,247", change: "+15%" },
          ],
          recentSales: [
            { address: "2845 W 4th Ave, Kitsilano", price: "$1,195,000", daysOnMarket: 8 },
            { address: "456 Beach Crescent, Yaletown", price: "$875,000", daysOnMarket: 14 },
            { address: "3210 Main St, Mount Pleasant", price: "$949,000", daysOnMarket: 6 },
          ],
          commentary: "Inventory is rising but well-priced homes are still selling fast — especially in Kitsilano, Mount Pleasant, and East Van. If you've been waiting for the right time, the next 60 days look very promising.",
          ctaText: "Get Your Home's Value",
          ctaUrl: "http://localhost:3000",
          unsubscribeUrl,
        })
      );
      return {
        subject: `Your Greater Vancouver Market Update — ${new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}`,
        html,
      };
    }

    case "just_sold": {
      const sold = listings[0];
      const html = await render(
        React.createElement(JustSold, {
          branding,
          recipientName: firstName,
          address: sold?.address || "2845 Vine St, Kitsilano",
          salePrice: `$${((sold?.list_price || 1195000) + 20000).toLocaleString()}`,
          daysOnMarket: 12,
          message: `Great news — another home has found its new owner! This one attracted multiple offers and sold above asking price. The Vancouver market continues to reward sellers who price strategically.\n\nCurious what your home might be worth in today's market? I'd be happy to run a complimentary analysis for you.`,
          ctaText: "What's Your Home Worth?",
          ctaUrl: "http://localhost:3000",
          unsubscribeUrl,
        })
      );
      return {
        subject: `Just Sold: ${sold?.address || "2845 Vine St, Kitsilano"} — Above Asking!`,
        html,
      };
    }

    case "open_house_invite": {
      const listing = listings[0];
      const nextSaturday = new Date();
      nextSaturday.setDate(nextSaturday.getDate() + (6 - nextSaturday.getDay() + 7) % 7);
      const dateStr = nextSaturday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

      const html = await render(
        React.createElement(OpenHouseInvite, {
          branding,
          recipientName: firstName,
          address: listing?.address || "3456 W 4th Ave, Kitsilano",
          price: `$${(listing?.list_price || 899000).toLocaleString()}`,
          date: dateStr,
          time: "2:00 PM – 4:00 PM",
          description: "You're invited to an exclusive open house! This beautifully updated home features an open-concept layout, natural light throughout, and a private south-facing patio. Located on a quiet tree-lined street, steps to shops and transit.",
          features: [
            "3 bedrooms, 2 bathrooms",
            "Updated kitchen with quartz counters",
            "South-facing patio with garden",
            "1 parking + storage locker",
            "Steps to transit, shops, and restaurants",
          ],
          rsvpUrl: "http://localhost:3000/showings",
          unsubscribeUrl,
        })
      );
      return {
        subject: `Open House This ${nextSaturday.toLocaleDateString("en-US", { weekday: "long" })}: ${listing?.address || "3456 W 4th Ave"}`,
        html,
      };
    }

    case "neighbourhood_guide": {
      const html = await render(
        React.createElement(NeighbourhoodGuide, {
          branding,
          recipientName: firstName,
          area: "Kitsilano",
          intro: "Whether you're exploring or already fell in love with the area, here's everything you need to know about one of Vancouver's most desirable neighbourhoods.",
          highlights: [
            {
              category: "Beaches & Parks",
              items: ["Kits Beach — Vancouver's favourite urban beach", "Jericho Beach — stunning sunset views", "Vanier Park — home to museums and festivals"],
            },
            {
              category: "Dining & Shopping",
              items: ["4th Ave restaurant row — 50+ restaurants", "West Broadway boutiques & cafés", "Granville Island Public Market (10 min walk)"],
            },
            {
              category: "Schools & Families",
              items: ["Kitsilano Secondary (public)", "St. Augustine's (private)", "Henry Hudson Elementary", "5 daycares within walking distance"],
            },
            {
              category: "Transit & Commute",
              items: ["10 min to downtown via Burrard Bridge", "B-Line express bus on Broadway", "Future Broadway subway station (2027)"],
            },
          ],
          funFact: "Kitsilano was named after Chief Khahtsahlano of the Squamish Nation. The neighbourhood was Vancouver's hippie hub in the 1960s — today it's one of the city's most sought-after areas with a median home price of $2.1M.",
          ctaText: "Explore Homes in Kitsilano",
          ctaUrl: "http://localhost:3000/listings",
          unsubscribeUrl,
        })
      );
      return {
        subject: `Discover Kitsilano — Your Neighbourhood Guide, ${firstName}`,
        html,
      };
    }

    case "home_anniversary": {
      const html = await render(
        React.createElement(HomeAnniversary, {
          branding,
          recipientName: firstName,
          address: ctx.contact.address || "1250 W 6th Ave, Vancouver",
          purchaseDate: "April 2025",
          years: 1,
          estimatedValue: "$985,000",
          appreciation: "+6.8%",
          message: `Can you believe it's been a year already? Time flies when you love where you live! Your home has been a great investment — values in your area have climbed steadily.\n\nI've put together a few seasonal tips to help you keep your home in top shape.`,
          tips: [
            "Schedule annual HVAC inspection before summer",
            "Clean gutters and downspouts",
            "Check exterior paint and caulking for wear",
            "Test smoke and CO detectors (replace batteries)",
            "Review your home insurance coverage — values have changed",
          ],
          ctaText: "Get an Updated Home Valuation",
          ctaUrl: "http://localhost:3000",
          unsubscribeUrl,
        })
      );
      return {
        subject: `Happy 1-Year Home Anniversary, ${firstName}! 🎉`,
        html,
      };
    }
  }
}

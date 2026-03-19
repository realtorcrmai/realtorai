import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/webhooks/resend
 * Handle Resend webhook events: email.opened, email.clicked, email.bounced, email.complained
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // Extract newsletter_id from tags
    const newsletterId = data.tags?.find((t: any) => t.name === "newsletter_id")?.value;
    if (!newsletterId) {
      // Not a newsletter email, ignore
      return NextResponse.json({ ok: true });
    }

    // Get the newsletter to find contact_id
    const { data: newsletter } = await supabase
      .from("newsletters")
      .select("contact_id")
      .eq("id", newsletterId)
      .single();

    if (!newsletter) {
      return NextResponse.json({ ok: true });
    }

    const contactId = newsletter.contact_id;

    // Map Resend event types to our event types
    const eventTypeMap: Record<string, string> = {
      "email.delivered": "delivered",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
    };

    const eventType = eventTypeMap[type];
    if (!eventType) {
      return NextResponse.json({ ok: true });
    }

    // Determine link type for clicks
    let linkUrl: string | null = null;
    let linkType: string | null = null;

    if (eventType === "clicked" && data.click?.link) {
      linkUrl = data.click.link;
      linkType = classifyLink(linkUrl!);
    }

    // Log the event
    await supabase.from("newsletter_events").insert({
      newsletter_id: newsletterId,
      contact_id: contactId,
      event_type: eventType,
      link_url: linkUrl,
      link_type: linkType,
      metadata: {
        resend_event_id: data.email_id,
        timestamp: data.created_at,
        ip: data.click?.ipAddress,
        user_agent: data.click?.userAgent,
      },
    });

    // Update contact intelligence
    if (eventType === "opened" || eventType === "clicked") {
      await updateContactIntelligence(supabase, contactId, eventType, linkType, linkUrl);
    }

    // Handle bounce/unsubscribe
    if (eventType === "bounced") {
      await supabase
        .from("contacts")
        .update({ newsletter_unsubscribed: true })
        .eq("id", contactId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Resend webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function classifyLink(url: string): string {
  if (url.includes("/listings/") || url.includes("listing")) return "listing";
  if (url.includes("/showings/") || url.includes("showing") || url.includes("book")) return "showing";
  if (url.includes("market") || url.includes("report") || url.includes("stats")) return "market_report";
  if (url.includes("school")) return "school_info";
  if (url.includes("neighbour") || url.includes("neighborhood") || url.includes("area")) return "neighbourhood";
  if (url.includes("cma") || url.includes("valuation") || url.includes("value")) return "cma";
  if (url.includes("contact") || url.includes("call") || url.includes("phone")) return "contact_agent";
  if (url.includes("unsubscribe")) return "unsubscribe";
  return "other";
}

async function updateContactIntelligence(
  supabase: any,
  contactId: string,
  eventType: string,
  linkType: string | null,
  linkUrl: string | null
) {
  // Fetch current intelligence
  const { data: contact } = await supabase
    .from("contacts")
    .select("newsletter_intelligence")
    .eq("id", contactId)
    .single();

  const intel = (contact?.newsletter_intelligence as any) || {};

  // Update counters
  if (eventType === "opened") {
    intel.total_opens = (intel.total_opens || 0) + 1;
    intel.last_opened = new Date().toISOString();
  }

  if (eventType === "clicked") {
    intel.total_clicks = (intel.total_clicks || 0) + 1;
    intel.last_clicked = new Date().toISOString();

    // Add to click history (keep last 50)
    if (!intel.click_history) intel.click_history = [];
    intel.click_history.push({
      link_type: linkType,
      link_url: linkUrl,
      clicked_at: new Date().toISOString(),
    });
    if (intel.click_history.length > 50) {
      intel.click_history = intel.click_history.slice(-50);
    }

    // Update inferred interests based on link type
    if (!intel.inferred_interests) {
      intel.inferred_interests = { areas: [], property_types: [], lifestyle_tags: [] };
    }

    if (linkType === "school_info" && !intel.inferred_interests.lifestyle_tags?.includes("family")) {
      intel.inferred_interests.lifestyle_tags.push("family");
    }
    if (linkType === "market_report") {
      intel.content_preference = "data_driven";
    }
  }

  // Calculate engagement score (0-100)
  const opens = intel.total_opens || 0;
  const clicks = intel.total_clicks || 0;
  const recencyDays = intel.last_clicked
    ? Math.floor((Date.now() - new Date(intel.last_clicked).getTime()) / 86400000)
    : 999;

  intel.engagement_score = Math.min(100, Math.round(
    (Math.min(opens, 20) * 2) +      // Up to 40 points for opens
    (Math.min(clicks, 15) * 3) +       // Up to 45 points for clicks
    (recencyDays < 7 ? 15 : recencyDays < 30 ? 10 : recencyDays < 90 ? 5 : 0)  // Recency bonus
  ));

  // Save
  await supabase
    .from("contacts")
    .update({ newsletter_intelligence: intel })
    .eq("id", contactId);

  // Alert realtor for high-intent clicks
  if (linkType === "showing" || linkType === "contact_agent" || linkType === "cma") {
    const { data: contactData } = await supabase
      .from("contacts")
      .select("name")
      .eq("id", contactId)
      .single();

    await supabase.from("agent_notifications").insert({
      title: "Hot Lead Alert",
      body: `${contactData?.name || "A contact"} clicked "${linkType}" in your newsletter — they may be ready to act!`,
      type: "urgent",
      contact_id: contactId,
      action_url: `/contacts/${contactId}`,
    });
  }
}

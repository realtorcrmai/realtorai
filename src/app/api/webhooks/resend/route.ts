import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";

/**
 * POST /api/webhooks/resend
 * Handle Resend webhook events with signature verification.
 * Events: email.delivered, email.opened, email.clicked, email.bounced, email.complained
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const rawBody = await request.text();

    // Verify webhook signature
    const signature = request.headers.get("svix-signature");
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const svixId = request.headers.get("svix-id") || "";
      const svixTimestamp = request.headers.get("svix-timestamp") || "";
      const signPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
      const expectedSigs = signature.split(" ");
      const verified = expectedSigs.some((sig) => {
        const [, hash] = sig.split(",");
        if (!hash) return false;
        const secretBytes = Buffer.from(webhookSecret.replace("whsec_", ""), "base64");
        const computed = createHmac("sha256", secretBytes)
          .update(signPayload)
          .digest("base64");
        return computed === hash;
      });
      if (!verified) {
        console.warn("Resend webhook signature verification failed");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Extract newsletter_id from tags
    const newsletterId = data.tags?.find((t: { name: string; value: string }) => t.name === "newsletter_id")?.value;
    if (!newsletterId) {
      return NextResponse.json({ ok: true }); // Not a newsletter email
    }

    // Get newsletter + contact in one query
    const { data: newsletter } = await supabase
      .from("newsletters")
      .select("contact_id, email_type")
      .eq("id", newsletterId)
      .single();

    if (!newsletter) {
      console.warn(`Webhook received for unknown newsletter: ${newsletterId}`);
      return NextResponse.json({ ok: true });
    }

    const contactId = newsletter.contact_id;

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

    // Deduplicate events (check if same event already logged within 60s)
    const dedupeWindow = new Date(Date.now() - 60000).toISOString();
    const { data: existingEvent } = await supabase
      .from("newsletter_events")
      .select("id")
      .eq("newsletter_id", newsletterId)
      .eq("event_type", eventType)
      .eq("link_url", data.click?.link || "")
      .gte("created_at", dedupeWindow)
      .limit(1)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ ok: true }); // Already processed
    }

    // Classify click link
    let linkUrl: string | null = null;
    let linkType: string | null = null;
    if (eventType === "clicked" && data.click?.link) {
      linkUrl = data.click.link as string;
      linkType = classifyLink(linkUrl);
    }

    // Log event
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
        email_type: newsletter.email_type,
      },
    });

    // Update contact intelligence on engagement events
    if (eventType === "opened" || eventType === "clicked") {
      await updateContactIntelligence(supabase, contactId, eventType, linkType, linkUrl);
    }

    // Handle bounce — mark as unsubscribed
    if (eventType === "bounced") {
      await supabase
        .from("contacts")
        .update({ newsletter_unsubscribed: true })
        .eq("id", contactId);

      // Pause all journeys
      await supabase
        .from("contact_journeys")
        .update({ is_paused: true, pause_reason: "bounced" })
        .eq("contact_id", contactId);
    }

    // Handle complaint — unsubscribe + log
    if (eventType === "complained") {
      await supabase
        .from("contacts")
        .update({ newsletter_unsubscribed: true })
        .eq("id", contactId);

      await supabase
        .from("contact_journeys")
        .update({ is_paused: true, pause_reason: "complained" })
        .eq("contact_id", contactId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Resend webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function classifyLink(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("/listings/") || lower.includes("listing")) return "listing";
  if (lower.includes("/showings/") || lower.includes("showing") || lower.includes("book")) return "showing";
  if (lower.includes("market") || lower.includes("report") || lower.includes("stats")) return "market_report";
  if (lower.includes("school")) return "school_info";
  if (lower.includes("neighbour") || lower.includes("neighborhood") || lower.includes("area")) return "neighbourhood";
  if (lower.includes("cma") || lower.includes("valuation") || lower.includes("value")) return "cma";
  if (lower.includes("contact") || lower.includes("call") || lower.includes("phone")) return "contact_agent";
  if (lower.includes("unsubscribe")) return "unsubscribe";
  return "other";
}

async function updateContactIntelligence(
  supabase: ReturnType<typeof createAdminClient>,
  contactId: string,
  eventType: string,
  linkType: string | null,
  linkUrl: string | null
) {
  const { data: contact } = await supabase
    .from("contacts")
    .select("newsletter_intelligence, name")
    .eq("id", contactId)
    .single();

  const intel: Record<string, any> = (contact?.newsletter_intelligence as Record<string, any>) || {};

  if (eventType === "opened") {
    intel.total_opens = (intel.total_opens || 0) + 1;
    intel.last_opened = new Date().toISOString();
  }

  if (eventType === "clicked") {
    intel.total_clicks = (intel.total_clicks || 0) + 1;
    intel.last_clicked = new Date().toISOString();

    // Click history (keep last 50)
    if (!intel.click_history) intel.click_history = [];
    intel.click_history.push({
      link_type: linkType,
      link_url: linkUrl,
      clicked_at: new Date().toISOString(),
    });
    if (intel.click_history.length > 50) {
      intel.click_history = intel.click_history.slice(-50);
    }

    // Inferred interests
    if (!intel.inferred_interests) {
      intel.inferred_interests = { areas: [], property_types: [], lifestyle_tags: [] };
    }
    const tags = intel.inferred_interests.lifestyle_tags || [];
    if (linkType === "school_info" && !tags.includes("family")) tags.push("family");
    if (linkType === "listing" && !tags.includes("active_searcher")) tags.push("active_searcher");
    if (linkType === "cma" && !tags.includes("considering_selling")) tags.push("considering_selling");
    if (linkType === "market_report") intel.content_preference = "data_driven";
    if (linkType === "neighbourhood") intel.content_preference = "lifestyle";
    intel.inferred_interests.lifestyle_tags = tags;

    // Extract area from listing URLs (e.g., /listings/kitsilano-123)
    if (linkUrl && linkType === "listing") {
      const areas = intel.inferred_interests.areas || [];
      const urlParts = linkUrl.split("/");
      const slug = urlParts[urlParts.length - 1];
      if (slug && !areas.includes(slug)) {
        areas.push(slug);
        intel.inferred_interests.areas = areas.slice(-10);
      }
    }
  }

  // Engagement score (0-100)
  const opens = intel.total_opens || 0;
  const clicks = intel.total_clicks || 0;
  const lastClicked = intel.last_clicked ? new Date(intel.last_clicked).getTime() : 0;
  const lastOpened = intel.last_opened ? new Date(intel.last_opened).getTime() : 0;
  const lastEngagement = Math.max(lastClicked, lastOpened);
  const recencyDays = lastEngagement > 0
    ? Math.floor((Date.now() - lastEngagement) / 86400000)
    : 999;

  intel.engagement_score = Math.min(100, Math.round(
    (Math.min(opens, 20) * 2) +
    (Math.min(clicks, 15) * 3) +
    (recencyDays < 7 ? 15 : recencyDays < 30 ? 10 : recencyDays < 90 ? 5 : 0)
  ));

  await supabase
    .from("contacts")
    .update({ newsletter_intelligence: intel })
    .eq("id", contactId);

  // Hot lead alerts for high-intent actions
  if (linkType === "showing" || linkType === "contact_agent" || linkType === "cma") {
    await supabase.from("agent_notifications").insert({
      title: "\uD83D\uDD25 Hot Lead Alert",
      body: `${contact?.name || "A contact"} clicked "${linkType?.replace(/_/g, " ")}" in your newsletter — they may be ready to act!`,
      type: "urgent",
      contact_id: contactId,
      action_url: `/contacts/${contactId}`,
    });
  }
}

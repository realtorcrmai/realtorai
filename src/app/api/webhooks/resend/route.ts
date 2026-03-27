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
    let scoreImpact = 0;
    if (eventType === "clicked" && data.click?.link) {
      linkUrl = data.click.link as string;
      const classification = classifyClick(linkUrl);
      linkType = classification.type;
      scoreImpact = classification.score_impact;
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
        ...(eventType === "clicked" && linkType
          ? { click_classification: linkType, score_impact: scoreImpact }
          : {}),
      },
    });

    // Update contact intelligence on engagement events
    if (eventType === "opened" || eventType === "clicked") {
      await updateContactIntelligence(supabase, contactId, eventType, linkType, linkUrl, scoreImpact);

      // Emit agent events for AI evaluation
      try {
        const { emitEngagementEvent } = await import("@/lib/ai-agent/event-emitter");
        const agentEventType = eventType === "clicked" ? "email_clicked" : "email_opened";
        await emitEngagementEvent(contactId, agentEventType, {
          newsletterId: newsletterId,
          emailType: newsletter.email_type,
          linkType,
          linkUrl,
        });

        // Detect high-intent clicks (score_impact >= 30)
        if (scoreImpact >= 30) {
          await emitEngagementEvent(contactId, "high_intent_click", {
            newsletterId: newsletterId,
            linkType,
            linkUrl,
            scoreImpact,
          });
        }
      } catch {
        // Don't fail webhook processing if event emission fails
      }
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

interface ClickClassification {
  type: string;
  score_impact: number;
}

const CLICK_CATEGORIES: { type: string; score_impact: number; patterns: string[] }[] = [
  { type: "book_showing", score_impact: 30, patterns: ["/book-showing", "/schedule-viewing"] },
  { type: "get_cma", score_impact: 30, patterns: ["/cma", "/home-value", "/what-is-my-home-worth"] },
  { type: "mortgage_calc", score_impact: 20, patterns: ["/mortgage", "/calculator", "/pre-approval"] },
  { type: "listing", score_impact: 15, patterns: ["/listing/", "/listings/", "/listings?", "/property/", "/homes/"] },
  { type: "investment", score_impact: 15, patterns: ["/investment", "/rental", "/yield", "/cap-rate"] },
  { type: "open_house_rsvp", score_impact: 15, patterns: ["/open-house", "/rsvp"] },
  { type: "school_info", score_impact: 10, patterns: ["/school", "/education"] },
  { type: "market_stats", score_impact: 10, patterns: ["/market", "/stats", "/report"] },
  { type: "neighbourhood", score_impact: 10, patterns: ["/neighbourhood", "/neighborhood", "/area-guide"] },
  { type: "price_drop", score_impact: 10, patterns: ["/price-drop", "/reduced"] },
  { type: "forwarded", score_impact: 5, patterns: ["/forward", "/share"] },
];

function classifyClick(url: string): ClickClassification {
  const lower = url.toLowerCase();
  for (const category of CLICK_CATEGORIES) {
    if (category.patterns.some((p) => lower.includes(p))) {
      return { type: category.type, score_impact: category.score_impact };
    }
  }
  return { type: "other", score_impact: 5 };
}

async function updateContactIntelligence(
  supabase: ReturnType<typeof createAdminClient>,
  contactId: string,
  eventType: string,
  linkType: string | null,
  linkUrl: string | null,
  scoreImpact: number = 5
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

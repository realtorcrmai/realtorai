import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";

/**
 * POST /api/webhooks/resend
 * Handle Resend webhook events with signature verification.
 * Events: email.delivered, email.opened, email.clicked, email.bounced, email.complained, email.unsubscribed
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    if (!process.env.RESEND_WEBHOOK_SECRET) {
      console.warn("RESEND_WEBHOOK_SECRET not configured — rejecting webhook");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

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

    // Handle unsubscribe and complaint events by email address (no newsletter_id needed)
    if (type === "email.unsubscribed" || type === "email.complained") {
      const email = data.email?.to?.[0] || data.to;
      if (email) {
        await supabase
          .from("contacts")
          .update({ newsletter_unsubscribed: true, updated_at: new Date().toISOString() })
          .eq("email", email);

        // Also pause journeys if we can resolve the contact
        if (type === "email.complained") {
          const { data: contact } = await supabase
            .from("contacts")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (contact?.id) {
            await supabase
              .from("contact_journeys")
              .update({ is_paused: true, pause_reason: "complained" })
              .eq("contact_id", contact.id);
          }
        }
      }
      return NextResponse.json({ ok: true });
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

    // Deduplicate events — different strategy for opens vs clicks
    // Opens: deduplicate on (newsletter_id, contact_id, event_type) within 1-hour window
    // Clicks: deduplicate on link_url within 60-second window (avoid double-fire)
    let existingEvent = null;
    if (eventType === "opened") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: found } = await supabase
        .from("newsletter_events")
        .select("id")
        .eq("newsletter_id", newsletterId)
        .eq("contact_id", contactId)
        .eq("event_type", "opened")
        .gte("created_at", oneHourAgo)
        .limit(1)
        .maybeSingle();
      existingEvent = found;
    } else {
      const dedupeWindow = new Date(Date.now() - 60000).toISOString();
      const { data: found } = await supabase
        .from("newsletter_events")
        .select("id")
        .eq("newsletter_id", newsletterId)
        .eq("event_type", eventType)
        .eq("link_url", data.click?.link || "")
        .gte("created_at", dedupeWindow)
        .limit(1)
        .maybeSingle();
      existingEvent = found;
    }

    if (existingEvent) {
      return NextResponse.json({ ok: true }); // Already processed
    }

    // Classify click link
    let linkUrl: string | null = null;
    let linkType: string | null = null;
    let scoreImpact = eventType === "opened" ? 2 : 0;
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
          ? { click_type: linkType, score_impact: scoreImpact }
          : {}),
      },
    });

    // Update contact intelligence on engagement events
    if (eventType === "opened" || eventType === "clicked") {
      const updatedIntel = await updateContactIntelligence(
        supabase,
        contactId,
        eventType,
        linkType,
        linkUrl,
        scoreImpact,
        data,
        newsletterId,
      );

      // Advance journey phase on high-intent action
      if (scoreImpact >= 25 && updatedIntel) {
        try {
          const { advanceJourneyPhase } = await import("@/actions/journeys");
          type JourneyType = "buyer" | "seller" | "customer" | "agent";
          type JourneyPhase = "lead" | "active" | "under_contract" | "past_client" | "dormant";
          const currentPhase = (updatedIntel.current_journey_phase ?? "lead") as JourneyPhase;
          const phaseProgression: Partial<Record<JourneyPhase, JourneyPhase>> = {
            lead: "active",
            dormant: "lead", // re-entering the funnel
            // active stays active — don't over-advance on a single click
          };
          const nextPhase = phaseProgression[currentPhase];
          const resolvedType = (updatedIntel.contact_type ?? "buyer") as JourneyType;
          if (nextPhase && currentPhase !== nextPhase) {
            await advanceJourneyPhase(contactId, resolvedType, nextPhase);
          }
        } catch (e) {
          console.warn("[webhook] Could not advance journey on high-intent click:", e);
        }
      }

      // Next-best-action: override next email type based on what they clicked
      if (scoreImpact >= 25 && linkType) {
        const NBA_MAP: Record<string, string> = {
          book_showing:    "open_house_invite",   // they want to see properties → invite to open house
          get_cma:         "market_update",        // they want market data → send full market update
          get_valuation:   "just_sold",            // seller wants to know values → show recent sales
          seller_inquiry:  "market_update",        // seller interested → market conditions
          listing_inquiry: "new_listing_alert",    // they clicked a listing → send more listings
          market_research: "market_update",        // market curious → full market update
        }
        const nextEmailType = NBA_MAP[linkType]
        if (nextEmailType) {
          try {
            const nbaSupabase = createAdminClient()
            await nbaSupabase
              .from("contact_journeys")
              .update({
                next_email_type_override: nextEmailType,
                next_email_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h later
                updated_at: new Date().toISOString(),
              })
              .eq("contact_id", contactId)
              .eq("is_paused", false)
          } catch (e) {
            console.warn("[webhook] Could not set next-best-action:", e)
          }
        }
      }

      // Create a follow-up task for the realtor on high-intent click
      if (scoreImpact >= 25 && linkType) {
        try {
          const taskSupabase = createAdminClient()

          // Get contact name for the task title
          const { data: taskContact } = await taskSupabase
            .from("contacts")
            .select("name, email")
            .eq("id", contactId)
            .single()

          const taskTitle = linkType === "book_showing"
            ? `Follow up with ${taskContact?.name ?? "contact"} — clicked Book Showing`
            : linkType === "get_valuation" || linkType === "get_cma"
            ? `Follow up with ${taskContact?.name ?? "contact"} — requested valuation`
            : `Follow up with ${taskContact?.name ?? "contact"} — high-intent email click`

          await taskSupabase.from("tasks").insert({
            title: taskTitle,
            description: `${taskContact?.name ?? "Contact"} clicked a high-intent link in a newsletter email. Link: ${linkUrl ?? "unknown"}. Score impact: +${scoreImpact} pts. Suggested action: reach out within 24 hours.`,
            contact_id: contactId,
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            priority: "high",
            status: "pending",
            category: "follow_up",
          })
        } catch (e) {
          console.warn("[webhook] Could not create follow-up task:", e)
        }
      }

      // Re-engage dormant contacts on any click
      if (eventType === "clicked") {
        const currentPhase = updatedIntel?.current_journey_phase ?? null;
        if (currentPhase === "dormant") {
          try {
            const dormantSupabase = createAdminClient();
            await dormantSupabase
              .from("contact_journeys")
              .update({
                is_paused: false,
                current_phase: "lead",
                next_email_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h
                updated_at: new Date().toISOString(),
              })
              .eq("contact_id", contactId)
              .eq("is_paused", true);
          } catch (e) {
            console.warn("[webhook] Could not re-engage dormant contact:", e);
          }
        }
      }

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

function mapLinkTypeToConversionEvent(linkType: string): string {
  const map: Record<string, string> = {
    book_showing: "showing_booked",
    get_cma: "cma_requested",
    get_valuation: "valuation_requested",
    seller_inquiry: "seller_inquiry",
    listing_inquiry: "listing_inquiry",
  };
  return map[linkType] ?? "listing_inquiry";
}

interface ClickClassification {
  type: string;
  score_impact: number;
}

const CLICK_CATEGORIES: { type: string; score_impact: number; keywords: string[] }[] = [
  { type: "book_showing", score_impact: 30, keywords: ["showing", "book", "schedule", "tour"] },
  { type: "get_cma", score_impact: 30, keywords: ["cma", "appraisal"] },
  { type: "get_valuation", score_impact: 30, keywords: ["valuation", "home-value"] },
  { type: "seller_inquiry", score_impact: 25, keywords: ["list", "sell", "seller"] },
  { type: "mortgage_calc", score_impact: 20, keywords: ["mortgage", "calculator", "rate", "payment"] },
  { type: "listing", score_impact: 15, keywords: ["listing", "property", "home", "house", "mls"] },
  { type: "investment", score_impact: 15, keywords: ["investment", "rental", "roi", "income"] },
  { type: "open_house_rsvp", score_impact: 15, keywords: ["rsvp", "open-house", "register"] },
  { type: "market_research", score_impact: 15, keywords: ["market-report", "market_report"] },
  { type: "school_info", score_impact: 10, keywords: ["school", "education", "district"] },
  { type: "market_stats", score_impact: 10, keywords: ["market", "stats", "report", "trend"] },
  { type: "neighbourhood", score_impact: 10, keywords: ["neighbourhood", "neighborhood", "area", "community"] },
  { type: "price_drop", score_impact: 10, keywords: ["price-drop", "reduced", "new-price"] },
  { type: "forwarded", score_impact: 5, keywords: ["forward", "share"] },
];

function classifyClick(url: string): ClickClassification {
  const lower = url.toLowerCase();
  for (const category of CLICK_CATEGORIES) {
    if (category.keywords.some((kw) => lower.includes(kw))) {
      return { type: category.type, score_impact: category.score_impact };
    }
  }
  return { type: "other", score_impact: 5 };
}

/**
 * Returns an object with current_journey_phase and contact_type for downstream use,
 * or null if the contact could not be fetched.
 */
async function updateContactIntelligence(
  supabase: ReturnType<typeof createAdminClient>,
  contactId: string,
  eventType: string,
  linkType: string | null,
  linkUrl: string | null,
  scoreImpact: number = 5,
  eventData: Record<string, any> = {},
  newsletterId: string | null = null,
): Promise<{ current_journey_phase: string | null; contact_type: string | null } | null> {
  const { data: contact } = await supabase
    .from("contacts")
    .select("newsletter_intelligence, name, type")
    .eq("id", contactId)
    .single();

  if (!contact) return null;

  const intel: Record<string, any> = (contact?.newsletter_intelligence as Record<string, any>) || {};

  if (eventType === "opened") {
    intel.total_opens = (intel.total_opens || 0) + 1;
    const now = new Date().toISOString();
    intel.last_opened = now;
    intel.last_opened_at = now; // alias for compatibility
  }

  if (eventType === "clicked") {
    intel.total_clicks = (intel.total_clicks || 0) + 1;
    const now = new Date().toISOString();
    intel.last_clicked = now;
    intel.last_clicked_at = now; // alias for compatibility

    // Click history (keep last 50) — include email_type and newsletter_id for AI correlation
    if (!intel.click_history) intel.click_history = [];
    intel.click_history.push({
      link_type: linkType,
      link_url: linkUrl,
      clicked_at: new Date().toISOString(),
      email_type: eventData.email_type || eventData.tags?.email_type || "unknown",
      newsletter_id: eventData.tags?.newsletter_id || newsletterId || null,
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
    if (linkType === "get_cma" && !tags.includes("considering_selling")) tags.push("considering_selling");
    if (linkType === "get_valuation" && !tags.includes("considering_selling")) tags.push("considering_selling");
    if (linkType === "seller_inquiry" && !tags.includes("considering_selling")) tags.push("considering_selling");
    if (linkType === "market_stats") intel.content_preference = "data_driven";
    if (linkType === "market_research") intel.content_preference = "data_driven";
    if (linkType === "neighbourhood") intel.content_preference = "lifestyle";
    if (linkType === "investment" && !tags.includes("investor")) tags.push("investor");
    if (linkType === "mortgage_calc" && !tags.includes("financing")) tags.push("financing");
    if (linkType === "open_house_rsvp" && !tags.includes("active_searcher")) tags.push("active_searcher");
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

  // Engagement score: apply time-based decay, then add event impact, cap at 100
  const currentScore = intel.engagement_score || 0;
  const previousScore = currentScore;

  const daysSinceLastEngagement = intel.last_opened
    ? (Date.now() - new Date(intel.last_opened).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const decayedScore = daysSinceLastEngagement > 60
    ? Math.max(0, currentScore - Math.floor(daysSinceLastEngagement / 30) * 5)
    : currentScore;

  const newScore = Math.min(100, decayedScore + scoreImpact);
  intel.engagement_score = newScore;

  // Engagement trend
  const daysSinceLastOpen = intel.last_opened
    ? (Date.now() - new Date(intel.last_opened).getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  const engagement_trend = daysSinceLastOpen > 30
    ? "declining"
    : newScore > previousScore + 5
      ? "improving"
      : "stable";
  intel.engagement_trend = engagement_trend;

  await supabase
    .from("contacts")
    .update({ newsletter_intelligence: intel })
    .eq("id", contactId);

  // Sync inferred interests into buyer_preferences for AI generation
  const inferredInterests = intel.inferred_interests as {
    areas?: string[];
    property_types?: string[];
    lifestyle_tags?: string[];
  } | undefined;
  if (inferredInterests?.areas?.length || inferredInterests?.property_types?.length) {
    try {
      const { data: contactData } = await supabase
        .from("contacts")
        .select("buyer_preferences")
        .eq("id", contactId)
        .single();

      const currentPrefs = (contactData?.buyer_preferences as Record<string, unknown>) ?? {};
      const updatedPrefs = {
        ...currentPrefs,
        // Merge inferred areas — deduplicated
        preferred_areas: Array.from(new Set([
          ...((currentPrefs.preferred_areas as string[]) ?? []),
          ...(inferredInterests.areas ?? []),
        ])).slice(0, 10),
        // Merge inferred property types
        property_types: Array.from(new Set([
          ...((currentPrefs.property_types as string[]) ?? []),
          ...(inferredInterests.property_types ?? []),
        ])).slice(0, 5),
        last_synced_from_clicks: new Date().toISOString(),
      };

      await supabase
        .from("contacts")
        .update({ buyer_preferences: updatedPrefs })
        .eq("id", contactId);
    } catch (e) {
      console.warn("[webhook] Could not sync buyer_preferences from clicks:", e);
    }
  }

  // HIGH intent clicks (score_impact >= 30): log to communications table + agent notification
  if (scoreImpact >= 30 && linkType) {
    const labelMap: Record<string, string> = {
      book_showing: "Book a Showing",
      get_cma: "Get a CMA / Home Valuation",
      get_valuation: "Get a Home Valuation",
      seller_inquiry: "Seller / Listing Inquiry",
    };
    const label = labelMap[linkType] || linkType.replace(/_/g, " ");

    await supabase.from("communications").insert({
      contact_id: contactId,
      direction: "inbound",
      channel: "email",
      body: `HOT LEAD: clicked ${label} — ${linkUrl || "unknown URL"}`,
      related_type: "newsletter_click",
    });

    await supabase.from("agent_notifications").insert({
      title: "Hot Lead Alert",
      body: `${contact?.name || "A contact"} clicked "${label}" in your newsletter — they may be ready to act!`,
      type: "urgent",
      contact_id: contactId,
      action_url: `/contacts/${contactId}`,
    });

    // Log to conversion_events for funnel attribution
    if (scoreImpact >= 25) {
      try {
        await supabase.from("conversion_events").insert({
          contact_id: contactId,
          newsletter_id: newsletterId,
          event_type: mapLinkTypeToConversionEvent(linkType),
          email_type: eventData.email_type || eventData.tags?.email_type || null,
          link_type: linkType,
          link_url: linkUrl,
          metadata: {
            engagement_score: newScore,
            score_impact: scoreImpact,
          },
          converted_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("[webhook] Could not log conversion_event:", e);
      }
    }
  }

  // Resolve current journey phase for caller (used for journey advancement)
  const { data: journey } = await supabase
    .from("contact_journeys")
    .select("current_phase")
    .eq("contact_id", contactId)
    .eq("is_paused", false)
    .order("enrolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    current_journey_phase: journey?.current_phase ?? null,
    contact_type: contact.type ?? null,
  };
}

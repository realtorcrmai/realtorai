import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

// ── Types ──────────────────────────────────────────────────────

interface AgentEvent {
  id: string;
  event_type: string;
  contact_id: string | null;
  listing_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

interface ContactWithIntel {
  id: string;
  name: string;
  type: string;
  email: string | null;
  stage_bar: string | null;
  newsletter_intelligence: Record<string, any> | null;
  ai_lead_score: Record<string, any> | null;
  buyer_preferences: Record<string, any> | null;
}

interface AgentDecision {
  contactId: string;
  eventId: string;
  decision: "send" | "skip" | "defer" | "suppress";
  emailType?: string;
  reasoning: string;
  relevanceScore: number;
  confidence: number;
  contextSnapshot: Record<string, unknown>;
}

// ── Main Entry Point ───────────────────────────────────────────

export async function processEventBatch(
  limit: number = 100
): Promise<{ processed: number; decisions: number; errors: number }> {
  const supabase = createAdminClient();

  // Fetch unprocessed events
  const { data: events, error } = await supabase
    .from("agent_events")
    .select("*")
    .eq("processed", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !events || events.length === 0) {
    return { processed: 0, decisions: 0, errors: 0 };
  }

  let decisions = 0;
  let errors = 0;

  for (const event of events) {
    try {
      let eventDecisions: AgentDecision[] = [];

      if (event.event_type.startsWith("listing_")) {
        // Listing events fan out to all matching buyers
        eventDecisions = await evaluateListingEventForAllContacts(event);
      } else {
        // Contact-specific events evaluate just that contact
        const decision = await evaluateContactEvent(event);
        if (decision) eventDecisions = [decision];
      }

      // Save decisions
      for (const d of eventDecisions) {
        const { error: insertError } = await supabase.from("agent_decisions").insert({
          contact_id: d.contactId,
          event_id: d.eventId,
          decision: d.decision,
          email_type: d.emailType,
          reasoning: d.reasoning,
          relevance_score: d.relevanceScore,
          confidence: d.confidence,
          context_snapshot: d.contextSnapshot,
        });

        if (!insertError && d.decision === "send") {
          // Queue the email for generation
          await queueEmailFromDecision(d);
          decisions++;
        }
      }

      // Mark event as processed
      await supabase
        .from("agent_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("id", event.id);
    } catch (err) {
      console.error("[evaluator] Error processing event:", event.id, err);
      errors++;
      // Mark as processed anyway to avoid infinite retry
      await supabase
        .from("agent_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("id", event.id);
    }
  }

  return { processed: events.length, decisions, errors };
}

// ── Listing Event Evaluation ───────────────────────────────────

async function evaluateListingEventForAllContacts(
  event: AgentEvent
): Promise<AgentDecision[]> {
  const supabase = createAdminClient();
  const decisions: AgentDecision[] = [];

  // Only process listing_created and listing_price_change for buyer matching
  if (event.event_type !== "listing_created" && event.event_type !== "listing_price_change") {
    return decisions;
  }

  // Fetch the listing data
  const { data: listing } = await supabase
    .from("listings")
    .select("id, address, list_price, bedrooms, bathrooms, property_type, status")
    .eq("id", event.listing_id!)
    .single();

  if (!listing) return decisions;

  // Fetch all active buyer contacts with journeys
  const { data: buyerJourneys } = await supabase
    .from("contact_journeys")
    .select("contact_id, journey_type, current_phase, agent_mode, is_paused, contacts(id, name, type, email, stage_bar, newsletter_intelligence, ai_lead_score)")
    .eq("journey_type", "buyer")
    .eq("is_paused", false);

  if (!buyerJourneys) return decisions;

  for (const journey of buyerJourneys) {
    const contact = journey.contacts as any as ContactWithIntel;
    if (!contact || !contact.email) continue;

    // Check send history
    const recentHistory = await getRecentHistory(contact.id);

    // Skip if too many recent emails
    if (recentHistory.emailsSent7d >= 3) {
      decisions.push({
        contactId: contact.id,
        eventId: event.id,
        decision: "defer",
        emailType: "new_listing_alert",
        reasoning: `Weekly cap reached (${recentHistory.emailsSent7d}/3 emails in 7 days)`,
        relevanceScore: 0,
        confidence: 1.0,
        contextSnapshot: { listing: listing.address, weeklyCount: recentHistory.emailsSent7d },
      });
      continue;
    }

    // Use AI to evaluate relevance
    const decision = await evaluateEventForContact(event, contact, recentHistory, listing);
    decisions.push(decision);
  }

  return decisions;
}

// ── Contact Event Evaluation ───────────────────────────────────

async function evaluateContactEvent(
  event: AgentEvent
): Promise<AgentDecision | null> {
  if (!event.contact_id) return null;

  const supabase = createAdminClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, type, email, stage_bar, newsletter_intelligence, ai_lead_score")
    .eq("id", event.contact_id)
    .single();

  if (!contact || !contact.email) return null;

  const recentHistory = await getRecentHistory(contact.id);

  // For engagement events, evaluate whether to send a follow-up
  if (event.event_type === "high_intent_click" || event.event_type === "engagement_spike") {
    // High-intent: always consider sending
    return evaluateEventForContact(event, contact as ContactWithIntel, recentHistory);
  }

  // For stage changes, evaluate journey-appropriate email
  if (event.event_type === "contact_stage_changed") {
    return evaluateEventForContact(event, contact as ContactWithIntel, recentHistory);
  }

  // For contact_created, consider welcome email
  if (event.event_type === "contact_created") {
    return {
      contactId: contact.id,
      eventId: event.id,
      decision: "send",
      emailType: "welcome",
      reasoning: "New contact created, sending welcome email",
      relevanceScore: 90,
      confidence: 0.95,
      contextSnapshot: { contactType: contact.type, name: contact.name },
    };
  }

  return null;
}

// ── Core AI Evaluation ─────────────────────────────────────────

async function evaluateEventForContact(
  event: AgentEvent,
  contact: ContactWithIntel,
  recentHistory: { emailsSent7d: number; lastEmailAt: string | null; recentClicks: any[] },
  listing?: any
): Promise<AgentDecision> {
  const anthropic = new Anthropic();

  const intel = contact.newsletter_intelligence ?? {};
  const leadScore = contact.ai_lead_score ?? {};

  const prompt = `You are an email marketing agent for a BC real estate CRM. Evaluate whether this event warrants sending an email to this contact.

EVENT: ${event.event_type}
${listing ? `LISTING: ${listing.address}, $${listing.list_price?.toLocaleString()}, ${listing.bedrooms}BR/${listing.bathrooms}BA, ${listing.property_type ?? "residential"}` : ""}
EVENT DATA: ${JSON.stringify(event.payload).slice(0, 500)}

CONTACT: ${contact.name} (${contact.type})
- Stage: ${contact.stage_bar ?? "unknown"}
- Engagement score: ${intel.engagement_score ?? 0}/100
- Last click: ${intel.last_clicked ?? "never"}
- Interested areas: ${JSON.stringify(intel.inferred_interests?.areas ?? [])}
- Price range: ${JSON.stringify(intel.inferred_interests?.price_range ?? [])}
- Property types: ${JSON.stringify(intel.inferred_interests?.property_types ?? [])}
- Content preference: ${intel.content_preference ?? "unknown"}
- Lead score intent: ${leadScore.intent ?? "unknown"}
- Buying readiness: ${leadScore.buying_readiness ?? "unknown"}

SEND HISTORY (last 7 days):
- Emails sent: ${recentHistory.emailsSent7d}
- Last email: ${recentHistory.lastEmailAt ?? "never"}
- Recent clicks: ${recentHistory.recentClicks.length}

RULES:
- "send": Relevant AND good timing. relevance_score > 65 AND confidence > 0.6
- "defer": Relevant but bad timing (too many recent emails, contact in low-engagement period)
- "skip": Marginally relevant, not worth sending
- "suppress": Not relevant at all

Return ONLY valid JSON:
{"decision":"send|skip|defer|suppress","email_type":"new_listing_alert|market_update|neighbourhood_guide|just_sold|open_house_invite|home_anniversary","reasoning":"brief explanation","relevance_score":0-100,"confidence":0.0-1.0}`;

  // RAG: retrieve contact journey context
  let ragContext = '';
  try {
    const { retrieveContext } = await import('@/lib/rag/retriever');
    const retrieved = await retrieveContext(
      `${contact.name} journey interactions preferences`,
      { contact_id: contact.id, content_type: ['message', 'activity', 'email'] },
      3
    );
    if (retrieved.formatted) ragContext = `\n\nCONTACT HISTORY:\n${retrieved.formatted}`;
  } catch { /* RAG not available */ }

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt + ragContext }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result = JSON.parse(jsonMatch[0]);

    return {
      contactId: contact.id,
      eventId: event.id,
      decision: result.decision ?? "skip",
      emailType: result.email_type,
      reasoning: result.reasoning ?? "No reasoning provided",
      relevanceScore: result.relevance_score ?? 0,
      confidence: result.confidence ?? 0,
      contextSnapshot: {
        contactName: contact.name,
        contactType: contact.type,
        eventType: event.event_type,
        listing: listing?.address,
        engagementScore: intel.engagement_score ?? 0,
      },
    };
  } catch (err) {
    console.error("[evaluator] AI evaluation failed for", contact.name, err);
    return {
      contactId: contact.id,
      eventId: event.id,
      decision: "skip",
      reasoning: `AI evaluation failed: ${err instanceof Error ? err.message : "unknown error"}`,
      relevanceScore: 0,
      confidence: 0,
      contextSnapshot: {},
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────

async function getRecentHistory(contactId: string) {
  const supabase = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: recentEmails } = await supabase
    .from("newsletters")
    .select("id, sent_at")
    .eq("contact_id", contactId)
    .eq("status", "sent")
    .gte("sent_at", sevenDaysAgo)
    .order("sent_at", { ascending: false });

  const { data: recentClicks } = await supabase
    .from("newsletter_events")
    .select("id, metadata")
    .eq("event_type", "clicked")
    .in(
      "newsletter_id",
      (recentEmails ?? []).map((e) => e.id).length > 0
        ? (recentEmails ?? []).map((e) => e.id)
        : ["__none__"]
    );

  return {
    emailsSent7d: recentEmails?.length ?? 0,
    lastEmailAt: recentEmails?.[0]?.sent_at ?? null,
    recentClicks: recentClicks ?? [],
  };
}

async function queueEmailFromDecision(decision: AgentDecision) {
  if (!decision.emailType) return;

  const supabase = createAdminClient();

  // Create a draft newsletter for the contact
  const { data: contact } = await supabase
    .from("contacts")
    .select("name, email")
    .eq("id", decision.contactId)
    .single();

  if (!contact) return;

  // For now, create a draft that goes to the approval queue
  // The trust gate (Phase 2) will determine auto-send vs review
  await supabase.from("newsletters").insert({
    contact_id: decision.contactId,
    subject: `AI Draft: ${decision.emailType.replace(/_/g, " ")} for ${contact.name}`,
    email_type: decision.emailType,
    status: "draft",
    html_body: `<p>AI-generated email pending content generation. Type: ${decision.emailType}. Reasoning: ${decision.reasoning}</p>`,
    ai_context: {
      decision_id: decision.eventId,
      reasoning: decision.reasoning,
      relevance_score: decision.relevanceScore,
      confidence: decision.confidence,
      context: decision.contextSnapshot,
    },
  });
}

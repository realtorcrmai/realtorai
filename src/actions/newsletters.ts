"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { sendEmail } from "@/lib/resend";
import { validatedSend } from "@/lib/validated-send";
import { generateNewsletterContent, NewsletterContext } from "@/lib/newsletter-ai";
import { render } from "@react-email/components";
import { revalidatePath } from "next/cache";
import { triggerIngest } from "@/lib/rag/realtime-ingest";
import { canSendToContact, filterSendable } from "@/lib/compliance/can-send";

// React Email template imports
import { NewListingAlert } from "@/emails/NewListingAlert";
import { MarketUpdate } from "@/emails/MarketUpdate";
import { JustSold } from "@/emails/JustSold";
import { OpenHouseInvite } from "@/emails/OpenHouseInvite";
import { NeighbourhoodGuide } from "@/emails/NeighbourhoodGuide";
import { HomeAnniversary } from "@/emails/HomeAnniversary";
import type { RealtorBranding } from "@/emails/BaseLayout";

async function getRealtorBranding(): Promise<RealtorBranding> {
  // TODO: fetch from realtor profile when multi-tenant
  return {
    name: process.env.AGENT_NAME || "Your Realtor",
    title: "REALTOR\u00AE",
    brokerage: process.env.AGENT_BROKERAGE || "",
    phone: process.env.AGENT_PHONE || "",
    email: process.env.AGENT_EMAIL || "",
    accentColor: "#4f35d2",
  };
}

function getUnsubscribeUrl(contactId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/newsletters/unsubscribe?id=${contactId}`;
}

async function renderEmailTemplate(
  emailType: string,
  content: any,
  branding: RealtorBranding,
  contactName: string,
  contactId: string
): Promise<string> {
  const unsubscribeUrl = getUnsubscribeUrl(contactId);
  const firstName = contactName.split(" ")[0];

  const templateProps: Record<string, any> = {
    branding,
    recipientName: firstName,
    unsubscribeUrl,
  };

  let element: React.ReactElement;

  switch (emailType) {
    case "new_listing_alert":
      element = NewListingAlert({
        ...templateProps,
        area: content.area || "your area",
        intro: content.intro,
        listings: content.listings || [],
        ctaText: content.ctaText,
      } as any);
      break;

    case "market_update":
      element = MarketUpdate({
        ...templateProps,
        area: content.area || "your area",
        month: content.month || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        intro: content.intro,
        stats: content.stats || [],
        recentSales: content.recentSales || [],
        commentary: content.body,
        ctaText: content.ctaText,
      } as any);
      break;

    case "just_sold":
      element = JustSold({
        ...templateProps,
        address: content.address || "",
        salePrice: content.salePrice || "",
        daysOnMarket: content.daysOnMarket || 0,
        photo: content.photo,
        message: content.body,
        ctaText: content.ctaText,
      } as any);
      break;

    case "open_house_invite":
      element = OpenHouseInvite({
        ...templateProps,
        address: content.address || "",
        price: content.price || "",
        date: content.date || "",
        time: content.time || "",
        photo: content.photo,
        description: content.body,
        features: content.highlights || [],
      } as any);
      break;

    case "neighbourhood_guide":
      element = NeighbourhoodGuide({
        ...templateProps,
        area: content.area || "your area",
        intro: content.intro,
        highlights: content.highlights?.map((h: string) => ({
          category: "Highlights",
          items: [h],
        })) || [],
        funFact: content.funFact,
        ctaText: content.ctaText,
      } as any);
      break;

    case "home_anniversary":
      element = HomeAnniversary({
        ...templateProps,
        address: content.address || "",
        purchaseDate: content.purchaseDate || "",
        years: content.years || 1,
        estimatedValue: content.estimatedValue,
        appreciation: content.appreciation,
        message: content.body,
        tips: content.tips || [],
        ctaText: content.ctaText,
      } as any);
      break;

    default:
      // Fallback: use neighbourhood guide as generic template
      element = NeighbourhoodGuide({
        ...templateProps,
        area: "",
        intro: content.intro || content.body,
        highlights: [],
        ctaText: content.ctaText,
      } as any);
  }

  return await render(element);
}

export async function generateAndQueueNewsletter(
  contactId: string,
  emailType: string,
  journeyPhase: string,
  journeyId?: string,
  sendMode: string = "review"
) {
  const tc = await getAuthenticatedTenantClient();

  // Frequency cap: max 1 email per 24 hours per contact
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const { count: recentCount } = await tc
    .from("newsletters")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .in("status", ["sent", "sending", "draft", "approved"])
    .gte("created_at", oneDayAgo);

  if ((recentCount || 0) >= 2) {
    return { error: "Frequency cap: contact already has 2+ emails in last 24h" };
  }

  // Deduplication: don't send same email type to same contact in same phase within 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count: dupeCount } = await tc
    .from("newsletters")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .eq("email_type", emailType)
    .eq("journey_phase", journeyPhase)
    .in("status", ["sent", "sending", "draft", "approved"])
    .gte("created_at", sevenDaysAgo);

  if ((dupeCount || 0) > 0) {
    return { error: "Duplicate: same email type already sent/queued in last 7 days" };
  }

  // Fetch contact data
  const { data: contact } = await tc
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  // Central CASL + unsubscribe gate — do NOT bypass.
  // See src/lib/compliance/can-send.ts for the rules.
  const sendCheck = canSendToContact(contact);
  if (!sendCheck.allowed) {
    return { error: sendCheck.reason };
  }

  // Fetch relevant listings with full data
  const { data: listings } = await tc
    .from("listings")
    .select("id, address, list_price, status, hero_image_url, bedrooms, bathrooms, square_footage")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5);

  const branding = await getRealtorBranding();

  // Build AI context
  const intelligence = (contact.newsletter_intelligence as any) || {};
  const aiLeadScore = (contact as any).ai_lead_score as Record<string, any> | null;
  const aiContext: NewsletterContext = {
    contact: {
      name: contact.name,
      firstName: contact.name.split(" ")[0],
      type: contact.type as any,
      email: contact.email,
      areas: intelligence.inferred_interests?.areas,
      preferences: contact.buyer_preferences as any,
      engagementScore: intelligence.engagement_score,
      clickHistory: intelligence.click_history?.slice(-5),
      aiHints: aiLeadScore?.personalization_hints,
    },
    realtor: {
      name: branding.name,
      brokerage: branding.brokerage,
      phone: branding.phone,
      email: branding.email,
    },
    listings: listings?.map((l: any) => ({
      address: l.address,
      price: l.list_price || 0,
      beds: (l as any).bedrooms || 0,
      baths: (l as any).bathrooms || 0,
      status: l.status,
      heroImageUrl: l.hero_image_url,
    })),
    emailType,
    journeyPhase,
  };

  // Generate AI content
  const content = await generateNewsletterContent(aiContext);

  // Render HTML
  const html = await renderEmailTemplate(
    emailType,
    content,
    branding,
    contact.name,
    contactId
  );

  // Save newsletter record
  const { data: newsletter, error } = await tc
    .from("newsletters")
    .insert({
      contact_id: contactId,
      template_slug: emailType.replace(/_/g, "-"),
      journey_id: journeyId || null,
      journey_phase: journeyPhase,
      email_type: emailType,
      subject: content.subject,
      html_body: html,
      status: sendMode === "auto" ? "approved" : "draft",
      send_mode: sendMode,
      ai_context: aiContext as any,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Real-time RAG ingestion for the new newsletter
  if (newsletter) triggerIngest("newsletters", newsletter.id);

  // Auto-send if in auto mode
  if (sendMode === "auto" && newsletter) {
    await sendNewsletter(newsletter.id);
  }

  revalidatePath("/newsletters");
  return { data: newsletter };
}

export async function sendNewsletter(newsletterId: string) {
  const tc = await getAuthenticatedTenantClient();

  // Fetch newsletter with full contact data (including buyer_preferences and type)
  const { data: newsletter } = await tc
    .from("newsletters")
    .select("*, contacts(id, email, name, type, buyer_preferences)")
    .eq("id", newsletterId)
    .single();

  if (!newsletter) return { error: "Newsletter not found" };

  const contact = newsletter.contacts as any;
  if (!contact?.email) return { error: "Contact has no email" };

  // Extract buyer preferences for validation pipeline
  const buyerPrefs = (contact.buyer_preferences as Record<string, any>) || {};
  const preferredAreas: string[] = buyerPrefs.areas || buyerPrefs.preferred_areas || [];
  const budgetMin: number | null = buyerPrefs.budget_min || buyerPrefs.min_price || null;
  const budgetMax: number | null = buyerPrefs.budget_max || buyerPrefs.max_price || null;

  // Fetch journey data for trust level and phase
  const { data: journey } = await tc
    .from("contact_journeys")
    .select("current_phase, trust_level")
    .eq("contact_id", contact.id)
    .limit(1)
    .maybeSingle();

  const trustLevel = (journey as any)?.trust_level ?? 0;
  const journeyPhase = journey?.current_phase || newsletter.journey_phase || undefined;

  // Fetch recent subjects for deduplication check
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: recentNewsletters } = await tc
    .from("newsletters")
    .select("subject")
    .eq("contact_id", contact.id)
    .eq("status", "sent")
    .gte("sent_at", sevenDaysAgo)
    .order("sent_at", { ascending: false })
    .limit(5);

  const lastSubjects = recentNewsletters?.map((n: any) => n.subject).filter(Boolean) || [];

  // Capture the current status so we can roll back if needed
  const previousStatus = newsletter.status as string;

  await tc
    .from("newsletters")
    .update({ status: "sending" })
    .eq("id", newsletterId);

  try {
    // ── TEXT PIPELINE — clean and validate content before sending ──
    let finalSubject = newsletter.subject;
    let finalHtml = newsletter.html_body;

    try {
      const { runTextPipeline } = await import("@/lib/text-pipeline");
      const textResult = await runTextPipeline({
        subject: newsletter.subject,
        intro: newsletter.html_body?.replace(/<[^>]*>/g, "").slice(0, 300) || "",
        body: "",
        ctaText: "View Details",
        emailType: newsletter.email_type,
        contactId: contact.id,
        contactName: contact.name,
        contactFirstName: contact.name?.split(" ")[0] || "",
        contactType: contact.type || "buyer",
        contactArea: preferredAreas[0],
        contactBudget: { min: budgetMin || undefined, max: budgetMax || undefined },
        voiceRules: [],
      });

      if (textResult.blocked) {
        await tc.from("newsletters").update({
          status: "failed",
          ai_context: { pipeline_blocked: true, block_reason: textResult.blockReason, warnings: textResult.warnings },
        }).eq("id", newsletterId);
        revalidatePath("/newsletters");
        return { error: `Text pipeline blocked: ${textResult.blockReason}`, action: "blocked" };
      }

      // Apply corrections
      if (textResult.corrections.length > 0) {
        finalSubject = textResult.subject;
        // Store corrections for learning
        await tc.from("newsletters").update({
          ai_context: {
            ...((newsletter.ai_context as object) || {}),
            pipeline_corrections: textResult.corrections,
            pipeline_warnings: textResult.warnings,
          },
        }).eq("id", newsletterId);
      }
    } catch {
      // Don't block sending if pipeline fails
    }

    // ── QUALITY SCORING — rate email before sending ──
    // Skip quality scoring for greeting emails (they're intentionally short & personal)
    const isGreeting = newsletter.email_type?.startsWith("greeting_");
    if (isGreeting) {
      // Greetings bypass quality scoring — they're relationship touches, not marketing emails
    } else try {
      const { scoreEmailQuality, makeQualityDecision, recordQualityOutcome } = await import("@/lib/quality-pipeline");
      const qualityScore = await scoreEmailQuality({
        subject: finalSubject,
        intro: finalHtml?.replace(/<[^>]*>/g, "").slice(0, 200) || "",
        body: "",
        ctaText: "View Details",
        emailType: newsletter.email_type,
        contactName: contact.name,
        contactType: contact.type || "buyer",
        contactArea: preferredAreas[0],
        previousSubjects: lastSubjects,
      });

      const decision = makeQualityDecision(qualityScore);
      await recordQualityOutcome(newsletterId, qualityScore.overall, qualityScore.dimensions);

      if (decision.action === "block") {
        await tc.from("newsletters").update({
          status: "failed",
          quality_score: qualityScore.overall,
          ai_context: {
            ...((newsletter.ai_context as object) || {}),
            quality_blocked: true,
            quality_reason: decision.reason,
            quality_dimensions: qualityScore.dimensions,
            quality_suggestions: qualityScore.suggestions,
          },
        }).eq("id", newsletterId);
        revalidatePath("/newsletters");
        return { error: `Quality check failed (${qualityScore.overall}/10): ${decision.reason}`, action: "blocked" };
      }

      // Auto-regeneration: if score is low, mark for realtor review instead of sending
      if (decision.action === "regenerate") {
        await tc.from("newsletters").update({
          status: "draft", // Keep as draft — realtor should review low-quality emails
          ai_context: {
            ...((newsletter.ai_context as object) || {}),
            quality_warning: true,
            quality_score: qualityScore.overall,
            quality_suggestions: qualityScore.suggestions,
          },
        }).eq("id", newsletterId);
        revalidatePath("/newsletters");
        return { error: `Quality too low (${qualityScore.overall}/10) — kept as draft for review. ${qualityScore.suggestions.join("; ")}`, action: "regenerate" };
      }
    } catch {
      // Don't block sending if quality scoring fails
    }

    const result = await validatedSend({
      newsletterId,
      contactId: contact.id,
      contactName: contact.name,
      contactEmail: contact.email,
      contactType: contact.type || "buyer",
      preferredAreas,
      budgetMin,
      budgetMax,
      subject: finalSubject,
      htmlBody: finalHtml,
      emailType: newsletter.email_type,
      trustLevel,
      lastSubjects,
      journeyPhase,
      skipQualityScore: isGreeting,
    });

    // validatedSend handles status updates for sent/blocked/deferred/regenerate internally.
    // We only need to handle the communications log and rollback for non-sent outcomes.

    if (result.sent) {
      // Log to communications
      await tc.from("communications").insert({
        contact_id: newsletter.contact_id,
        direction: "outbound",
        channel: "email",
        body: `Newsletter: ${newsletter.subject}`,
        newsletter_id: newsletterId,
      });

      revalidatePath("/newsletters");
      return { success: true, messageId: result.messageId };
    }

    // For non-sent results (queued, deferred, blocked, regenerate),
    // validatedSend already updated the newsletter status.
    revalidatePath("/newsletters");
    return {
      error: result.error || `Validation pipeline returned: ${result.action}`,
      action: result.action,
      validationResult: result.validationResult,
    };
  } catch (e) {
    // Roll back status to what it was before we set it to "sending"
    await tc
      .from("newsletters")
      .update({
        status: previousStatus,
        error_message: e instanceof Error ? e.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", newsletterId);

    return { error: e instanceof Error ? e.message : "Send failed" };
  }
}

export async function approveNewsletter(newsletterId: string) {
  const result = await sendNewsletter(newsletterId);
  revalidatePath("/newsletters");
  return result;
}

export async function skipNewsletter(newsletterId: string) {
  const tc = await getAuthenticatedTenantClient();
  await tc
    .from("newsletters")
    .update({ status: "skipped", updated_at: new Date().toISOString() })
    .eq("id", newsletterId);
  revalidatePath("/newsletters");
  return { success: true };
}

export async function getApprovalQueue() {
  const tc = await getAuthenticatedTenantClient();

  const { data } = await tc
    .from("newsletters")
    .select("*, contacts(id, name, email, type)")
    .eq("status", "draft")
    .eq("send_mode", "review")
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getNewsletterAnalytics(days: number = 30) {
  const tc = await getAuthenticatedTenantClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: newsletters } = await tc
    .from("newsletters")
    .select("id, email_type, status, sent_at")
    .eq("status", "sent")
    .gte("sent_at", since);

  const { data: events } = await tc
    .from("newsletter_events")
    .select("event_type, newsletter_id, link_type")
    .gte("created_at", since);

  const sent = newsletters?.length || 0;
  const opens = events?.filter((e: any) => e.event_type === "opened").length || 0;
  const clicks = events?.filter((e: any) => e.event_type === "clicked").length || 0;
  const bounces = events?.filter((e: any) => e.event_type === "bounced").length || 0;
  const unsubscribes = events?.filter((e: any) => e.event_type === "unsubscribed").length || 0;

  // Group by email type
  const byType: Record<string, { sent: number; opens: number; clicks: number }> = {};
  for (const n of newsletters || []) {
    if (!byType[n.email_type]) byType[n.email_type] = { sent: 0, opens: 0, clicks: 0 };
    byType[n.email_type].sent++;
  }
  for (const e of events || []) {
    const newsletter = newsletters?.find((n: any) => n.id === e.newsletter_id);
    if (newsletter && byType[newsletter.email_type]) {
      if (e.event_type === "opened") byType[newsletter.email_type].opens++;
      if (e.event_type === "clicked") byType[newsletter.email_type].clicks++;
    }
  }

  return {
    sent,
    opens,
    clicks,
    bounces,
    unsubscribes,
    openRate: sent ? Math.round((opens / sent) * 100) : 0,
    clickRate: sent ? Math.round((clicks / sent) * 100) : 0,
    byType,
  };
}

export async function bulkApproveNewsletters(ids: string[]) {
  const results = [];
  for (const id of ids) {
    try {
      const result = await sendNewsletter(id);
      results.push({ id, ...result });
    } catch (e) {
      results.push({ id, error: String(e) });
    }
  }
  return { results, sent: results.filter(r => r.success).length, failed: results.filter(r => r.error).length };
}

export async function sendCampaign(emailType: string, recipients: string, subject: string) {
  const tc = await getAuthenticatedTenantClient();

  // Build recipient query based on selection. We fetch all candidate
  // fields needed for the CASL gate (`newsletter_unsubscribed`,
  // `casl_consent_given`) and filter in-memory via filterSendable().
  // The DB filter on newsletter_unsubscribed is kept as a first-pass
  // narrow so we don't pull opted-out rows at all.
  let query = tc
    .from("contacts")
    .select("id, name, email, type, newsletter_unsubscribed, casl_consent_given, casl_consent_date")
    .eq("newsletter_unsubscribed", false)
    .not("email", "is", null);

  switch (recipients) {
    case "all_buyers": query = query.eq("type", "buyer"); break;
    case "all_sellers": query = query.eq("type", "seller"); break;
    case "active_buyers": query = query.eq("type", "buyer").in("stage_bar", ["active_search", "qualified"]); break;
    case "past_clients": query = query.in("stage_bar", ["closed"]); break;
    case "new_leads": query = query.in("lead_status", ["new"]).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()); break;
    // "everyone" — no filter
  }

  const { data: candidates } = await query.limit(500);
  if (!candidates || candidates.length === 0) {
    return { error: "No matching contacts found" };
  }

  // Enforce CASL: drop any contact without consent.
  const { sendable: contacts, skipped } = filterSendable(candidates);

  if (contacts.length === 0) {
    return {
      error:
        `Campaign blocked — ${skipped.length} contacts matched the recipient filter ` +
        `but none have CASL consent. Send an opt-in request first, or narrow the ` +
        `selection to contacts with casl_consent_given=true.`,
    };
  }

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    if (!contact.id) continue; // Type guard — DB rows always have id
    try {
      const result = await generateAndQueueNewsletter(
        contact.id,
        emailType,
        "campaign",
        undefined,
        "auto"
      );
      if (result.data) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  revalidatePath("/newsletters");
  return {
    success: true,
    sent,
    failed,
    total: contacts.length,
    skipped_casl: skipped.length,
  };
}

export async function sendListingBlast(listingId: string, _template: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${appUrl}/api/listings/blast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, sendToAllAgents: true }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Blast failed" };
    revalidatePath("/newsletters");
    return { success: true, sent: data.sent, failed: data.failed };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Blast failed" };
  }
}

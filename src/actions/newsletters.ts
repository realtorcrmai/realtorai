"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { sendEmail } from "@/lib/resend";
import { validatedSend } from "@/lib/validated-send";
import { generateNewsletterContent, NewsletterContext } from "@/lib/newsletter-ai";
import { revalidatePath } from "next/cache";
import { triggerIngest } from "@/lib/rag/realtime-ingest";
import { canSendToContact, filterSendable } from "@/lib/compliance/can-send";
import { trackEvent } from "@/lib/analytics";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";

// Apple-quality block-based email system (SF Pro Display / Inter font stack)
import { assembleEmail, getBrandConfig, type EmailData } from "@/lib/email-blocks";
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
  return buildUnsubscribeUrl(contactId);
}

/**
 * Renders any newsletter type using the Apple-quality block system (email-blocks.ts).
 * Font: SF Pro Display → SF Pro Text → Inter → Helvetica Neue (exact Apple stack).
 * All email types map to one of the block-system template keys.
 */
async function renderEmailTemplate(
  emailType: string,
  content: any,
  branding: RealtorBranding,
  contactName: string,
  contactId: string,
  preferredArea?: string
): Promise<string> {
  const firstName = contactName.split(" ")[0];
  const areaFallback = preferredArea || "your neighbourhood";

  // Map newsletter email types to block-system template keys
  const typeMap: Record<string, string> = {
    new_listing_alert: "listing_alert",
    market_update: "market_update",
    just_sold: "just_sold",
    open_house_invite: "open_house",
    neighbourhood_guide: "neighbourhood_guide",
    home_anniversary: "home_anniversary",
    premium_listing_showcase: "luxury_showcase",
    closing_reminder: "seller_report",
    buyer_guide: "buyer_guide",
    seller_guide: "seller_guide",
    client_testimonial: "just_sold",
    home_value_update: "cma_preview",
    mortgage_renewal_alert: "mortgage_renewal",
    inspection_reminder: "inspection_reminder",
    closing_checklist: "closing_checklist",
    closing_countdown: "closing_countdown",
    referral_ask: "referral",
    referral_thank_you: "referral",
    reengagement: "re_engagement",
    year_in_review: "market_update",
    community_event: "neighbourhood_guide",
    price_drop_alert: "listing_alert",
  };

  const blockType = typeMap[emailType] || "welcome";

  const brandConfig = await getBrandConfig();

  const emailData: EmailData = {
    contact: {
      name: contactName,
      firstName,
      type: content.contactType || "buyer",
    },
    agent: {
      name: branding.name || brandConfig.name,
      brokerage: branding.brokerage || brandConfig.brokerage,
      phone: branding.phone || brandConfig.phone,
      initials: (branding.name || brandConfig.name).split(" ").map((w: string) => w[0]).join("").slice(0, 2),
    },
    content: {
      subject: content.subject || content.title || "",
      intro: content.intro || content.body || "",
      body: content.body || "",
      ctaText: content.ctaText || "Get In Touch",
      ctaUrl: content.ctaUrl || `mailto:${branding.email || ""}`,
    },
    // Listing data (listing_alert, luxury_showcase, open_house, just_sold)
    ...(content.address ? {
      listing: {
        address: content.address,
        area: content.area || content.city || areaFallback,
        price: content.price || content.salePrice || "",
        beds: content.beds,
        baths: content.baths,
        sqft: content.sqft,
        photos: [
          content.heroPhoto || content.photo,
          ...(content.galleryPhotos || []).map((p: any) => typeof p === "string" ? p : p?.url),
        ].filter(Boolean),
        features: (content.features || content.highlights || []).map((f: any) =>
          typeof f === "string" ? { icon: "✓", title: f, desc: "" } : f
        ),
        openHouseDate: content.openHouseDate || content.date,
        openHouseTime: content.openHouseTime || content.time,
      },
    } : {}),
    // Market data (market_update, cma_preview, seller_report)
    ...(content.stats || content.recentSales ? {
      market: {
        avgPrice: content.avgPrice || content.stats?.find((s: { label?: string; value?: unknown }) => s.label?.toLowerCase().includes("price"))?.value,
        avgDom: content.avgDom || content.daysOnMarket,
        inventoryChange: content.inventoryChange,
        recentSales: content.recentSales || [],
        priceComparison: content.priceComparison || (content.currentValue ? {
          listing: content.currentValue,
          average: content.previousValue || "",
          diff: content.changePercent || content.appreciation || "",
        } : undefined),
      },
    } : {}),
    // Anniversary data
    ...(content.purchaseDate || content.estimatedValue ? {
      anniversary: {
        purchasePrice: content.purchasePrice,
        currentEstimate: content.estimatedValue || content.currentValue,
        appreciation: content.appreciation || content.changePercent,
        equityGained: content.equityGained,
        areaHighlights: (content.highlights || []).map((h: any) =>
          typeof h === "string" ? { icon: "📍", text: h } : h
        ),
      },
    } : {}),
    // Testimonial
    ...(content.quote ? {
      testimonial: {
        quote: content.quote,
        name: content.clientName || content.name || "",
        role: content.role || "Client",
      },
    } : {}),
    // Mortgage calculator
    ...(content.monthly || content.currentRate ? {
      mortgageCalc: {
        monthly: content.monthly || "",
        downPayment: content.downPayment || "20%",
        rate: content.currentRate || content.rate || "4.39%",
        details: content.mortgageDetails,
      },
    } : {}),
    // Countdown (closing reminder, inspection)
    ...(content.daysRemaining || content.closingDate ? {
      countdown: {
        value: content.daysRemaining ? `${content.daysRemaining}d` : "",
        label: content.closingDate ? "Until Closing" : "Time Remaining",
        subtext: content.closingDate || content.inspectionDate || content.renewalDate || "",
      },
    } : {}),
    // Listings grid (buyer guide, re-engagement)
    ...(content.listings ? { listings: content.listings } : {}),
    // Social proof
    ...(content.socialProof ? { socialProof: content.socialProof } : {}),
    // Closing checklist — featureList with transaction milestone items
    ...(emailType === "closing_checklist" && !content.address ? {
      listing: {
        address: content.address || content.property || "your property",
        area: content.area || areaFallback,
        price: content.price || "",
        features: content.features?.length ? content.features.map((f: any) =>
          typeof f === "string" ? { icon: "✅", title: f, desc: "" } : f
        ) : [
          { icon: "🚶", title: "Final walkthrough scheduled", desc: "Confirm everything is as agreed" },
          { icon: "💡", title: "Utilities transfer confirmed", desc: "Ensure seamless handover" },
          { icon: "📦", title: "Moving company booked", desc: "Coordinate possession date with movers" },
          { icon: "🔑", title: "Keys and access codes ready", desc: "Garage openers, mailbox, alarm codes" },
          { icon: "📋", title: "Completion documents signed", desc: "All required paperwork executed" },
        ],
      },
    } : {}),
    // Inspection reminder — featureList with review guidance
    ...(emailType === "inspection_reminder" && !content.address ? {
      listing: {
        address: content.address || content.property || "your property",
        area: content.area || areaFallback,
        price: content.price || "",
        features: content.features?.length ? content.features.map((f: any) =>
          typeof f === "string" ? { icon: "🔍", title: f, desc: "" } : f
        ) : [
          { icon: "📄", title: "Review inspection report with your agent", desc: "Identify all items to address" },
          { icon: "⚖️", title: "Prioritize repairs vs. credits", desc: "Decide what to fix vs. negotiate" },
          { icon: "🧾", title: "Request receipts for completed work", desc: "Document all repairs done by seller" },
          { icon: "🏠", title: "Re-inspect major deficiencies", desc: "Verify agreed repairs were completed" },
        ],
      },
    } : {}),
    // Closing countdown — statsRow with days to close
    ...(emailType === "closing_countdown" && !content.stats && !content.recentSales ? {
      market: {
        avgPrice: content.price || content.listPrice || "",
        avgDom: content.daysRemaining ?? undefined,
        inventoryChange: content.closingDate ? `Closing ${content.closingDate}` : undefined,
      },
      countdown: content.countdown || (content.daysRemaining || content.closingDate ? {
        value: content.daysRemaining ? `${content.daysRemaining}` : "",
        label: "Days Until Closing",
        subtext: content.closingDate ? `Possession: ${content.closingDate}` : (content.possessionDate ?? "your closing date"),
      } : undefined),
    } : {}),
    // Mortgage renewal — statsRow for rate comparison
    ...(emailType === "mortgage_renewal_alert" && !content.stats && !content.recentSales && !content.monthly && !content.currentRate ? {
      market: {
        avgPrice: content.currentRate ? `${content.currentRate} current` : undefined,
        avgDom: undefined,
        inventoryChange: content.renewalRate ? `${content.renewalRate} renewal rate` : undefined,
        priceComparison: content.currentRate && content.renewalRate ? {
          listing: content.currentRate,
          average: content.renewalRate,
          diff: content.saving || "potential savings",
        } : undefined,
      },
    } : {}),
    // Referral — no extra data, the personalNote + CTA carries the message
    // (no-op: intro/ctaText from the base content object are sufficient)
  };

  return assembleEmail(blockType, emailData);
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

  if (!contact) {
    console.error('[newsletter] Contact not found for id:', contactId)
    return { error: 'Contact not found' }
  }

  // Central CASL + unsubscribe gate — do NOT bypass.
  // See src/lib/compliance/can-send.ts for the rules.
  const sendCheck = canSendToContact(contact);
  if (!sendCheck.allowed) {
    return { error: sendCheck.reason };
  }

  // Fetch relevant listings with full data
  const { data: listings } = await tc
    .from("listings")
    .select("id, address, list_price, status, hero_image_url")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5);

  const branding = await getRealtorBranding();

  // Build AI context
  const intelligence = (contact.newsletter_intelligence as Record<string, unknown>) || {};
  const aiLeadScore = (contact as unknown as { ai_lead_score?: Record<string, unknown> }).ai_lead_score ?? null;
  const intelligenceInterests = intelligence.inferred_interests as Record<string, unknown> | undefined;
  const aiContext: NewsletterContext = {
    contact: {
      name: contact.name,
      firstName: contact.name.split(" ")[0],
      type: contact.type as any,
      email: contact.email,
      areas: intelligenceInterests?.areas as string[] | undefined,
      preferences: contact.buyer_preferences as NewsletterContext['contact']['preferences'],
      engagementScore: intelligence.engagement_score as number | undefined,
      clickHistory: intelligence.click_history as NewsletterContext['contact']['clickHistory'],
      aiHints: aiLeadScore?.personalization_hints as NewsletterContext['contact']['aiHints'],
    },
    realtor: {
      name: branding.name,
      brokerage: branding.brokerage,
      phone: branding.phone,
      email: branding.email,
    },
    listings: listings?.map((l: { address: string; list_price: number | null; status: string; hero_image_url: string | null }) => ({
      address: l.address,
      price: l.list_price || 0,
      status: l.status,
      heroImageUrl: l.hero_image_url,
    })),
    emailType,
    journeyPhase,
  };

  // Generate AI content
  const content = await generateNewsletterContent(aiContext);

  // Render HTML — pass contact's preferred area for template fallback
  const preferredAreas0 = intelligence.preferred_areas as string[] | undefined;
  const preferredArea = preferredAreas0?.[0]
    || (intelligenceInterests?.areas as string[] | undefined)?.[0]
    || undefined;
  const html = await renderEmailTemplate(
    emailType,
    content,
    branding,
    contact.name,
    contactId,
    preferredArea
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
      ai_context: aiContext as unknown as Record<string, unknown>,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Real-time RAG ingestion and optional auto-send
  if (newsletter) {
    triggerIngest("newsletters", newsletter.id);
    if (sendMode === "auto") await sendNewsletter(newsletter.id);
  }

  revalidatePath("/newsletters");
  return { data: newsletter };
}

export async function sendNewsletter(newsletterId: string) {
  const tc = await getAuthenticatedTenantClient();

  // Fetch newsletter with full contact data (including buyer_preferences and type)
  const { data: newsletter } = await tc
    .from("newsletters")
    .select("*, contacts(id, email, name, type, buyer_preferences, newsletter_intelligence, casl_consent_given, newsletter_unsubscribed)")
    .eq("id", newsletterId)
    .single();

  if (!newsletter) return { error: "Newsletter not found" };

  // Define a typed shape for the contact joined via select()
  type NewsletterContact = {
    id: string;
    email: string | null;
    name: string;
    type: string;
    buyer_preferences: Record<string, unknown> | null;
    newsletter_intelligence: Record<string, unknown> | null;
    casl_consent_given: boolean | null;
    newsletter_unsubscribed: boolean | null;
  };
  const contact = newsletter.contacts as NewsletterContact;
  if (!contact?.email) return { error: "Contact has no email" };

  // H-01: CASL consent gate — never send without explicit consent
  if (!contact.casl_consent_given) {
    console.warn('[newsletter] Skipping send — CASL consent not given for contact:', contact.id);
    await tc.from('newsletters').update({ status: 'skipped', error_message: 'No CASL consent' }).eq('id', newsletterId);
    return { error: 'No CASL consent' };
  }
  if (contact.newsletter_unsubscribed) {
    console.warn('[newsletter] Skipping send — contact is unsubscribed:', contact.id);
    await tc.from('newsletters').update({ status: 'skipped', error_message: 'Contact unsubscribed' }).eq('id', newsletterId);
    return { error: 'Contact unsubscribed' };
  }

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

  const trustLevelLabel = (journey as { trust_level?: string } | null)?.trust_level ?? 'ghost';
  // Map trust level labels to numeric levels (0=ghost, 1=copilot, 2=supervised, 3=autonomous)
  const trustLevelMap: Record<string, number> = { ghost: 0, copilot: 1, supervised: 2, autonomous: 3 };
  const trustLevel = trustLevelMap[trustLevelLabel] ?? 0;
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

  const lastSubjects = recentNewsletters?.map((n: { subject: string | null }) => n.subject).filter((s: string | null): s is string => !!s) || [];

  // ── SEND GOVERNOR — frequency caps + auto-sunset + engagement throttle ──
  try {
    const { checkSendGovernor } = await import("@/lib/send-governor");
    const contactIntel = (contact.newsletter_intelligence as Record<string, unknown>) || {};
    const engagementScore = typeof contactIntel.engagement_score === "number" ? contactIntel.engagement_score : 50;
    const engagementTrend = typeof contactIntel.engagement_trend === "string" ? contactIntel.engagement_trend : "stable";
    const governorResult = await checkSendGovernor({
      contactId: contact.id,
      contactType: contact.type || "buyer",
      journeyPhase: journeyPhase || "lead",
      engagementScore,
      engagementTrend,
      realtorId: tc.realtorId,
    });
    if (!governorResult.allowed) {
      await tc.from("newsletters").update({
        status: "deferred",
        ai_context: {
          ...((newsletter.ai_context as object) || {}),
          governor_blocked: true,
          governor_reason: governorResult.reason,
          governor_suggested_delay_hours: governorResult.suggestedDelay,
          governor_adjustments: governorResult.adjustments,
        },
      }).eq("id", newsletterId);
      revalidatePath("/newsletters");
      return {
        error: `Send deferred by governor: ${governorResult.reason}`,
        action: "deferred",
        suggestedDelay: governorResult.suggestedDelay,
      };
    }
  } catch (governorErr) {
    // Fail open — log warning and continue
    console.warn("[sendNewsletter] send-governor check failed, continuing:", governorErr instanceof Error ? governorErr.message : governorErr);
  }

  // H-03: Atomic: only transition from draft/approved → sending to prevent race conditions
  const { data: claimed, error: claimErr } = await tc
    .from("newsletters")
    .update({ status: "sending" })
    .eq("id", newsletterId)
    .in("status", ["draft", "approved"])
    .select("id, status")
    .single();

  if (claimErr || !claimed) {
    // Another process got here first, or newsletter is already sent/failed
    return { error: "Newsletter already being sent or has invalid status" };
  }

  // Capture the previous status for rollback (we know it was draft or approved)
  const previousStatus = newsletter.status as string;

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
    } catch (textErr) {
      // H-02: Log pipeline errors rather than swallowing silently
      console.error('[newsletter] Text pipeline failed, using raw content:', textErr instanceof Error ? textErr.message : textErr);
      // Continue with raw content rather than crashing
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

      // Fix #5: persist quality score on the newsletter row regardless of outcome
      try {
        await tc
          .from("newsletters")
          .update({
            quality_score: qualityScore.overall,
            quality_checked_at: new Date().toISOString(),
          })
          .eq("id", newsletterId);
      } catch {
        // quality_score column may not exist yet — fail silently
      }

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
    } catch (qualityErr) {
      // H-02: Log quality pipeline errors rather than swallowing silently
      console.error('[newsletter] Quality pipeline failed, continuing with send:', qualityErr instanceof Error ? qualityErr.message : qualityErr);
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
      trackEvent('feature_used', tc.realtorId, { feature: 'newsletters', action: 'send' });

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

/**
 * Edit a newsletter draft's subject/body, then run voice learning
 * to extract writing preferences from the realtor's changes.
 */
export async function editNewsletterDraft(
  newsletterId: string,
  originalSubject: string,
  originalBody: string,
  editedSubject: string,
  editedBody: string
): Promise<{ success: boolean; learnedRules?: string[]; error?: string }> {
  try {
    const tc = await getAuthenticatedTenantClient();
    const realtorId = tc.realtorId;

    // Update the newsletter with edited content
    await tc
      .from("newsletters")
      .update({
        subject: editedSubject,
        html_body: editedBody,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newsletterId);

    // Run voice learning to extract writing preferences
    const { extractVoiceRules } = await import("@/lib/voice-learning");
    const learnedRules = await extractVoiceRules(
      realtorId,
      originalSubject,
      originalBody,
      editedSubject,
      editedBody
    );

    revalidatePath("/newsletters");
    revalidatePath("/newsletters/queue");
    return { success: true, learnedRules };
  } catch (e) {
    console.error("Edit newsletter draft error:", e);
    return { success: false, error: e instanceof Error ? e.message : "Edit failed" };
  }
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
  const opens = events?.filter((e: { event_type: string }) => e.event_type === "opened").length || 0;
  const clicks = events?.filter((e: { event_type: string }) => e.event_type === "clicked").length || 0;
  const bounces = events?.filter((e: { event_type: string }) => e.event_type === "bounced").length || 0;
  const unsubscribes = events?.filter((e: { event_type: string }) => e.event_type === "unsubscribed").length || 0;

  // Group by email type
  const byType: Record<string, { sent: number; opens: number; clicks: number }> = {};
  for (const n of newsletters || []) {
    if (!byType[n.email_type]) byType[n.email_type] = { sent: 0, opens: 0, clicks: 0 };
    byType[n.email_type].sent++;
  }
  for (const e of events || []) {
    const newsletter = newsletters?.find((n: { id: string; email_type: string }) => n.id === e.newsletter_id);
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production'
    ? (() => { console.error('[newsletter] NEXT_PUBLIC_APP_URL not set in production!'); return 'https://realtors360.ai'; })()
    : 'http://localhost:3000');
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

/**
 * Approve an agent draft — sets status to 'approved'.
 * Called from the /newsletters/queue page for agent_drafts with pending_review status.
 */
export async function approveDraft(draftId: string) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("agent_drafts")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("status", "pending_review");

  if (error) return { error: error.message };

  revalidatePath("/newsletters/queue");
  revalidatePath("/newsletters/agent");
  return { success: true };
}

/**
 * Reject an agent draft — sets status to 'rejected'.
 * Called from the /newsletters/queue page for agent_drafts with pending_review status.
 */
export async function rejectDraft(draftId: string) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("agent_drafts")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("status", "pending_review");

  if (error) return { error: error.message };

  revalidatePath("/newsletters/queue");
  revalidatePath("/newsletters/agent");
  return { success: true };
}

/**
 * Fetch email history for a specific contact — all newsletters with their events.
 * Used on the contact detail "Emails" tab.
 */
export async function getContactEmailHistory(contactId: string) {
  const tc = await getAuthenticatedTenantClient();

  const { data: newsletters, error } = await tc
    .from("newsletters")
    .select("id, subject, email_type, status, html_body, sent_at, created_at, quality_score, ai_context")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) return { newsletters: [], stats: { total: 0, sent: 0, opened: 0, clicked: 0, bounced: 0, openRate: 0, clickRate: 0 } };

  if (!newsletters || newsletters.length === 0) {
    return { newsletters: [], stats: { total: 0, sent: 0, opened: 0, clicked: 0, bounced: 0, openRate: 0, clickRate: 0 } };
  }

  // Fetch events for all these newsletters in one query
  type EvtRow = { id: string; newsletter_id: string; event_type: string; metadata: Record<string, unknown> | null; created_at: string };
  const newsletterIds = (newsletters as { id: string }[]).map((n) => n.id);
  const { data: events } = await tc
    .from("newsletter_events")
    .select("id, newsletter_id, event_type, metadata, created_at")
    .in("newsletter_id", newsletterIds)
    .order("created_at", { ascending: false });

  // Group events by newsletter_id
  const eventsByNewsletter: Record<string, EvtRow[]> = {};
  for (const event of (events ?? []) as EvtRow[]) {
    if (!eventsByNewsletter[event.newsletter_id]) {
      eventsByNewsletter[event.newsletter_id] = [];
    }
    eventsByNewsletter[event.newsletter_id]!.push(event);
  }

  // Merge events into newsletters
  const enriched = (newsletters as Array<{ id: string; status: string; [k: string]: unknown }>).map((nl) => ({
    ...nl,
    events: eventsByNewsletter[nl.id] ?? ([] as EvtRow[]),
  }));

  // Compute summary stats
  const totalSent = enriched.filter((n) => n.status === "sent").length;
  const totalOpened = enriched.filter((n) =>
    n.events.some((e: EvtRow) => e.event_type === "opened")
  ).length;
  const totalClicked = enriched.filter((n) =>
    n.events.some((e: EvtRow) => e.event_type === "clicked")
  ).length;
  const totalBounced = enriched.filter((n) =>
    n.events.some((e: EvtRow) => e.event_type === "bounced")
  ).length;

  return {
    newsletters: enriched,
    stats: {
      total: enriched.length,
      sent: totalSent,
      opened: totalOpened,
      clicked: totalClicked,
      bounced: totalBounced,
      openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
      clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
    },
  };
}

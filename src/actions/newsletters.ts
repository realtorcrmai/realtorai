"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { generateNewsletterContent, NewsletterContext } from "@/lib/newsletter-ai";
import { render } from "@react-email/components";
import { revalidatePath } from "next/cache";

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
  const supabase = createAdminClient();

  // Fetch contact data
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (!contact || !contact.email) {
    return { error: "Contact not found or has no email" };
  }

  if (contact.newsletter_unsubscribed) {
    return { error: "Contact is unsubscribed" };
  }

  // Fetch relevant listings for the contact's area
  const { data: listings } = await supabase
    .from("listings")
    .select("address, list_price, status, hero_image_url")
    .eq("status", "active")
    .limit(5);

  const branding = await getRealtorBranding();

  // Build AI context
  const intelligence = (contact.newsletter_intelligence as any) || {};
  const aiContext: NewsletterContext = {
    contact: {
      name: contact.name,
      firstName: contact.name.split(" ")[0],
      type: contact.type as "buyer" | "seller",
      email: contact.email,
      areas: intelligence.inferred_interests?.areas,
      preferences: contact.buyer_preferences as any,
      engagementScore: intelligence.engagement_score,
      clickHistory: intelligence.click_history?.slice(-5),
    },
    realtor: {
      name: branding.name,
      brokerage: branding.brokerage,
      phone: branding.phone,
      email: branding.email,
    },
    listings: listings?.map(l => ({
      address: l.address,
      price: l.list_price || 0,
      beds: 0,
      baths: 0,
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
  const { data: newsletter, error } = await supabase
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

  // Auto-send if in auto mode
  if (sendMode === "auto" && newsletter) {
    await sendNewsletter(newsletter.id);
  }

  revalidatePath("/newsletters");
  return { data: newsletter };
}

export async function sendNewsletter(newsletterId: string) {
  const supabase = createAdminClient();

  const { data: newsletter } = await supabase
    .from("newsletters")
    .select("*, contacts(email, name)")
    .eq("id", newsletterId)
    .single();

  if (!newsletter) return { error: "Newsletter not found" };

  const contact = newsletter.contacts as any;
  if (!contact?.email) return { error: "Contact has no email" };

  try {
    await supabase
      .from("newsletters")
      .update({ status: "sending" })
      .eq("id", newsletterId);

    const { messageId } = await sendEmail({
      to: contact.email,
      subject: newsletter.subject,
      html: newsletter.html_body,
      tags: [
        { name: "newsletter_id", value: newsletterId },
        { name: "email_type", value: newsletter.email_type },
        { name: "journey_phase", value: newsletter.journey_phase || "" },
      ],
    });

    await supabase
      .from("newsletters")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        resend_message_id: messageId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newsletterId);

    // Log to communications
    await supabase.from("communications").insert({
      contact_id: newsletter.contact_id,
      direction: "outbound",
      channel: "email",
      body: `Newsletter: ${newsletter.subject}`,
      newsletter_id: newsletterId,
    });

    revalidatePath("/newsletters");
    return { success: true, messageId };
  } catch (e) {
    await supabase
      .from("newsletters")
      .update({
        status: "failed",
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
  const supabase = createAdminClient();
  await supabase
    .from("newsletters")
    .update({ status: "skipped", updated_at: new Date().toISOString() })
    .eq("id", newsletterId);
  revalidatePath("/newsletters");
  return { success: true };
}

export async function getApprovalQueue() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("newsletters")
    .select("*, contacts(id, name, email, type)")
    .eq("status", "draft")
    .eq("send_mode", "review")
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getNewsletterAnalytics(days: number = 30) {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: newsletters } = await supabase
    .from("newsletters")
    .select("id, email_type, status, sent_at")
    .eq("status", "sent")
    .gte("sent_at", since);

  const { data: events } = await supabase
    .from("newsletter_events")
    .select("event_type, newsletter_id, link_type")
    .gte("created_at", since);

  const sent = newsletters?.length || 0;
  const opens = events?.filter(e => e.event_type === "opened").length || 0;
  const clicks = events?.filter(e => e.event_type === "clicked").length || 0;
  const bounces = events?.filter(e => e.event_type === "bounced").length || 0;
  const unsubscribes = events?.filter(e => e.event_type === "unsubscribed").length || 0;

  // Group by email type
  const byType: Record<string, { sent: number; opens: number; clicks: number }> = {};
  for (const n of newsletters || []) {
    if (!byType[n.email_type]) byType[n.email_type] = { sent: 0, opens: 0, clicks: 0 };
    byType[n.email_type].sent++;
  }
  for (const e of events || []) {
    const newsletter = newsletters?.find(n => n.id === e.newsletter_id);
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

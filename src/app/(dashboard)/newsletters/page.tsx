export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getUserFeatures } from "@/lib/features";
import { getJourneyDashboard } from "@/actions/journeys";
import { getApprovalQueue } from "@/actions/newsletters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmailMarketingTabs } from "@/components/newsletters/EmailMarketingTabs";
import { CampaignsTab } from "@/components/newsletters/CampaignsTab";
import { AIWorkingForYou } from "@/components/newsletters/AIWorkingForYou";
import { ListingBlastAutomation } from "@/components/newsletters/ListingBlastAutomation";
import { GreetingAutomations } from "@/components/newsletters/GreetingAutomations";
import { sendNewsletter, skipNewsletter, bulkApproveNewsletters, sendListingBlast, sendCampaign } from "@/actions/newsletters";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { WORKFLOW_BLUEPRINTS } from "@/lib/constants";
import { JOURNEY_SCHEDULES } from "@/lib/constants/journey-schedules";
import { TEMPLATE_REGISTRY } from "@/lib/constants/template-registry";
import { assembleEmail } from "@/lib/email-blocks";
import type { RealtorBranding } from "@/emails/BaseLayout";
import { getRealtorConfig, getAutomationRules, getGreetingRules } from "@/actions/config";
import { getBrandProfile } from "@/actions/brand-profile";
import { AIAgentQueue } from "@/components/newsletters/AIAgentQueue";
import { WhatWentOutFeed } from "@/components/newsletters/WhatWentOutFeed";
import { JourneyScheduleCard } from "@/components/newsletters/JourneyScheduleCard";
import { NurturePipelineCard, type NurturedContact } from "@/components/newsletters/NurturePipelineCard";
import { UpcomingSendsCard } from "@/components/newsletters/UpcomingSendsCard";
import { AIInsightsTab, type AIInsightsData } from "@/components/newsletters/AIInsightsTab";
import { getABTests } from "@/actions/editorial";

export default async function NewsletterDashboard() {
  const session = await auth();
  const tc = await getAuthenticatedTenantClient();

  // Read features fresh from DB on every request — JWT is cached up to 1hr
  // so session.user.enabledFeatures can be stale after admin changes.
  const { data: freshUser } = await tc
    .from("users")
    .select("plan, enabled_features")
    .eq("id", session?.user?.id ?? "")
    .single();
  const enabledFeatures = getUserFeatures(
    (freshUser?.plan as string) ?? "free",
    freshUser?.enabled_features as string[] | null,
  );
  const hasAutomations = enabledFeatures.includes("automations");
  const [dashboard, queue, realtorConfig, , greetingRules, abTestsResult] = await Promise.all([
    getJourneyDashboard(),
    getApprovalQueue(),
    getRealtorConfig(),
    getAutomationRules(),
    getGreetingRules(),
    getABTests(),
  ]);

  const _now = Date.now();
  const sevenDaysFromNow = new Date(_now + 7 * 86400000).toISOString();

  const [
    { data: journeys },
    { data: workflows },
    { data: listings },
    { data: hotLeadsRaw },
    { data: sentRaw },
    { data: upcomingJourneys },
    { data: recentBlastsRaw },
  ] = await Promise.all([
    tc.from("contact_journeys").select("id, contact_id, journey_type, current_phase, is_paused, next_email_at, emails_sent_in_phase, send_mode, phase_entered_at, contacts(id, name, type, email, newsletter_intelligence)").order("created_at", { ascending: false }),
    tc.from("workflows").select("id, name, slug, description, is_active, trigger_type, contact_type, workflow_steps(id)").order("name"),
    tc.from("listings").select("id, address, list_price, status").eq("status", "active").order("created_at", { ascending: false }).limit(10),
    tc.from("contacts").select("id, name, phone, type, newsletter_intelligence").not("newsletter_intelligence", "is", null).order("created_at", { ascending: false }).limit(50),
    tc.from("newsletters").select("id, subject, email_type, status, sent_at, contact_id, html_body, ai_context, contacts(name, type), newsletter_events(event_type, metadata, created_at)").eq("status", "sent").order("sent_at", { ascending: false }).limit(20),
    tc.from("contact_journeys").select("id, contact_id, journey_type, current_phase, next_email_at, emails_sent_in_phase, contacts(name, type)").eq("is_paused", false).not("next_email_at", "is", null).gte("next_email_at", new Date().toISOString()).lte("next_email_at", sevenDaysFromNow).order("next_email_at").limit(50),
    tc.from("newsletters").select("id, subject, email_type, status, sent_at, contact_id, created_at, contacts(name, type), newsletter_events(event_type)").in("email_type", ["listing_blast", "campaign", "listing_alert"]).eq("status", "sent").order("created_at", { ascending: false }).limit(10),
  ]);

  // Hot leads
  const hotLeads = (hotLeadsRaw || []).filter((c: any) => {
    const score = c.newsletter_intelligence?.engagement_score;
    return typeof score === "number" && score >= 60;
  }).sort((a: any, b: any) => (b.newsletter_intelligence?.engagement_score || 0) - (a.newsletter_intelligence?.engagement_score || 0));
  const hotBuyers = hotLeads.filter((c: any) => c.type === "buyer" || c.type === "customer");
  const hotSellers = hotLeads.filter((c: any) => c.type === "seller");

  const allContacts = hotLeadsRaw || [];
  const warmContacts = allContacts.filter((c: any) => { const s = c.newsletter_intelligence?.engagement_score || 0; return s >= 30 && s < 60; });
  const coolingContacts = allContacts.filter((c: any) => { const s = c.newsletter_intelligence?.engagement_score || 0; return s >= 15 && s < 30; });
  const dormantContacts = allContacts.filter((c: any) => (c.newsletter_intelligence?.engagement_score || 0) < 15);

  // Sent newsletters for AI tab
  const sentNewsletters = (sentRaw || []).map((nl: any) => ({ ...nl, events: nl.newsletter_events || [] }));

  // Unified "What went out" feed — read-only union across all email systems
  const whatWentOut = sentNewsletters.map((nl: any) => {
    const contact = Array.isArray(nl.contacts) ? nl.contacts[0] : nl.contacts;
    const aiContext = nl.ai_context as Record<string, unknown> | null;
    const source = aiContext?.source === "workflow" ? "workflow"
      : aiContext?.source === "editorial" ? "editorial"
      : nl.email_type === "greeting" ? "greeting"
      : "ai_nurture";
    const hasClick = nl.events?.some((e: any) => e.event_type === "clicked");
    const hasOpen = nl.events?.some((e: any) => e.event_type === "opened");
    const openCount = nl.events?.filter((e: any) => e.event_type === "opened").length || 0;
    const clickCount = nl.events?.filter((e: any) => e.event_type === "clicked").length || 0;
    return {
      id: nl.id,
      contact_id: nl.contact_id,
      contact_name: contact?.name || "Unknown",
      contact_type: contact?.type || "buyer",
      subject: nl.subject || "(no subject)",
      email_type: nl.email_type || "email",
      source,
      sent_at: nl.sent_at,
      status: hasClick ? "clicked" : hasOpen ? "opened" : "sent",
      html_body: nl.html_body || null,
      open_count: openCount,
      click_count: clickCount,
    };
  });

  // AI success stories
  const successStories: Array<{ contactId: string; contactName: string; contactType: string; icon: string; story: string; score?: number }> = [];
  const phaseLabelsMap: Record<string, string> = { lead: "Lead", active: "Active", under_contract: "Under Contract", past_client: "Past Client", dormant: "Dormant" };

  for (const lead of hotLeads.slice(0, 2)) {
    const intel = lead.newsletter_intelligence;
    const clicks = intel?.total_clicks || 0;
    const opens = intel?.total_opens || 0;
    const interests = intel?.inferred_interests?.areas?.join(", ") || "";
    const score = intel?.engagement_score || 0;
    if (opens > 0) {
      successStories.push({ contactId: lead.id, contactName: lead.name, contactType: lead.type, icon: "🔥", story: `Opened ${opens} emails, clicked ${clicks} links${interests ? ` — interested in ${interests}` : ""}`, score });
    }
  }
  for (const j of (journeys || [])) {
    if (successStories.length >= 4) break;
    if (j.current_phase === "active" || j.current_phase === "under_contract") {
      const contact = Array.isArray(j.contacts) ? j.contacts[0] : j.contacts;
      if (!contact || successStories.some((s) => s.contactId === j.contact_id)) continue;
      const found = allContacts.find((c: any) => c.id === j.contact_id);
      const score = found?.newsletter_intelligence?.engagement_score;
      successStories.push({ contactId: j.contact_id, contactName: contact.name, contactType: contact.type, icon: j.current_phase === "under_contract" ? "📝" : "📈", story: `AI nurtured from Lead → ${phaseLabelsMap[j.current_phase]}${typeof score === "number" ? ` · engagement score ${score}` : ""}`, score });
    }
  }
  for (const nl of sentNewsletters) {
    if (successStories.length >= 5) break;
    const clicks = nl.events?.filter((e: any) => e.event_type === "clicked").length || 0;
    if (clicks === 0) continue;
    const contact = Array.isArray(nl.contacts) ? nl.contacts[0] : nl.contacts;
    if (!contact || successStories.some((s) => s.contactId === nl.contact_id)) continue;
    successStories.push({ contactId: nl.contact_id, contactName: contact.name, contactType: contact.type, icon: "⚡", story: `Clicked ${clicks} link${clicks > 1 ? "s" : ""} in "${nl.subject}"` });
  }

  // Upcoming sends
  const upcomingSendsMap: Record<string, { date: string; label: string; emailType: string; count: number }> = {};
  for (const uj of (upcomingJourneys || [])) {
    if (!uj.next_email_at) continue;
    const d = new Date(uj.next_email_at);
    const dateKey = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const isToday = d.toDateString() === new Date().toDateString();
    const isTomorrow = d.toDateString() === new Date(_now + 86400000).toDateString();
    const label = isToday ? "Today" : isTomorrow ? "Tomorrow" : dateKey;
    const jType = uj.journey_type as keyof typeof JOURNEY_SCHEDULES;
    const jPhase = uj.current_phase as string;
    const jSchedule = JOURNEY_SCHEDULES[jType]?.[jPhase as keyof (typeof JOURNEY_SCHEDULES)[typeof jType]] || [];
    const jIndex = uj.emails_sent_in_phase || 0;
    const emailType = jIndex < jSchedule.length ? jSchedule[jIndex].emailType : "email";
    const groupKey = `${dateKey}_${emailType}`;
    if (!upcomingSendsMap[groupKey]) upcomingSendsMap[groupKey] = { date: label, label: `to ${uj.journey_type} contacts`, emailType, count: 0 };
    upcomingSendsMap[groupKey].count++;
  }
  const upcomingSends = Object.values(upcomingSendsMap).slice(0, 5);

  // Detailed per-contact schedule for the AI tab — projects the full remaining
  // email sequence for each contact based on JOURNEY_SCHEDULES delay hours.
  const scheduledEmails: Array<{
    id: string; contactId: string; contactName: string; contactType: string;
    emailType: string; scheduledAt: string; phase: string;
  }> = [];

  for (const uj of (upcomingJourneys || [])) {
    if (!uj.next_email_at) continue;
    const contact = Array.isArray(uj.contacts) ? uj.contacts[0] : uj.contacts;
    const jType = uj.journey_type as keyof typeof JOURNEY_SCHEDULES;
    const phase = uj.current_phase as string;
    const schedule = JOURNEY_SCHEDULES[jType]?.[phase as keyof (typeof JOURNEY_SCHEDULES)[typeof jType]] || [];
    const emailIndex = uj.emails_sent_in_phase || 0;

    // Project remaining emails in this phase
    const baseTime = new Date(uj.next_email_at).getTime();
    for (let i = emailIndex; i < schedule.length; i++) {
      const step = schedule[i];
      // First remaining email uses next_email_at directly; subsequent ones offset from it
      const offsetMs = i === emailIndex ? 0 : (step.delayHours - schedule[emailIndex].delayHours) * 3600000;
      const sendTime = new Date(baseTime + offsetMs);

      // Only include future dates within 30 days
      if (sendTime.getTime() < Date.now()) continue;
      if (sendTime.getTime() > Date.now() + 30 * 86400000) break;

      scheduledEmails.push({
        id: `${uj.id}-${i}`,
        contactId: uj.contact_id,
        contactName: contact?.name || "Unknown",
        contactType: contact?.type || uj.journey_type || "buyer",
        emailType: step.emailType,
        scheduledAt: sendTime.toISOString(),
        phase,
      });
    }
  }

  scheduledEmails.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const scheduledEmailsTruncated = scheduledEmails.slice(0, 30);

  // Pre-render template previews for upcoming email types
  const brandProfile = await getBrandProfile();
  const previewBranding: RealtorBranding = {
    name: brandProfile?.display_name || session?.user?.name || "Your Name",
    title: brandProfile?.title || "REALTOR\u00ae",
    brokerage: brandProfile?.brokerage_name || "",
    phone: brandProfile?.phone || "",
    email: brandProfile?.email || "",
    headshotUrl: brandProfile?.headshot_url || undefined,
    logoUrl: brandProfile?.logo_url || undefined,
    accentColor: brandProfile?.brand_color || "#4f35d2",
    physicalAddress: brandProfile?.physical_address || "",
    socialLinks: {
      instagram: brandProfile?.instagram_url || undefined,
      facebook: brandProfile?.facebook_url || undefined,
      linkedin: brandProfile?.linkedin_url || undefined,
    },
  };
  const upcomingEmailTypes = [...new Set(scheduledEmailsTruncated.map(e => e.emailType))];
  const templatePreviews: Record<string, string> = {};
  for (const emailType of upcomingEmailTypes) {
    const entry = TEMPLATE_REGISTRY[emailType];
    if (!entry) continue;
    try {
      const data = entry.sampleData(previewBranding);
      templatePreviews[emailType] = assembleEmail(entry.blockType, data as any);
    } catch { /* skip if render fails */ }
  }

  // Pipeline — build detailed contact list for NurturePipelineCard
  const nurturedContacts: NurturedContact[] = (journeys || []).map((j: any) => {
    const c = Array.isArray(j.contacts) ? j.contacts[0] : j.contacts;
    const intel = c?.newsletter_intelligence as Record<string, unknown> | null;
    return {
      journeyId: j.id,
      contactId: j.contact_id,
      contactName: c?.name || "Unknown",
      contactEmail: c?.email || null,
      contactType: c?.type || j.journey_type || "buyer",
      journeyType: j.journey_type,
      phase: j.current_phase,
      phaseEnteredAt: j.phase_entered_at || null,
      emailsSent: j.emails_sent_in_phase || 0,
      nextEmailAt: j.next_email_at || null,
      isPaused: j.is_paused || false,
      sendMode: j.send_mode || "review",
      engagementScore: typeof intel?.engagement_score === "number" ? intel.engagement_score : null,
    };
  });

  const phases = ["lead", "active", "under_contract", "past_client", "dormant"];

  // Campaigns tab blast history
  const realBlastHistory = (recentBlastsRaw || []).map((nl: any) => {
    const events = nl.newsletter_events || [];
    return { id: nl.id, listing_address: nl.subject?.replace(/^NEW LISTING:\s*/i, "").split("—")[0]?.trim() || nl.subject || "Campaign", listing_price: null, template: nl.email_type?.replace(/_/g, " ") || "Campaign", recipients: 1, sent_at: nl.sent_at || nl.created_at, opens: events.filter((e: any) => e.event_type === "opened").length, clicks: events.filter((e: any) => e.event_type === "clicked").length, replies: 0 };
  });

  // Workflows for automations tab
  const blueprintsBySlug: Record<string, { icon: string }> = {};
  for (const bp of WORKFLOW_BLUEPRINTS) blueprintsBySlug[bp.slug] = bp;
  const workflowList = workflows || [];

  // AI Insights tab data
  const agentConfig = realtorConfig as Record<string, unknown> | null;
  const voiceRules: Array<{ rule: string; source?: string }> = Array.isArray(agentConfig?.voice_rules)
    ? (agentConfig.voice_rules as string[]).map(r => ({ rule: r, source: "edit" }))
    : [];

  // Quality scores from sent newsletters
  const scoredEmails = sentNewsletters.filter((nl: any) => typeof nl.quality_score === "number" && nl.quality_score > 0);
  const qualityScores = scoredEmails.map((nl: any) => nl.quality_score as number);
  const avgQuality = qualityScores.length > 0 ? qualityScores.reduce((a: number, b: number) => a + b, 0) / qualityScores.length : 0;

  // Trust distribution from journeys
  const trustDist = { l0: 0, l1: 0, l2: 0, l3: 0 };
  for (const j of (journeys || [])) {
    const tl = (j as any).trust_level ?? 0;
    if (tl >= 3) trustDist.l3++;
    else if (tl >= 2) trustDist.l2++;
    else if (tl >= 1) trustDist.l1++;
    else trustDist.l0++;
  }

  // Governor activity from deferred/failed newsletters
  const governorBlocked = sentNewsletters.filter((nl: any) => (nl.ai_context as any)?.governor_blocked).length;
  const governorDeferred = sentNewsletters.filter((nl: any) => nl.status === "deferred").length;

  const aiInsightsData: AIInsightsData = {
    voiceRules,
    abTests: (abTestsResult?.data || []).map((t: any) => ({
      id: t.id, title: t.title, status: t.status,
      subject_a: t.subject_a, subject_b: t.subject_b, ab_winner: t.ab_winner,
    })),
    quality: {
      avgScore: avgQuality,
      totalScored: scoredEmails.length,
      highQuality: qualityScores.filter((s: number) => s >= 7).length,
      lowQuality: qualityScores.filter((s: number) => s < 5).length,
    },
    sendTime: {
      bestDay: (agentConfig?.default_send_day as string) || null,
      bestHour: typeof agentConfig?.default_send_hour === "number" ? agentConfig.default_send_hour : null,
    },
    trust: trustDist,
    governor: {
      blocked: governorBlocked,
      deferred: governorDeferred,
      autoSunset: (journeys || []).filter((j: any) => j.is_paused && j.pause_reason === "auto_sunset").length,
    },
    learningConfidence: voiceRules.length >= 10 ? "high" : voiceRules.length >= 3 ? "medium" : "low",
    totalEmailsAnalyzed: dashboard.totalSent,
    engagement: buildEngagementOverview(allContacts, sentNewsletters),
  };

  function buildEngagementOverview(contacts: any[], newsletters: any[]) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    // Heatmap: for each contact with engagement, calculate 7-day activity
    const heatmapContacts = contacts
      .filter((c: any) => c.newsletter_intelligence?.engagement_score > 0)
      .sort((a: any, b: any) => (b.newsletter_intelligence?.engagement_score || 0) - (a.newsletter_intelligence?.engagement_score || 0))
      .slice(0, 10)
      .map((c: any) => {
        const intel = c.newsletter_intelligence || {};
        // Build 7 day slots (Mon=0 to Sun=6) based on timing patterns
        const days = [0, 0, 0, 0, 0, 0, 0];
        // Use last_opened_at and last_clicked_at to estimate recent activity
        if (intel.last_clicked_at && new Date(intel.last_clicked_at) >= sevenDaysAgo) {
          const dayIdx = new Date(intel.last_clicked_at).getDay();
          const mappedDay = dayIdx === 0 ? 6 : dayIdx - 1; // Sun=6, Mon=0
          days[mappedDay] = 3;
        }
        if (intel.last_opened_at && new Date(intel.last_opened_at) >= sevenDaysAgo) {
          const dayIdx = new Date(intel.last_opened_at).getDay();
          const mappedDay = dayIdx === 0 ? 6 : dayIdx - 1;
          if (days[mappedDay] < 2) days[mappedDay] = 2;
        }
        if (intel.last_engagement_at && new Date(intel.last_engagement_at) >= sevenDaysAgo) {
          const dayIdx = new Date(intel.last_engagement_at).getDay();
          const mappedDay = dayIdx === 0 ? 6 : dayIdx - 1;
          if (days[mappedDay] < 1) days[mappedDay] = 1;
        }
        return { name: c.name, contactId: c.id, type: c.type, days };
      });

    // Trending: contacts with notable score changes (use engagement_trend field)
    const trending = contacts
      .filter((c: any) => {
        const intel = c.newsletter_intelligence;
        return intel?.engagement_score > 0 && intel?.engagement_trend && intel.engagement_trend !== "stable";
      })
      .map((c: any) => {
        const intel = c.newsletter_intelligence;
        const delta = intel.engagement_trend === "accelerating" ? Math.round(intel.engagement_score * 0.15) :
                      intel.engagement_trend === "declining" ? -Math.round(intel.engagement_score * 0.1) : 0;
        return { name: c.name, contactId: c.id, type: c.type, scoreDelta: delta, currentScore: intel.engagement_score };
      })
      .sort((a: any, b: any) => Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta))
      .slice(0, 6);

    // Top clicked link categories from newsletter events
    const linkCategories: Record<string, { icon: string; clicks: number }> = {};
    for (const nl of newsletters) {
      for (const ev of (nl.events || [])) {
        if (ev.event_type !== "clicked") continue;
        const meta = ev.metadata as Record<string, unknown> | null;
        const linkType = (meta?.link_type as string) || (meta?.category as string) || "other";
        const icons: Record<string, string> = {
          listing: "🏠", showing: "📅", cma: "📊", contact_agent: "📞",
          market_report: "📈", neighbourhood: "🏘️", mortgage: "🏦", other: "🔗",
        };
        if (!linkCategories[linkType]) linkCategories[linkType] = { icon: icons[linkType] || "🔗", clicks: 0 };
        linkCategories[linkType].clicks++;
      }
    }
    const topLinks = Object.entries(linkCategories)
      .map(([category, data]) => ({ category: category.replace(/_/g, " "), icon: data.icon, clicks: data.clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 6);

    // Alerts: unsubscribed or bounced contacts (recent)
    const alerts = contacts
      .filter((c: any) => c.newsletter_unsubscribed || (c.newsletter_intelligence?.bounce_count > 0))
      .map((c: any) => ({
        contactName: c.name,
        contactId: c.id,
        type: c.newsletter_unsubscribed ? "unsubscribe" as const :
              (c.newsletter_intelligence?.complaint_count > 0 ? "complaint" as const : "bounce" as const),
        date: c.newsletter_intelligence?.last_engagement_at || c.updated_at || new Date().toISOString(),
      }))
      .slice(0, 5);

    return { heatmap: heatmapContacts, trending, topLinks, alerts };
  }

  return (
    <>
      <PageHeader
        title="Email Marketing"
        subtitle="AI sends emails to your contacts automatically"
        actions={
          <div className="flex items-center gap-2">
            <a href="/newsletters/campaigns" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border">
              📢 Campaigns
            </a>
            <a href="/newsletters/templates" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border">
              📋 Templates
            </a>
            <a href="/newsletters/settings" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border">
              ⚙️ Settings
            </a>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <EmailMarketingTabs queueCount={queue.length}>
          {{
            /* ══════════════════════════════
               AI TAB
               Stat bar → Hot leads → Queue → Pipeline → Sent history
            ══════════════════════════════ */
            ai: (
              <div className="space-y-4">

                {/* Stat bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">📧 {dashboard.totalSent} sent</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">📬 {dashboard.openRate}% open rate</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">🖱️ {dashboard.clickRate}% click rate</span>
                  {hotLeads.length > 0 && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">🔥 {hotLeads.length} hot leads</span>}
                  {warmContacts.length > 0 && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">🌡️ {warmContacts.length} warm</span>}
                  {(coolingContacts.length + dormantContacts.length) > 0 && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">❄️ {coolingContacts.length + dormantContacts.length} cold</span>}
                </div>

                {/* Hot leads — act now */}
                {hotLeads.length > 0 && (() => {
                  const urgent = [...hotBuyers, ...hotSellers]
                    .sort((a: any, b: any) => (b.newsletter_intelligence?.engagement_score || 0) - (a.newsletter_intelligence?.engagement_score || 0))
                    .slice(0, 4);
                  return (
                    <Card className="border-red-200 bg-red-50/40">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-red-800">🚨 Act now — these leads are hot</p>
                          <Badge variant="destructive" className="text-[10px]">{urgent.length} ready</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {urgent.map((c: any) => {
                            const score = c.newsletter_intelligence?.engagement_score || 0;
                            const lastClicked = c.newsletter_intelligence?.last_clicked;
                            const daysSince = lastClicked ? Math.floor((_now - new Date(lastClicked).getTime()) / 86400000) : null;
                            const isBuyer = c.type === "buyer" || c.type === "customer";
                            return (
                              <div key={c.id} className="flex items-center justify-between p-2.5 bg-white/80 rounded-lg border border-red-100">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${isBuyer ? "from-rose-500 to-blue-500" : "from-blue-500 to-rose-500"} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                                    {(c.name || "?")[0]}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold truncate">{c.name}</p>
                                    <p className="text-[10px] text-muted-foreground">Score {score} · {daysSince === 0 ? "Active today" : daysSince === 1 ? "Yesterday" : daysSince !== null ? `${daysSince}d ago` : "Engaged"}</p>
                                  </div>
                                </div>
                                <a href={`/contacts/${c.id}`} className="text-[10px] px-2.5 py-1.5 rounded-md bg-red-600 text-white font-bold hover:bg-red-700 shrink-0 ml-2">View</a>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* What the AI is doing */}
                <AIWorkingForYou
                  totalSent={dashboard.totalSent}
                  openRate={dashboard.openRate}
                  clickRate={dashboard.clickRate}
                  hotLeadCount={hotLeads.length}
                  successStories={successStories}
                  upcomingSends={upcomingSends}
                />

                {/* Approval queue — only shown when there are drafts */}
                {queue.length > 0 && (
                  <AIAgentQueue
                    drafts={queue as any}
                    sendAction={sendNewsletter}
                    skipAction={skipNewsletter}
                    bulkApproveAction={bulkApproveNewsletters}
                  />
                )}

                {/* Pipeline — who is being nurtured */}
                <NurturePipelineCard contacts={nurturedContacts} />

                {/* Upcoming sends — what's scheduled next */}
                <UpcomingSendsCard
                  items={scheduledEmailsTruncated}
                  templatePreviews={templatePreviews}
                />

                {/* Unified feed — what went out across all email systems */}
                <WhatWentOutFeed items={whatWentOut as any} />

                {/* Journey Schedule — what gets sent when */}
                <JourneyScheduleCard />

              </div>
            ),

            /* ══════════════════════════════
               AI INSIGHTS TAB
            ══════════════════════════════ */
            insights: (
              <AIInsightsTab data={aiInsightsData} />
            ),

          }}
        </EmailMarketingTabs>
      </div>
    </>
  );
}

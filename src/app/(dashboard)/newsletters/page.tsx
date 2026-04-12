export const dynamic = "force-dynamic";

import { getJourneyDashboard } from "@/actions/journeys";
import { getApprovalQueue } from "@/actions/newsletters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, MailOpen, MousePointerClick } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DailyDigestCard } from "@/components/dashboard/DailyDigestCard";
import { EmailMarketingTabs } from "@/components/newsletters/EmailMarketingTabs";
import { CampaignsTab } from "@/components/newsletters/CampaignsTab";
import { SettingsTab } from "@/components/newsletters/SettingsTab";
import { PipelineCard } from "@/components/newsletters/PipelineCard";
import { SentByAIList } from "@/components/newsletters/SentByAIList";
import { AIAgentQueue } from "@/components/newsletters/AIAgentQueue";
import { HeldBackList } from "@/components/newsletters/HeldBackList";
import { AIWorkingForYou } from "@/components/newsletters/AIWorkingForYou";
import { ListingBlastAutomation } from "@/components/newsletters/ListingBlastAutomation";
import { GreetingAutomations } from "@/components/newsletters/GreetingAutomations";
import { sendNewsletter, skipNewsletter, bulkApproveNewsletters, sendListingBlast, sendCampaign } from "@/actions/newsletters";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { WORKFLOW_BLUEPRINTS } from "@/lib/constants";
import { getRealtorConfig, getAutomationRules, getGreetingRules } from "@/actions/config";

export default async function NewsletterDashboard() {
  const tc = await getAuthenticatedTenantClient();
  const [dashboard, queue, realtorConfig, automationRules, greetingRules] = await Promise.all([
    getJourneyDashboard(),
    getApprovalQueue(),
    getRealtorConfig(),
    getAutomationRules(),
    getGreetingRules(),
  ]);

  // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is safe
  const _now = Date.now();
  const sevenDaysFromNow = new Date(_now + 7 * 86400000).toISOString();

  const [
    { data: journeys },
    { data: workflows },
    { data: listings },
    { data: hotLeadsRaw },
    { data: suppressedRaw },
    { data: sentRaw },
    { data: upcomingJourneys },
  ] = await Promise.all([
    tc.from("contact_journeys").select("id, contact_id, journey_type, current_phase, is_paused, next_email_at, send_mode, contacts(name, type, email)").order("created_at", { ascending: false }),
    tc.from("workflows").select("id, name, slug, description, is_active, trigger_type, contact_type, workflow_steps(id)").order("name"),
    tc.from("listings").select("id, address, list_price, status").eq("status", "active").order("created_at", { ascending: false }).limit(10),
    tc.from("contacts").select("id, name, phone, type, newsletter_intelligence").not("newsletter_intelligence", "is", null).order("created_at", { ascending: false }).limit(50),
    tc.from("newsletters").select("id, subject, email_type, status, ai_context, contact_id, created_at, contacts(name, type, email, phone)").eq("status", "suppressed").order("created_at", { ascending: false }).limit(10),
    tc.from("newsletters").select("id, subject, email_type, status, sent_at, contact_id, html_body, contacts(name, type), newsletter_events(event_type, metadata, created_at)").eq("status", "sent").order("sent_at", { ascending: false }).limit(20),
    tc.from("contact_journeys").select("id, contact_id, journey_type, current_phase, next_email_at, emails_sent_in_phase, contacts(name, type)").eq("is_paused", false).not("next_email_at", "is", null).lte("next_email_at", sevenDaysFromNow).order("next_email_at").limit(50),
  ]);

  // Filter hot leads: engagement score >= 60, split by type
  const hotLeads = (hotLeadsRaw || []).filter((c: any) => {
    const score = c.newsletter_intelligence?.engagement_score;
    return typeof score === "number" && score >= 60;
  }).sort((a: any, b: any) => (b.newsletter_intelligence?.engagement_score || 0) - (a.newsletter_intelligence?.engagement_score || 0));
  const hotBuyers = hotLeads.filter((c: any) => c.type === "buyer" || c.type === "customer");
  const hotSellers = hotLeads.filter((c: any) => c.type === "seller");

  const suppressedEmails = suppressedRaw || [];

  // Sent newsletters with events for AI Agent tab
  const sentNewsletters = (sentRaw || []).map((nl: any) => ({
    ...nl,
    events: nl.newsletter_events || [],
  }));

  // Build pipeline drilldown data from journeys
  const buyerContactsByPhase: Record<string, any[]> = {};
  const sellerContactsByPhase: Record<string, any[]> = {};
  for (const j of (journeys || [])) {
    const contact = Array.isArray(j.contacts) ? j.contacts[0] : j.contacts;
    if (!contact) continue;
    const entry = { id: j.contact_id, name: contact.name, phone: null as string | null, email: contact.email, type: contact.type, newsletter_intelligence: null };
    // Try to find intelligence from hotLeadsRaw
    const found = (hotLeadsRaw || []).find((c: any) => c.id === j.contact_id);
    if (found) { entry.newsletter_intelligence = found.newsletter_intelligence; entry.phone = found.phone; }
    const map = j.journey_type === "buyer" ? buyerContactsByPhase : sellerContactsByPhase;
    if (!map[j.current_phase]) map[j.current_phase] = [];
    map[j.current_phase].push(entry);
  }

  // Relationship health data (merged from RelationshipsTab)
  const allContacts = hotLeadsRaw || [];
  const warmContacts = allContacts.filter((c: any) => {
    const s = c.newsletter_intelligence?.engagement_score || 0;
    return s >= 30 && s < 60;
  });
  const coolingContacts = allContacts.filter((c: any) => {
    const s = c.newsletter_intelligence?.engagement_score || 0;
    return s >= 15 && s < 30;
  });
  const dormantContacts = allContacts.filter((c: any) => (c.newsletter_intelligence?.engagement_score || 0) < 15);

  const now = _now;

  // AI Success Stories — build from contacts with newsletter_intelligence + sent emails
  const successStories: Array<{ contactId: string; contactName: string; contactType: string; icon: string; story: string; score?: number }> = [];
  const phaseLabelsMap: Record<string, string> = { lead: "Lead", active: "Active", under_contract: "Under Contract", past_client: "Past Client", dormant: "Dormant" };
  const phases = ["lead", "active", "under_contract", "past_client", "dormant"];
  const phaseLabels: Record<string, string> = { lead: "New Leads", active: "Active", under_contract: "Under Contract", past_client: "Past Clients", dormant: "Dormant" };
  const phaseIcons: Record<string, string> = { lead: "🟢", active: "🔥", under_contract: "📝", past_client: "⭐", dormant: "❄️" };

  // Story type 1: Hot leads with high engagement from AI emails
  for (const lead of hotLeads.slice(0, 2)) {
    const intel = lead.newsletter_intelligence;
    const clicks = intel?.total_clicks || 0;
    const opens = intel?.total_opens || 0;
    const interests = intel?.inferred_interests?.areas?.join(", ") || "";
    const score = intel?.engagement_score || 0;
    if (opens > 0) {
      successStories.push({
        contactId: lead.id,
        contactName: lead.name,
        contactType: lead.type,
        icon: "🔥",
        story: `Opened ${opens} emails, clicked ${clicks} links${interests ? ` — interested in ${interests}` : ""}`,
        score,
      });
    }
  }

  // Story type 2: Contacts who advanced phases (active or under_contract)
  for (const j of (journeys || [])) {
    if (successStories.length >= 4) break;
    if (j.current_phase === "active" || j.current_phase === "under_contract") {
      const contact = Array.isArray(j.contacts) ? j.contacts[0] : j.contacts;
      if (!contact || successStories.some((s) => s.contactId === j.contact_id)) continue;
      const found = allContacts.find((c: any) => c.id === j.contact_id);
      const score = found?.newsletter_intelligence?.engagement_score;
      successStories.push({
        contactId: j.contact_id,
        contactName: contact.name,
        contactType: contact.type,
        icon: j.current_phase === "under_contract" ? "📝" : "📈",
        story: `AI nurtured from Lead → ${phaseLabelsMap[j.current_phase]}${typeof score === "number" ? ` · engagement score ${score}` : ""}`,
        score,
      });
    }
  }

  // Story type 3: Sent emails with clicks (engagement proof)
  for (const nl of sentNewsletters) {
    if (successStories.length >= 5) break;
    const clicks = nl.events?.filter((e: any) => e.event_type === "clicked").length || 0;
    if (clicks === 0) continue;
    const contact = Array.isArray(nl.contacts) ? nl.contacts[0] : nl.contacts;
    if (!contact || successStories.some((s) => s.contactId === nl.contact_id)) continue;
    successStories.push({
      contactId: nl.contact_id,
      contactName: contact.name,
      contactType: contact.type,
      icon: "⚡",
      story: `Clicked ${clicks} link${clicks > 1 ? "s" : ""} in "${nl.subject}"`,
    });
  }

  // Upcoming sends — group by date + email type
  const upcomingSendsMap: Record<string, { date: string; label: string; emailType: string; count: number }> = {};
  for (const uj of (upcomingJourneys || [])) {
    if (!uj.next_email_at) continue;
    const d = new Date(uj.next_email_at);
    const dateKey = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const isToday = d.toDateString() === new Date().toDateString();
    const isTomorrow = d.toDateString() === new Date(_now + 86400000).toDateString();
    const label = isToday ? "Today" : isTomorrow ? "Tomorrow" : dateKey;

    // Determine email type from journey schedule
    const JOURNEY_EMAIL_TYPES: Record<string, string[]> = {
      buyer_lead: ["welcome", "neighbourhood_guide", "new_listing_alert", "market_update", "new_listing_alert"],
      buyer_active: ["new_listing_alert", "market_update"],
      seller_lead: ["welcome", "market_update", "neighbourhood_guide"],
      seller_active: ["market_update"],
    };
    const key = `${uj.journey_type}_${uj.current_phase}`;
    const types = JOURNEY_EMAIL_TYPES[key] || ["email"];
    const emailType = types[Math.min(uj.emails_sent_in_phase || 0, types.length - 1)] || "email";
    const groupKey = `${dateKey}_${emailType}`;

    if (!upcomingSendsMap[groupKey]) {
      upcomingSendsMap[groupKey] = { date: label, label: `to ${uj.journey_type} contacts`, emailType, count: 0 };
    }
    upcomingSendsMap[groupKey].count++;
  }
  const upcomingSends = Object.values(upcomingSendsMap).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Email Marketing"
        subtitle="AI-powered email marketing — one page, full control"
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/newsletters/learning"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              🧠 Learning
            </a>
            <a
              href="/newsletters/engine"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              ⚙️ Engine
            </a>
          </div>
        }
      />
      <div className="p-6 space-y-6">
      <EmailMarketingTabs queueCount={queue.length}>
        {{
          /* ═══ OVERVIEW ═══ */
          overview: (
            <div className="space-y-4 stagger-children">

              {/* Row 1: Compact stat pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Health:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">🔥 {hotBuyers.length} Hot Buyers</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-brand-muted text-brand-dark border border-brand/20">🔥 {hotSellers.length} Hot Sellers</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">🌡️ {warmContacts.length} Warm</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-muted text-brand-dark border border-brand/20">❄️ {coolingContacts.length + dormantContacts.length} Cold</span>
                <span className="text-muted-foreground mx-1">·</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">📧 {dashboard.totalSent} sent</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-muted text-brand-dark border border-brand/20">📬 {dashboard.openRate}% opens</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-muted text-brand-dark border border-brand/20">🖱️ {dashboard.clickRate}% clicks</span>
              </div>

              {/* Row 2: ACT NOW — top 3 most urgent contacts (buyers + sellers mixed) */}
              {(() => {
                const urgent = [...hotBuyers, ...hotSellers]
                  .sort((a: any, b: any) => (b.newsletter_intelligence?.engagement_score || 0) - (a.newsletter_intelligence?.engagement_score || 0))
                  .slice(0, 4);
                if (urgent.length === 0) return null;
                return (
                  <Card className="border-red-200 bg-gradient-to-r from-rose-50/80 to-[#0F7694]/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🚨</span>
                          <h3 className="text-sm font-bold text-red-800">Act Now — Before They Go to Another Agent</h3>
                        </div>
                        <Badge variant="destructive" className="text-[10px]">{urgent.length} at risk</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {urgent.map((c: any) => {
                          const score = c.newsletter_intelligence?.engagement_score || 0;
                          const lastClicked = c.newsletter_intelligence?.last_clicked;
                          const daysSince = lastClicked ? Math.floor((_now - new Date(lastClicked).getTime()) / 86400000) : null;
                          const isBuyer = c.type === "buyer" || c.type === "customer";
                          return (
                            <div key={c.id} className="flex items-center justify-between p-2.5 bg-white/70 rounded-lg border border-red-100">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative">
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${isBuyer ? "from-rose-500 to-[#0F7694]" : "from-[#0F7694] to-rose-500"} flex items-center justify-center text-white text-xs font-bold`}>
                                    {(c.name || "?")[0]}
                                  </div>
                                  {daysSince !== null && daysSince <= 2 && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-semibold truncate">{c.name}</p>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isBuyer ? "bg-red-100 text-red-700" : "bg-brand-muted text-brand-dark"}`}>
                                      {c.type === "customer" ? "LEAD" : isBuyer ? "BUYER" : "SELLER"}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    Score {score} · {daysSince === 0 ? "Active today" : daysSince === 1 ? "Yesterday" : daysSince !== null ? `${daysSince}d ago` : "Engaged"}
                                  </p>
                                </div>
                              </div>
                              <a href={`tel:${c.phone}`} className="text-[10px] px-2.5 py-1.5 rounded-md bg-red-600 text-white font-bold hover:bg-red-700 shrink-0 ml-2">Call</a>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-red-600/70 font-medium mt-2 text-center">Leads contacted within 5 minutes convert 21x more · Sellers who get a CMA within 24h list with that agent 73% of the time</p>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Row 3: Pipeline (compact) + AI Activity (side by side) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Compact Pipeline — merged buyer + seller */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3">Pipeline</h4>
                    <div className="space-y-1.5">
                      {phases.map((p) => {
                        const bCount = dashboard.buyerPhases[p] || 0;
                        const sCount = dashboard.sellerPhases[p] || 0;
                        const total = bCount + sCount;
                        return (
                          <div key={p} className="flex items-center justify-between py-1.5">
                            <span className="text-xs font-medium">{phaseIcons[p]} {phaseLabels[p]}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-muted-foreground">{bCount}B · {sCount}S</span>
                              <span className="text-xs font-bold text-foreground w-6 text-right">{total}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
                        <span className="text-xs font-semibold">Total</span>
                        <span className="text-xs font-bold text-primary">{dashboard.totalContacts}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Activity Feed */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3">AI Activity</h4>
                    <div className="space-y-2">
                      {dashboard.totalSent > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Send className="h-3 w-3 text-primary" /></span>
                          <span><strong>{dashboard.totalSent}</strong> emails sent this month</span>
                        </div>
                      )}
                      {queue.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><MailOpen className="h-3 w-3 text-amber-600" /></span>
                          <span><strong>{queue.length}</strong> drafts pending approval</span>
                        </div>
                      )}
                      {suppressedEmails.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0"><span className="text-[10px]">🚫</span></span>
                          <span><strong>{suppressedEmails.length}</strong> emails held back (frequency cap, low engagement)</span>
                        </div>
                      )}
                      {dashboard.recentEvents.length > 0 && (
                        <>
                          {dashboard.recentEvents.slice(0, 4).map((event: any) => (
                            <div key={event.id} className="flex items-center gap-2 text-xs">
                              <span className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                                {event.event_type === "opened" ? <MailOpen className="h-3 w-3 text-brand" /> :
                                 event.event_type === "clicked" ? <MousePointerClick className="h-3 w-3 text-primary" /> :
                                 <Send className="h-3 w-3 text-muted-foreground" />}
                              </span>
                              <span className="truncate">
                                <strong>{event.contacts?.name}</strong> {event.event_type} {event.newsletters?.subject?.slice(0, 30)}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                      {dashboard.totalSent === 0 && queue.length === 0 && dashboard.recentEvents.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-3">No activity yet. AI will start when contacts are enrolled.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ),

          /* ═══ AI AGENT ═══ */
          queue: (
            <div className="space-y-4">
              <AIWorkingForYou
                totalSent={dashboard.totalSent}
                openRate={dashboard.openRate}
                clickRate={dashboard.clickRate}
                hotLeadCount={hotLeads.length}
                successStories={successStories}
                upcomingSends={upcomingSends}
              />

              <AIAgentQueue
                drafts={queue as any}
                sendAction={sendNewsletter}
                skipAction={skipNewsletter}
                bulkApproveAction={bulkApproveNewsletters}
              />

              {/* AI Sent Emails — Expandable with engagement timeline */}
              <SentByAIList newsletters={sentNewsletters as any} />

              {/* Suppressed Emails Section */}
              <HeldBackList emails={suppressedEmails as any} />
            </div>
          ),

          /* ═══ CAMPAIGNS (Templates + Blasts) ═══ */
          campaigns: (
            <CampaignsTab listings={(listings || []) as any} onSendBlast={sendListingBlast} onSendCampaign={sendCampaign} />
          ),


          /* ═══ AI WORKFLOWS ═══ */
          workflows: (() => {
            const blueprintsBySlug: Record<string, { icon: string }> = {};
            for (const bp of WORKFLOW_BLUEPRINTS) blueprintsBySlug[bp.slug] = bp;
            const workflowList = workflows || [];

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Workflows ({workflowList.length})</h4>
                  <a href="/automations" className="text-xs text-primary font-medium hover:underline">Manage All →</a>
                </div>

                {workflowList.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-sm text-muted-foreground">No workflows configured yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workflowList.map((w: any) => {
                      const icon = blueprintsBySlug[w.slug]?.icon || "⚙️";
                      const stepCount = Array.isArray(w.workflow_steps) ? w.workflow_steps.length : 0;

                      return (
                        <a key={w.id} href={`/automations/workflows/${w.id}`} className="group">
                          <Card className="h-full transition-shadow hover:shadow-md group-hover:border-primary/30">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{icon}</span>
                                  <div>
                                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                                      {w.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                      {w.description || w.trigger_type?.replace(/_/g, " ")}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>{stepCount} step{stepCount !== 1 ? "s" : ""}</span>
                                <span>Trigger: {w.trigger_type?.replace(/_/g, " ")}</span>
                              </div>

                              <div className="flex items-center justify-between">
                                {w.is_active ? (
                                  <Badge className="bg-brand-muted text-brand-dark hover:bg-brand-muted text-[11px]">Active</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[11px]">Paused</Badge>
                                )}
                                {w.contact_type && w.contact_type !== "any" && (
                                  <Badge variant="outline" className="text-[11px] capitalize">{w.contact_type}</Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })(),

          /* ═══ AUTOMATION ═══ */
          automation: (
            <div className="space-y-6">
              <ListingBlastAutomation />
              <GreetingAutomations initialRules={greetingRules as any} />
            </div>
          ),

          /* ═══ SETTINGS ═══ */
          settings: (
            <SettingsTab config={realtorConfig ? {
              sending_enabled: realtorConfig.sending_enabled,
              skip_weekends: realtorConfig.skip_weekends,
              quiet_hours: realtorConfig.quiet_hours as any,
              frequency_caps: realtorConfig.frequency_caps as any,
              default_send_hour: realtorConfig.default_send_hour,
              brand_config: realtorConfig.brand_config as any,
              ai_quality_tier: realtorConfig.ai_quality_tier as string | undefined,
            } : null} />
          ),
        }}
      </EmailMarketingTabs>
      </div>
    </>
  );
}

function HotContactCard({ title, contacts, warningText, emptyText, bottomStat, gradientFrom, gradientTo, now }: {
  title: string; contacts: any[]; warningText: string; emptyText: string; bottomStat: string;
  gradientFrom: string; gradientTo: string; now?: number;
}) {
  return (
    <Card className={contacts.length > 0 ? "border-red-200 bg-red-50/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold">{title}</h3>
          <Badge variant={contacts.length > 0 ? "destructive" : "secondary"} className="text-xs">{contacts.length} ready to act</Badge>
        </div>
        {contacts.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-red-100 border border-red-200 rounded-md">
            <span className="text-sm">⚠️</span>
            <p className="text-[11px] text-red-800 font-medium">{warningText}</p>
          </div>
        )}
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{emptyText}</p>
        ) : contacts.slice(0, 5).map((lead: any) => {
          const score = lead.newsletter_intelligence?.engagement_score || 0;
          const lastClicked = lead.newsletter_intelligence?.last_clicked;
          const daysSinceClick = lastClicked && now ? Math.floor((now - new Date(lastClicked).getTime()) / 86400000) : null;
          const isUrgent = daysSinceClick !== null && daysSinceClick <= 2;
          return (
            <div key={lead.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {(lead.name || "?")[0]}
                  </div>
                  {isUrgent && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    {isUrgent && <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-semibold shrink-0">ACT NOW</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Score {score} · {daysSinceClick !== null ? (daysSinceClick === 0 ? "Active today" : daysSinceClick === 1 ? "Active yesterday" : `${daysSinceClick}d ago`) : "Engaged"}
                    {score >= 75 && " · Likely talking to other agents"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <a href={`tel:${lead.phone}`} className="text-xs px-2.5 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 font-semibold">Call Now</a>
                <a href={`/contacts/${lead.id}`} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium">View</a>
              </div>
            </div>
          );
        })}
        {contacts.length > 0 && (
          <p className="text-[10px] text-red-600 font-medium mt-3">{bottomStat}</p>
        )}
      </CardContent>
    </Card>
  );
}

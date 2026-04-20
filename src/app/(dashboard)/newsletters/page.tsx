export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getUserFeatures } from "@/lib/features";
import { getJourneyDashboard } from "@/actions/journeys";
import { getApprovalQueue } from "@/actions/newsletters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, MailOpen, MousePointerClick } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmailMarketingTabs } from "@/components/newsletters/EmailMarketingTabs";
import { CampaignsTab } from "@/components/newsletters/CampaignsTab";
import { SentByAIList } from "@/components/newsletters/SentByAIList";
import { AIWorkingForYou } from "@/components/newsletters/AIWorkingForYou";
import { ListingBlastAutomation } from "@/components/newsletters/ListingBlastAutomation";
import { GreetingAutomations } from "@/components/newsletters/GreetingAutomations";
import { sendNewsletter, skipNewsletter, bulkApproveNewsletters, sendListingBlast, sendCampaign } from "@/actions/newsletters";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { WORKFLOW_BLUEPRINTS } from "@/lib/constants";
import { getRealtorConfig, getAutomationRules, getGreetingRules } from "@/actions/config";
import { AIAgentQueue } from "@/components/newsletters/AIAgentQueue";
import { BrandProfileForm } from "@/components/newsletters/BrandProfileForm";
import { SettingsTab } from "@/components/newsletters/SettingsTab";
import { getBrandProfile } from "@/actions/brand-profile";

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
  const [dashboard, queue, realtorConfig, automationRules, greetingRules, brandProfile] = await Promise.all([
    getJourneyDashboard(),
    getApprovalQueue(),
    getRealtorConfig(),
    getAutomationRules(),
    getGreetingRules(),
    getBrandProfile(),
  ]);

  const _now = Date.now();
  const sevenDaysFromNow = new Date(_now + 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(_now - 30 * 86400000).toISOString();

  const [
    { data: journeys },
    { data: workflows },
    { data: listings },
    { data: hotLeadsRaw },
    { data: sentRaw },
    { data: upcomingJourneys },
    { count: bounceCount },
    { data: recentBlastsRaw },
  ] = await Promise.all([
    tc.from("contact_journeys").select("id, contact_id, journey_type, current_phase, is_paused, next_email_at, send_mode, contacts(name, type, email)").order("created_at", { ascending: false }),
    tc.from("workflows").select("id, name, slug, description, is_active, trigger_type, contact_type, workflow_steps(id)").order("name"),
    tc.from("listings").select("id, address, list_price, status").eq("status", "active").order("created_at", { ascending: false }).limit(10),
    tc.from("contacts").select("id, name, phone, type, newsletter_intelligence").not("newsletter_intelligence", "is", null).order("created_at", { ascending: false }).limit(50),
    tc.from("newsletters").select("id, subject, email_type, status, sent_at, contact_id, html_body, contacts(name, type), newsletter_events(event_type, metadata, created_at)").eq("status", "sent").order("sent_at", { ascending: false }).limit(20),
    tc.from("contact_journeys").select("id, contact_id, journey_type, current_phase, next_email_at, emails_sent_in_phase, contacts(name, type)").eq("is_paused", false).not("next_email_at", "is", null).lte("next_email_at", sevenDaysFromNow).order("next_email_at").limit(50),
    tc.from("newsletter_events").select("id", { count: "exact", head: true }).eq("event_type", "bounced").gte("created_at", thirtyDaysAgo),
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
    const JOURNEY_EMAIL_TYPES: Record<string, string[]> = { buyer_lead: ["welcome", "neighbourhood_guide", "new_listing_alert", "market_update", "new_listing_alert"], buyer_active: ["new_listing_alert", "market_update"], seller_lead: ["welcome", "market_update", "neighbourhood_guide"], seller_active: ["market_update"] };
    const key = `${uj.journey_type}_${uj.current_phase}`;
    const types = JOURNEY_EMAIL_TYPES[key] || ["email"];
    const emailType = types[Math.min(uj.emails_sent_in_phase || 0, types.length - 1)] || "email";
    const groupKey = `${dateKey}_${emailType}`;
    if (!upcomingSendsMap[groupKey]) upcomingSendsMap[groupKey] = { date: label, label: `to ${uj.journey_type} contacts`, emailType, count: 0 };
    upcomingSendsMap[groupKey].count++;
  }
  const upcomingSends = Object.values(upcomingSendsMap).slice(0, 5);

  // Pipeline phases
  const phases = ["lead", "active", "under_contract", "past_client", "dormant"];
  const phaseLabels: Record<string, string> = { lead: "New Leads", active: "Active", under_contract: "Under Contract", past_client: "Past Clients", dormant: "Dormant" };
  const phaseIcons: Record<string, string> = { lead: "🟢", active: "🔥", under_contract: "📝", past_client: "⭐", dormant: "❄️" };

  // Campaigns tab blast history
  const realBlastHistory = (recentBlastsRaw || []).map((nl: any) => {
    const events = nl.newsletter_events || [];
    return { id: nl.id, listing_address: nl.subject?.replace(/^NEW LISTING:\s*/i, "").split("—")[0]?.trim() || nl.subject || "Campaign", listing_price: null, template: nl.email_type?.replace(/_/g, " ") || "Campaign", recipients: 1, sent_at: nl.sent_at || nl.created_at, opens: events.filter((e: any) => e.event_type === "opened").length, clicks: events.filter((e: any) => e.event_type === "clicked").length, replies: 0 };
  });

  // Workflows for automations tab
  const blueprintsBySlug: Record<string, { icon: string }> = {};
  for (const bp of WORKFLOW_BLUEPRINTS) blueprintsBySlug[bp.slug] = bp;
  const workflowList = workflows || [];

  return (
    <>
      <PageHeader
        title="Email Marketing"
        subtitle="AI sends emails to your contacts automatically"
      />
      <div className="p-6 space-y-6">
        <EmailMarketingTabs queueCount={queue.length} hasAutomations={hasAutomations}>
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

                {/* Pipeline snapshot */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">Contacts being nurtured</h4>
                      <span className="text-xs text-muted-foreground">{dashboard.totalContacts} total</span>
                    </div>
                    <div className="space-y-1.5">
                      {phases.map((p) => {
                        const bCount = dashboard.buyerPhases[p] || 0;
                        const sCount = dashboard.sellerPhases[p] || 0;
                        const total = bCount + sCount;
                        if (total === 0) return null;
                        return (
                          <div key={p} className="flex items-center justify-between py-1">
                            <span className="text-xs text-muted-foreground">{phaseIcons[p]} {phaseLabels[p]}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-muted-foreground">{bCount > 0 ? `${bCount} buyer` : ""}{bCount > 0 && sCount > 0 ? " · " : ""}{sCount > 0 ? `${sCount} seller` : ""}</span>
                              <span className="text-xs font-bold w-5 text-right">{total}</span>
                            </div>
                          </div>
                        );
                      })}
                      {dashboard.totalContacts === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No contacts enrolled yet. Add a buyer or seller to get started.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent emails sent by AI */}
                {sentNewsletters.length > 0 && (
                  <SentByAIList newsletters={sentNewsletters as any} />
                )}

                {/* Recent engagement from Render */}
                {dashboard.recentEvents.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Recent engagement</h4>
                      <div className="space-y-2">
                        {dashboard.recentEvents.slice(0, 6).map((event: any) => (
                          <div key={event.id} className="flex items-center gap-2 text-xs">
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                              {event.event_type === "opened" ? <MailOpen className="h-3 w-3 text-brand" /> :
                               event.event_type === "clicked" ? <MousePointerClick className="h-3 w-3 text-primary" /> :
                               <Send className="h-3 w-3 text-muted-foreground" />}
                            </span>
                            <span className="truncate text-muted-foreground">
                              <strong className="text-foreground">{event.contacts?.name}</strong> {event.event_type} · {event.newsletters?.subject?.slice(0, 40)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              </div>
            ),

            /* ══════════════════════════════
               CAMPAIGNS TAB
               Editorial newsletters + listing blasts
            ══════════════════════════════ */
            campaigns: (
              <CampaignsTab
                listings={(listings || []) as any}
                blastHistory={realBlastHistory}
                onSendBlast={sendListingBlast}
                onSendCampaign={sendCampaign}
              />
            ),

            /* ══════════════════════════════
               AUTOMATIONS TAB
               Greetings + listing blast toggle + workflows
            ══════════════════════════════ */
            automations: (
              <div className="space-y-6">
                <ListingBlastAutomation
                  enabled={(realtorConfig?.brand_config as any)?.listing_blast_enabled !== false}
                />
                <GreetingAutomations initialRules={greetingRules as any} />

                {/* Workflows */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Workflows</h4>
                    <a href="/automations" className="text-xs text-primary font-medium hover:underline">Manage →</a>
                  </div>
                  {workflowList.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">No workflows yet.</p>
                        <a href="/automations" className="text-xs text-primary hover:underline mt-1 inline-block">Create your first workflow →</a>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {workflowList.map((w: any) => {
                        const icon = blueprintsBySlug[w.slug]?.icon || "⚙️";
                        const stepCount = Array.isArray(w.workflow_steps) ? w.workflow_steps.length : 0;
                        return (
                          <a key={w.id} href={`/automations/workflows/${w.id}`} className="group">
                            <Card className="h-full hover:shadow-md transition-shadow group-hover:border-primary/30">
                              <CardContent className="p-4 space-y-2">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{icon}</span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{w.name}</p>
                                    <p className="text-xs text-muted-foreground">{stepCount} step{stepCount !== 1 ? "s" : ""}</p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  {w.is_active ? (
                                    <Badge className="bg-success/10 text-success hover:bg-success/10 text-[11px]">Active</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[11px]">Paused</Badge>
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
              </div>
            ),

            /* ══════════════════════════════
               SETTINGS TAB
               Brand profile + AI & send settings
            ══════════════════════════════ */
            settings: (
              <div className="max-w-3xl space-y-10">
                <section>
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-foreground">Brand Profile</h2>
                    <p className="text-sm text-muted-foreground">
                      Your logo, contact details, and branding used in every email you send.
                      The physical address is legally required by CASL.
                    </p>
                  </div>
                  <BrandProfileForm profile={brandProfile} />
                </section>

                <hr className="border-border" />

                <section>
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-foreground">AI &amp; Send Settings</h2>
                    <p className="text-sm text-muted-foreground">
                      Voice profile, frequency caps, quiet hours, and send mode.
                    </p>
                  </div>
                  <SettingsTab
                    config={
                      realtorConfig
                        ? {
                            sending_enabled: realtorConfig.sending_enabled,
                            skip_weekends: realtorConfig.skip_weekends,
                            quiet_hours: realtorConfig.quiet_hours as { start: string; end: string },
                            frequency_caps: realtorConfig.frequency_caps as Record<string, unknown>,
                            default_send_hour: realtorConfig.default_send_hour,
                            brand_config: realtorConfig.brand_config as { default_send_mode?: string },
                            ai_quality_tier: (realtorConfig.ai_quality_tier as string) ?? undefined,
                            brand_name: (realtorConfig.brand_name as string) ?? "",
                            tone: (realtorConfig.tone as string) ?? "",
                            writing_style_rules: (realtorConfig.writing_style_rules as string[]) ?? [],
                            content_rankings: (realtorConfig.content_rankings as Array<{ type: string; effectiveness: number }>) ?? [],
                          }
                        : null
                    }
                    unsubscribeCount={0}
                    complaintCount={bounceCount ?? 0}
                  />
                </section>
              </div>
            ),
          }}
        </EmailMarketingTabs>
      </div>
    </>
  );
}

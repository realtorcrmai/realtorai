export const dynamic = "force-dynamic";

import { getJourneyDashboard } from "@/actions/journeys";
import { getApprovalQueue } from "@/actions/newsletters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { sendNewsletter, skipNewsletter, bulkApproveNewsletters } from "@/actions/newsletters";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function NewsletterDashboard() {
  const supabase = createAdminClient();
  const dashboard = await getJourneyDashboard();
  const queue = await getApprovalQueue();

  const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000).toISOString();

  const [
    { data: journeys },
    { data: workflows },
    { data: listings },
    { data: hotLeadsRaw },
    { data: suppressedRaw },
    { data: sentRaw },
    { data: upcomingJourneys },
  ] = await Promise.all([
    supabase.from("contact_journeys").select("id, contact_id, journey_type, current_phase, is_paused, next_email_at, send_mode, contacts(name, type, email)").order("created_at", { ascending: false }),
    supabase.from("workflows").select("id, name, slug, is_active, trigger_type").order("name"),
    supabase.from("listings").select("id, address, list_price, status").eq("status", "active").order("created_at", { ascending: false }).limit(10),
    supabase.from("contacts").select("id, name, phone, type, newsletter_intelligence").not("newsletter_intelligence", "is", null).order("created_at", { ascending: false }).limit(50),
    supabase.from("newsletters").select("id, subject, email_type, status, ai_context, contact_id, created_at, contacts(name, type, email, phone)").eq("status", "suppressed").order("created_at", { ascending: false }).limit(10),
    supabase.from("newsletters").select("id, subject, email_type, status, sent_at, contact_id, html_body, contacts(name, type), newsletter_events(event_type, metadata, created_at)").eq("status", "sent").order("sent_at", { ascending: false }).limit(20),
    supabase.from("contact_journeys").select("id, contact_id, journey_type, current_phase, next_email_at, emails_sent_in_phase, contacts(name, type)").eq("is_paused", false).not("next_email_at", "is", null).lte("next_email_at", sevenDaysFromNow).order("next_email_at").limit(50),
  ]);

  // Filter hot leads: engagement score >= 60, split by type
  const hotLeads = (hotLeadsRaw || []).filter((c: any) => {
    const score = c.newsletter_intelligence?.engagement_score;
    return typeof score === "number" && score >= 60;
  }).sort((a: any, b: any) => (b.newsletter_intelligence?.engagement_score || 0) - (a.newsletter_intelligence?.engagement_score || 0));
  const hotBuyers = hotLeads.filter((c: any) => c.type === "buyer");
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

  const now = Date.now();

  // AI Success Stories — build from contacts with newsletter_intelligence + sent emails
  const successStories: Array<{ contactId: string; contactName: string; contactType: string; icon: string; story: string; score?: number }> = [];
  const phaseLabelsMap: Record<string, string> = { lead: "Lead", active: "Active", under_contract: "Under Contract", past_client: "Past Client", dormant: "Dormant" };

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
    const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString();
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Email Marketing</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered email marketing — one page, full control</p>
      </div>

      <EmailMarketingTabs queueCount={queue.length}>
        {{
          /* ═══ OVERVIEW ═══ */
          overview: (
            <div className="space-y-4">

              {/* Stats — Glass + Accent Bar Style */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <div className="relative overflow-hidden rounded-xl bg-white/85 backdrop-blur-sm border border-white/50 shadow-sm p-4 text-center">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                  <div className="text-lg mb-1">🔥</div>
                  <div className="text-2xl font-extrabold text-red-600">{hotBuyers.length}</div>
                  <div className="text-[11px] font-semibold text-foreground mt-1">Hot Buyers</div>
                  <div className="text-[10px] text-red-600 font-medium mt-0.5">At risk</div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-white/85 backdrop-blur-sm border border-white/50 shadow-sm p-4 text-center">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500" />
                  <div className="text-lg mb-1">🔥</div>
                  <div className="text-2xl font-extrabold text-orange-600">{hotSellers.length}</div>
                  <div className="text-[11px] font-semibold text-foreground mt-1">Hot Sellers</div>
                  <div className="text-[10px] text-orange-600 font-medium mt-0.5">At risk</div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-white/85 backdrop-blur-sm border border-white/50 shadow-sm p-4 text-center">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-400" />
                  <div className="text-lg mb-1">🌡️</div>
                  <div className="text-2xl font-extrabold text-amber-600">{warmContacts.length}</div>
                  <div className="text-[11px] font-semibold text-foreground mt-1">Warm</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Nurturing</div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-white/85 backdrop-blur-sm border border-white/50 shadow-sm p-4 text-center">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                  <div className="text-lg mb-1">📧</div>
                  <div className="text-2xl font-extrabold text-[#4f35d2]">{dashboard.totalSent}</div>
                  <div className="text-[11px] font-semibold text-foreground mt-1">Emails Sent</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">This month</div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-white/85 backdrop-blur-sm border border-white/50 shadow-sm p-4 text-center">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                  <div className="text-lg mb-1">📬</div>
                  <div className={`text-2xl font-extrabold ${dashboard.openRate > 40 ? "text-emerald-600" : "text-amber-500"}`}>{dashboard.openRate}%</div>
                  <div className="text-[11px] font-semibold text-foreground mt-1">Open Rate</div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">{dashboard.openRate > 21 ? `${(dashboard.openRate / 21).toFixed(1)}x industry` : "Industry avg 21%"}</div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-white/85 backdrop-blur-sm border border-white/50 shadow-sm p-4 text-center">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                  <div className="text-lg mb-1">🖱️</div>
                  <div className={`text-2xl font-extrabold ${dashboard.clickRate > 10 ? "text-purple-600" : "text-amber-500"}`}>{dashboard.clickRate}%</div>
                  <div className="text-[11px] font-semibold text-foreground mt-1">Click Rate</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{dashboard.clickRate > 10 ? "Above average" : "Needs work"}</div>
                </div>
              </div>

              {/* Hot Buyers + Hot Sellers Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hot Buyers */}
                <HotContactCard
                  title="🔥 Hot Buyers"
                  contacts={hotBuyers}
                  warningText="These buyers are actively searching. If you don't reach out, another agent will."
                  emptyText="No hot buyers right now. AI is nurturing your contacts."
                  bottomStat="Buyers who get a call within 5 minutes are 21x more likely to convert"
                  gradientFrom="from-red-500" gradientTo="to-amber-500"
                />

                {/* Hot Sellers */}
                <HotContactCard
                  title="🔥 Hot Sellers"
                  contacts={hotSellers}
                  warningText="These sellers are ready to list. If you don't secure the listing, another agent will."
                  emptyText="No hot sellers right now. AI is sending market updates."
                  bottomStat="Sellers who get a CMA within 24 hours list with that agent 73% of the time"
                  gradientFrom="from-orange-500" gradientTo="to-red-500"
                />

                {/* Pending Approvals */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold">📬 Pending Approvals</h3>
                      <Badge variant={queue.length > 0 ? "default" : "secondary"} className="text-xs">{queue.length} drafts</Badge>
                    </div>
                    {queue.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">All caught up! No emails waiting for review.</p>
                    ) : queue.slice(0, 5).map((n: any) => (
                      <div key={n.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{n.contacts?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground truncate">{n.subject}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 ml-2 capitalize">{n.email_type?.replace(/_/g, " ")}</Badge>
                      </div>
                    ))}
                    {queue.length > 0 && (
                      <p className="text-xs text-primary font-medium mt-3 cursor-pointer hover:underline">Review all in AI Agent tab →</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Pipeline Row — Clickable drilldown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PipelineCard
                  title="🏠 Buyer Pipeline"
                  type="buyer"
                  phaseCounts={dashboard.buyerPhases}
                  contactsByPhase={buyerContactsByPhase}
                />
                <PipelineCard
                  title="🏗️ Seller Pipeline"
                  type="seller"
                  phaseCounts={dashboard.sellerPhases}
                  contactsByPhase={sellerContactsByPhase}
                />
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
            <CampaignsTab listings={(listings || []) as any} />
          ),


          /* ═══ AI WORKFLOWS ═══ */
          workflows: (
            <div className="space-y-4">
              <ListingBlastAutomation />

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Active Workflows ({(workflows || []).length})</h4>
                    <a href="/newsletters/workflows" className="text-xs text-primary font-medium hover:underline">Manage →</a>
                  </div>
                  {(!workflows || workflows.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No workflows configured.</p>
                  ) : workflows.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">{w.name}</p>
                        <p className="text-xs text-muted-foreground">Trigger: {w.trigger_type?.replace(/_/g, " ")}</p>
                      </div>
                      <Badge variant={w.is_active ? "default" : "secondary"} className="text-xs">
                        {w.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ),

          /* ═══ SETTINGS ═══ */
          settings: (
            <SettingsTab />
          ),
        }}
      </EmailMarketingTabs>
    </div>
  );
}

function HotContactCard({ title, contacts, warningText, emptyText, bottomStat, gradientFrom, gradientTo }: {
  title: string; contacts: any[]; warningText: string; emptyText: string; bottomStat: string;
  gradientFrom: string; gradientTo: string;
}) {
  return (
    <Card className={contacts.length > 0 ? "border-red-200 bg-red-50/30" : ""}>
      <CardContent className="p-5">
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
          const daysSinceClick = lastClicked ? Math.floor((Date.now() - new Date(lastClicked).getTime()) / 86400000) : null;
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

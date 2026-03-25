export const dynamic = "force-dynamic";

import { getJourneyDashboard } from "@/actions/journeys";
import { getApprovalQueue } from "@/actions/newsletters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MailOpen,
  Send,
  MousePointerClick,
  Link2,
  Users,
  BarChart3,
} from "lucide-react";
import { DailyDigestCard } from "@/components/dashboard/DailyDigestCard";
import { EmailMarketingTabs } from "@/components/newsletters/EmailMarketingTabs";
import { CampaignsTab } from "@/components/newsletters/CampaignsTab";
import { createAdminClient } from "@/lib/supabase/admin";

const phases = ["lead", "active", "under_contract", "past_client", "dormant"];
const phaseLabels: Record<string, string> = { lead: "New Leads", active: "Active", under_contract: "Under Contract", past_client: "Past Clients", dormant: "Dormant" };
const phaseIcons: Record<string, string> = { lead: "🟢", active: "🔥", under_contract: "📝", past_client: "⭐", dormant: "❄️" };

export default async function NewsletterDashboard() {
  const supabase = createAdminClient();
  const dashboard = await getJourneyDashboard();
  const queue = await getApprovalQueue();

  const [
    { data: recentNewsletters },
    { data: journeys },
    { data: workflows },
    { data: listings },
    { data: hotLeadsRaw },
    { data: suppressedRaw },
  ] = await Promise.all([
    supabase.from("newsletters").select("id, subject, email_type, status, sent_at, created_at, contact_id, contacts(name, type)").order("created_at", { ascending: false }).limit(20),
    supabase.from("contact_journeys").select("id, contact_id, journey_type, current_phase, is_paused, next_email_at, send_mode, contacts(name, type, email)").order("created_at", { ascending: false }),
    supabase.from("workflows").select("id, name, slug, is_active, trigger_type").order("name"),
    supabase.from("listings").select("id, address, list_price, status").eq("status", "active").order("created_at", { ascending: false }).limit(10),
    supabase.from("contacts").select("id, name, phone, type, newsletter_intelligence").not("newsletter_intelligence", "is", null).order("created_at", { ascending: false }).limit(50),
    supabase.from("newsletters").select("id, subject, email_type, status, ai_context, contacts(name, type)").eq("status", "suppressed").order("created_at", { ascending: false }).limit(10),
  ]);

  // Filter hot leads: engagement score >= 60
  const hotLeads = (hotLeadsRaw || []).filter((c: any) => {
    const score = c.newsletter_intelligence?.engagement_score;
    return typeof score === "number" && score >= 60;
  }).sort((a: any, b: any) => (b.newsletter_intelligence?.engagement_score || 0) - (a.newsletter_intelligence?.engagement_score || 0));

  const suppressedEmails = suppressedRaw || [];

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
              <DailyDigestCard />

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Contacts" value={dashboard.totalContacts} icon={<Users className="h-5 w-5 text-muted-foreground" />} />
                <StatCard label="Emails Sent" value={dashboard.totalSent} icon={<Send className="h-5 w-5 text-muted-foreground" />} />
                <StatCard label="Open Rate" value={`${dashboard.openRate}%`} icon={<MailOpen className="h-5 w-5 text-muted-foreground" />} valueClassName={dashboard.openRate > 40 ? "text-emerald-600" : "text-amber-500"} />
                <StatCard label="Click Rate" value={`${dashboard.clickRate}%`} icon={<MousePointerClick className="h-5 w-5 text-muted-foreground" />} valueClassName={dashboard.clickRate > 10 ? "text-emerald-600" : "text-amber-500"} />
              </div>

              {/* Hot Leads + Pending Approvals Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hot Leads */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold">🔥 Hot Leads</h3>
                      <Badge variant="secondary" className="text-xs">{hotLeads.length} contacts</Badge>
                    </div>
                    {hotLeads.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No hot leads right now. AI is nurturing your contacts.</p>
                    ) : hotLeads.slice(0, 5).map((lead: any) => (
                      <div key={lead.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-content text-white text-xs font-bold shrink-0 text-center leading-8">
                            {(lead.name || "?")[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{lead.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{lead.type} · Score: {lead.newsletter_intelligence?.engagement_score || 0}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <a href={`tel:${lead.phone}`} className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium">Call</a>
                          <a href={`/contacts/${lead.id}`} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium">View</a>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

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

              {/* Pipeline Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-base font-semibold mb-4">🏠 Buyer Pipeline</h3>
                    {phases.map((p) => (
                      <div key={p} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="text-sm">{phaseIcons[p]} {phaseLabels[p]}</span>
                        <span className="text-sm font-semibold text-primary">{dashboard.buyerPhases[p] || 0}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-base font-semibold mb-4">🏗️ Seller Pipeline</h3>
                    {phases.map((p) => (
                      <div key={p} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="text-sm">{phaseIcons[p]} {phaseLabels[p]}</span>
                        <span className="text-sm font-semibold text-primary">{dashboard.sellerPhases[p] || 0}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          ),

          /* ═══ AI AGENT ═══ */
          queue: (
            <div className="space-y-4">
              {/* Header with bulk actions */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">🤖 AI Agent Queue</h3>
                  <p className="text-xs text-muted-foreground">{queue.length} emails drafted by AI — review, edit, or approve</p>
                </div>
                {queue.length > 0 && (
                  <div className="flex gap-2">
                    <button className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors">✓ Approve All ({queue.length})</button>
                  </div>
                )}
              </div>

              {/* Pending Drafts */}
              {queue.length === 0 ? (
                <Card><CardContent className="p-10 text-center"><div className="text-3xl mb-2">🤖</div><p className="text-sm font-medium">All caught up!</p><p className="text-xs text-muted-foreground mt-1">AI will generate new drafts as contacts progress through their journeys.</p></CardContent></Card>
              ) : queue.map((n: any) => (
                <Card key={n.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Email header bar */}
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(n.contacts?.name || "?")[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{n.contacts?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{n.contacts?.type} · {n.email_type?.replace(/_/g, " ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <Badge variant="outline" className="text-[10px] capitalize">{n.email_type?.replace(/_/g, " ")}</Badge>
                      </div>
                    </div>
                    {/* Subject + Preview */}
                    <div className="p-4">
                      <p className="text-sm font-medium mb-1">Subject: {n.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.html_body ? n.html_body.replace(/<[^>]*>/g, "").slice(0, 200) + "..." : "No preview available"}</p>
                    </div>
                    {/* AI Reasoning (collapsible) */}
                    {n.ai_context && (
                      <div className="px-4 pb-3">
                        <details>
                          <summary className="text-xs text-primary font-medium cursor-pointer hover:underline">🧠 Why this email?</summary>
                          <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3 leading-relaxed">
                            {n.ai_context.journey_phase && <span>Journey phase: <strong>{n.ai_context.journey_phase}</strong>. </span>}
                            {n.ai_context.contact_type && <span>Contact type: <strong>{n.ai_context.contact_type}</strong>. </span>}
                            {n.ai_context.auto_generated && <span>Auto-generated based on journey schedule. </span>}
                            {n.ai_context.reasoning || "AI generated this email based on the contact's journey phase and engagement history."}
                          </div>
                        </details>
                      </div>
                    )}
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 px-4 pb-4">
                      <button className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors">✓ Approve & Send</button>
                      <button className="text-xs px-3 py-1.5 rounded-md border border-border text-foreground font-medium hover:bg-muted transition-colors">✎ Edit</button>
                      <button className="text-xs px-3 py-1.5 rounded-md text-muted-foreground font-medium hover:text-foreground transition-colors">✕ Skip</button>
                      <button className="text-xs px-3 py-1.5 rounded-md text-muted-foreground font-medium hover:text-foreground transition-colors ml-auto">👁 Preview</button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Suppressed Emails Section */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">🤚 Held Back by AI</h4>
                    <Badge variant="secondary" className="text-xs">{suppressedEmails.length} suppressed</Badge>
                  </div>
                  {suppressedEmails.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">No suppressed emails. AI sent everything it planned.</p>
                  ) : suppressedEmails.slice(0, 5).map((s: any) => (
                    <div key={s.id} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                      <span className="text-sm mt-0.5">🚫</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{s.contacts?.name || "Unknown"} — {s.subject}</p>
                        <p className="text-xs text-muted-foreground">{s.ai_context?.suppression_reason || "Frequency cap or low engagement"}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ),

          /* ═══ CAMPAIGNS (Templates + Blasts) ═══ */
          campaigns: (
            <CampaignsTab listings={(listings || []) as any} />
          ),

          /* ═══ CONTACTS (Journeys + Schedule merged) ═══ */
          journeys: (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Contact Journeys ({journeys?.length || 0})</h3>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-xs">Sort: Phase</Badge>
                </div>
              </div>
              {(!journeys || journeys.length === 0) ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No journey enrollments yet.</CardContent></Card>
              ) : journeys.map((j: any) => (
                <Card key={j.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{phaseIcons[j.current_phase] || "•"}</span>
                        <div>
                          <p className="text-sm font-medium">{j.contacts?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{j.journey_type} · {j.current_phase.replace(/_/g, " ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {j.is_paused && <Badge variant="outline" className="text-xs text-amber-600">Paused</Badge>}
                        <Badge variant="secondary" className="text-xs">{j.send_mode}</Badge>
                        {j.next_email_at && (
                          <span className="text-[10px] text-muted-foreground">
                            Next: {new Date(j.next_email_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ),

          /* ═══ ANALYTICS (Analytics + Activity merged) ═══ */
          analytics: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Open Rate" value={`${dashboard.openRate}%`} icon={<MailOpen className="h-5 w-5 text-muted-foreground" />} valueClassName={dashboard.openRate > 40 ? "text-emerald-600" : ""} />
                <StatCard label="Click Rate" value={`${dashboard.clickRate}%`} icon={<MousePointerClick className="h-5 w-5 text-muted-foreground" />} valueClassName={dashboard.clickRate > 10 ? "text-emerald-600" : ""} />
                <StatCard label="Emails Sent" value={dashboard.totalSent} icon={<Send className="h-5 w-5 text-muted-foreground" />} />
                <StatCard label="Industry Avg" value="21%" icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />} valueClassName="text-muted-foreground" />
              </div>

              {/* Activity Feed */}
              <Card>
                <CardContent className="p-5">
                  <h4 className="text-sm font-semibold mb-3">Recent Activity</h4>
                  {dashboard.recentEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
                  ) : dashboard.recentEvents.slice(0, 15).map((event: any) => (
                    <div key={event.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className="shrink-0">
                        {event.event_type === "opened" ? <MailOpen className="h-4 w-4 text-primary" /> :
                         event.event_type === "clicked" ? <Link2 className="h-4 w-4 text-emerald-600" /> :
                         <Send className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{event.contacts?.name}</span>
                        <span className="text-sm text-muted-foreground"> {event.event_type} </span>
                        <span className="text-sm text-muted-foreground truncate">{event.newsletters?.subject}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{new Date(event.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Email Log */}
              <Card>
                <CardContent className="p-5">
                  <h4 className="text-sm font-semibold mb-3">Email Log</h4>
                  {(!recentNewsletters || recentNewsletters.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No emails yet.</p>
                  ) : recentNewsletters.map((nl: any) => (
                    <div key={nl.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{nl.subject}</p>
                        <p className="text-xs text-muted-foreground">{nl.contacts?.name} · {nl.email_type?.replace(/_/g, " ")} · {nl.sent_at ? new Date(nl.sent_at).toLocaleDateString() : "draft"}</p>
                      </div>
                      <Badge className={`text-[10px] ${nl.status === "sent" ? "bg-emerald-100 text-emerald-700" : nl.status === "draft" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{nl.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ),

          /* ═══ SETTINGS ═══ */
          settings: (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Email Marketing Settings</h3>
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">AI Email Sending</p><p className="text-xs text-muted-foreground">Master switch — pause all AI-generated emails</p></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-sm font-medium text-emerald-600">Active</span></div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div><p className="text-sm font-medium">Global Frequency Cap</p><p className="text-xs text-muted-foreground">Maximum emails per contact per week</p></div>
                    <span className="text-sm font-semibold">3 / week</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div><p className="text-sm font-medium">Quiet Hours</p><p className="text-xs text-muted-foreground">No emails sent during this period</p></div>
                    <span className="text-sm font-semibold">8 PM – 7 AM</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div><p className="text-sm font-medium">Weekend Sending</p><p className="text-xs text-muted-foreground">Send emails on Saturday and Sunday</p></div>
                    <span className="text-sm text-muted-foreground">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div><p className="text-sm font-medium">Default Send Mode</p><p className="text-xs text-muted-foreground">Review first or auto-send for new contacts</p></div>
                    <span className="text-sm font-semibold">Review First</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <h4 className="text-sm font-semibold mb-3">Active Workflows ({workflows?.length || 0})</h4>
                  {workflows?.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div><p className="text-sm font-medium">{w.name}</p><p className="text-xs text-muted-foreground">Trigger: {w.trigger_type?.replace(/_/g, " ")}</p></div>
                      <Badge variant={w.is_active ? "default" : "secondary"} className="text-xs">{w.is_active ? "Active" : "Paused"}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ),
        }}
      </EmailMarketingTabs>
    </div>
  );
}

function StatCard({ label, value, icon, valueClassName }: { label: string; value: string | number; icon: React.ReactNode; valueClassName?: string }) {
  return (
    <Card>
      <CardContent className="p-5 text-center">
        <div className="flex justify-center mb-2">{icon}</div>
        <div className={`text-2xl font-bold ${valueClassName || "text-foreground"}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

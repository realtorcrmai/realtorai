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
  ] = await Promise.all([
    supabase.from("newsletters").select("id, subject, email_type, status, sent_at, created_at, contact_id, contacts(name, type)").order("created_at", { ascending: false }).limit(20),
    supabase.from("contact_journeys").select("id, contact_id, journey_type, current_phase, is_paused, next_email_at, send_mode, contacts(name, type, email)").order("created_at", { ascending: false }),
    supabase.from("workflows").select("id, name, slug, is_active, trigger_type").order("name"),
    supabase.from("listings").select("id, address, list_price, status").eq("status", "active").order("created_at", { ascending: false }).limit(10),
  ]);

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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Contacts" value={dashboard.totalContacts} icon={<Users className="h-5 w-5 text-muted-foreground" />} />
                <StatCard label="Emails Sent" value={dashboard.totalSent} icon={<Send className="h-5 w-5 text-muted-foreground" />} />
                <StatCard label="Open Rate" value={`${dashboard.openRate}%`} icon={<MailOpen className="h-5 w-5 text-muted-foreground" />} valueClassName={dashboard.openRate > 40 ? "text-emerald-600" : "text-amber-500"} />
                <StatCard label="Click Rate" value={`${dashboard.clickRate}%`} icon={<MousePointerClick className="h-5 w-5 text-muted-foreground" />} valueClassName={dashboard.clickRate > 10 ? "text-emerald-600" : "text-amber-500"} />
              </div>
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

          /* ═══ QUEUE ═══ */
          queue: (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{queue.length} Pending Approvals</h3>
              {queue.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No pending emails. AI will generate drafts as contacts progress.</CardContent></Card>
              ) : queue.map((n: any) => (
                <Card key={n.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{n.contacts?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{n.subject}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <Badge variant="outline" className="text-xs capitalize">{n.email_type?.replace(/_/g, " ")}</Badge>
                        <Badge variant="secondary" className="text-xs">{n.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ),

          /* ═══ CAMPAIGNS (Templates + Blasts merged) ═══ */
          campaigns: (
            <div className="space-y-6">
              {/* Templates */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Email Templates</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { emoji: "📧", name: "Welcome", rate: "67%" },
                    { emoji: "🏠", name: "Listing Alert", rate: "83%" },
                    { emoji: "📊", name: "Market Update", rate: "31%" },
                    { emoji: "🎉", name: "Just Sold", rate: "72%" },
                    { emoji: "🏡", name: "Open House", rate: "75%" },
                    { emoji: "🗺️", name: "Area Guide", rate: "45%" },
                    { emoji: "🎂", name: "Anniversary", rate: "68%" },
                    { emoji: "✨", name: "Luxury Showcase", rate: "—" },
                  ].map((t) => (
                    <Card key={t.name} className="cursor-pointer hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl mb-2">{t.emoji}</div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t.rate} open rate</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Listing Blasts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Listing Blasts</h3>
                  <p className="text-xs text-muted-foreground">Send announcements to all agents</p>
                </div>
                {(!listings || listings.length === 0) ? (
                  <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No active listings. Create a listing to blast to agents.</CardContent></Card>
                ) : listings.map((l: any) => (
                  <Card key={l.id} className="mb-2">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{l.address}</p>
                          <p className="text-xs text-muted-foreground">{l.list_price ? `$${Number(l.list_price).toLocaleString()}` : "Price TBD"}</p>
                        </div>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90">📧 Send Blast</button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
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

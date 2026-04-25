export const dynamic = "force-dynamic";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { notFound } from "next/navigation";

const EVENT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  delivered: { icon: "📨", label: "Delivered", color: "bg-blue-100 text-blue-700" },
  opened: { icon: "📬", label: "Opened", color: "bg-emerald-100 text-emerald-700" },
  clicked: { icon: "🖱️", label: "Clicked", color: "bg-primary/10 text-primary" },
  bounced: { icon: "🚫", label: "Bounced", color: "bg-red-100 text-red-700" },
  unsubscribed: { icon: "📭", label: "Unsubscribed", color: "bg-amber-100 text-amber-700" },
  complained: { icon: "⚠️", label: "Complained", color: "bg-red-100 text-red-700" },
};

const CLICK_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  book_showing: { label: "Book a Showing", icon: "🏠" },
  get_cma: { label: "Get a CMA", icon: "📊" },
  mortgage_calc: { label: "Mortgage Calculator", icon: "🏦" },
  listing: { label: "View Listing", icon: "📋" },
  investment: { label: "Investment Info", icon: "💰" },
  open_house_rsvp: { label: "Open House RSVP", icon: "📅" },
  school_info: { label: "School Info", icon: "🎓" },
  market_stats: { label: "Market Stats", icon: "📈" },
  neighbourhood: { label: "Neighbourhood", icon: "🏘️" },
  price_drop: { label: "Price Drop", icon: "🔻" },
  forwarded: { label: "Forwarded / Shared", icon: "📤" },
  contact_agent: { label: "Contact Agent", icon: "📞" },
  unsubscribe: { label: "Unsubscribe", icon: "🚫" },
  other: { label: "Other Links", icon: "🔗" },
};

const EMAIL_TYPE_LABELS: Record<string, string> = {
  new_listing_alert: "Listing Alert",
  market_update: "Market Update",
  just_sold: "Just Sold",
  open_house_invite: "Open House",
  neighbourhood_guide: "Neighbourhood Guide",
  home_anniversary: "Home Anniversary",
  welcome: "Welcome",
  reengagement: "Re-engagement",
  referral_ask: "Referral Ask",
  custom: "Custom",
};

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ emailId: string }>;
}) {
  const { emailId } = await params;
  const tc = await getAuthenticatedTenantClient();

  const [{ data: newsletter }, { data: events }] = await Promise.all([
    tc.from("newsletters")
      .select("id, contact_id, email_type, subject, status, sent_at, resend_message_id, ai_context, error_message, created_at, contacts(id, name, email, type)")
      .eq("id", emailId)
      .single(),

    tc.from("newsletter_events")
      .select("id, event_type, link_type, link_url, metadata, created_at")
      .eq("newsletter_id", emailId)
      .order("created_at", { ascending: true }),
  ]);

  if (!newsletter) {
    notFound();
  }

  const contact = Array.isArray(newsletter.contacts) ? newsletter.contacts[0] : newsletter.contacts;
  const contactName = (contact as any)?.name ?? "Unknown";
  const contactEmail = (contact as any)?.email ?? "";
  const contactType = (contact as any)?.type ?? "";

  const eventList = events ?? [];

  // Determine overall status based on events
  const hasDelivered = eventList.some((e: any) => e.event_type === "delivered");
  const hasOpened = eventList.some((e: any) => e.event_type === "opened");
  const hasClicked = eventList.some((e: any) => e.event_type === "clicked");
  const hasBounced = eventList.some((e: any) => e.event_type === "bounced");
  const hasUnsubscribed = eventList.some((e: any) => e.event_type === "unsubscribed");

  // Links clicked
  const clickedEvents = eventList.filter((e: any) => e.event_type === "clicked");

  // AI context info
  const aiContext = (newsletter.ai_context as any) || {};

  return (
    <>
      <PageHeader
        title="Email Detail"
        subtitle={newsletter.subject}
        breadcrumbs={[
          { label: "AI Agents", href: "/newsletters" },
          { label: "Analytics", href: "/newsletters/analytics" },
          { label: newsletter.subject.length > 30 ? newsletter.subject.slice(0, 27) + "..." : newsletter.subject },
        ]}
        actions={
          <a
            href="/newsletters/analytics"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            &larr; Back to Analytics
          </a>
        }
      />
      <div className="p-6 space-y-6">
        {/* ── Email Info ── */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Subject</p>
              <p className="text-sm font-semibold text-foreground">{newsletter.subject}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Recipient</p>
              <div className="flex items-center gap-2">
                <a href={`/contacts/${newsletter.contact_id}`} className="text-sm font-medium text-primary hover:underline">
                  {contactName}
                </a>
                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded capitalize">{contactType}</span>
              </div>
              {contactEmail && (
                <p className="text-xs text-muted-foreground mt-0.5">{contactEmail}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Email Type</p>
              <p className="text-sm font-medium text-foreground">
                {EMAIL_TYPE_LABELS[newsletter.email_type] || newsletter.email_type}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sent</p>
              <p className="text-sm font-medium text-foreground">
                {newsletter.sent_at
                  ? new Date(newsletter.sent_at).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Not sent yet"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Delivery Status Pipeline ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            📧 Delivery Status
          </h2>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusStep
                icon="📤"
                label="Sent"
                active={newsletter.status === "sent"}
                done={true}
              />
              <Arrow />
              <StatusStep
                icon="📨"
                label="Delivered"
                active={hasDelivered}
                done={hasDelivered}
                error={hasBounced}
              />
              <Arrow />
              <StatusStep
                icon="📬"
                label="Opened"
                active={hasOpened}
                done={hasOpened}
              />
              <Arrow />
              <StatusStep
                icon="🖱️"
                label="Clicked"
                active={hasClicked}
                done={hasClicked}
              />
              {hasBounced && (
                <>
                  <span className="text-muted-foreground mx-1">|</span>
                  <StatusStep icon="🚫" label="Bounced" active={true} done={false} error={true} />
                </>
              )}
              {hasUnsubscribed && (
                <>
                  <span className="text-muted-foreground mx-1">|</span>
                  <StatusStep icon="📭" label="Unsubscribed" active={true} done={false} error={true} />
                </>
              )}
            </div>

            {newsletter.error_message && (
              <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                Error: {newsletter.error_message}
              </div>
            )}
          </div>
        </section>

        {/* ── Links Clicked ── */}
        {clickedEvents.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              🔗 Links Clicked ({clickedEvents.length})
            </h2>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Time</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Classification</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clickedEvents.map((ev: any) => {
                      const info = CLICK_TYPE_LABELS[ev.link_type] || CLICK_TYPE_LABELS.other;
                      return (
                        <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(ev.created_at)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1 text-xs font-medium">
                              {info.icon} {info.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[300px] truncate">
                            {ev.link_url || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── Event Timeline ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            ⏱️ Event Timeline ({eventList.length} events)
          </h2>
          {eventList.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">No events recorded yet for this email.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-4">
                  {eventList.map((ev: any, idx: number) => {
                    const cfg = EVENT_CONFIG[ev.event_type] ?? { icon: "🔵", label: ev.event_type, color: "bg-zinc-100 text-zinc-600" };
                    return (
                      <div key={ev.id} className="relative flex items-start gap-4 pl-2">
                        {/* Timeline dot */}
                        <div className="relative z-10 flex items-center justify-center w-5 h-5 bg-card border border-border rounded-full text-xs shrink-0">
                          {cfg.icon}
                        </div>

                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatTime(ev.created_at)}
                            </span>
                          </div>
                          {ev.link_type && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {CLICK_TYPE_LABELS[ev.link_type]?.icon || "🔗"}{" "}
                              {CLICK_TYPE_LABELS[ev.link_type]?.label || ev.link_type}
                              {ev.link_url && (
                                <span className="ml-1 text-muted-foreground/60">
                                  — {ev.link_url.length > 50 ? ev.link_url.slice(0, 47) + "..." : ev.link_url}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── AI Context (if present) ── */}
        {Object.keys(aiContext).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              🧠 AI Context
            </h2>
            <div className="bg-card border border-border rounded-lg p-4">
              <dl className="space-y-2 text-xs">
                {aiContext.tone && (
                  <div className="flex gap-2">
                    <dt className="font-semibold text-muted-foreground w-28 shrink-0">Tone:</dt>
                    <dd className="text-foreground">{aiContext.tone}</dd>
                  </div>
                )}
                {aiContext.strategy && (
                  <div className="flex gap-2">
                    <dt className="font-semibold text-muted-foreground w-28 shrink-0">Strategy:</dt>
                    <dd className="text-foreground">{aiContext.strategy}</dd>
                  </div>
                )}
                {aiContext.personalization_notes && (
                  <div className="flex gap-2">
                    <dt className="font-semibold text-muted-foreground w-28 shrink-0">Personalization:</dt>
                    <dd className="text-foreground">{aiContext.personalization_notes}</dd>
                  </div>
                )}
                {aiContext.quality_score !== undefined && (
                  <div className="flex gap-2">
                    <dt className="font-semibold text-muted-foreground w-28 shrink-0">Quality Score:</dt>
                    <dd className="text-foreground font-medium">{aiContext.quality_score}/100</dd>
                  </div>
                )}
              </dl>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

/* ── Helper Components ── */

function StatusStep({
  icon,
  label,
  active,
  done,
  error,
}: {
  icon: string;
  label: string;
  active: boolean;
  done: boolean;
  error?: boolean;
}) {
  const bg = error
    ? "bg-red-100 border-red-300 text-red-700"
    : done
      ? "bg-emerald-100 border-emerald-300 text-emerald-700"
      : "bg-muted border-border text-muted-foreground";

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold ${bg}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function Arrow() {
  return (
    <span className="text-muted-foreground text-xs mx-0.5">→</span>
  );
}

function formatTime(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

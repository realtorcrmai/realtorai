export const dynamic = "force-dynamic";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AgentDashboardPage() {
  const tc = await getAuthenticatedTenantClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();
  const sevenDaysAgoISO = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { data: runsToday },
    { data: allRuns },
    { data: decisionsToday },
    { data: recentDecisions },
    { data: sentToday },
    { data: trustLevels },
    { data: costToday },
  ] = await Promise.all([
    // Runs today
    tc.from("agent_runs")
      .select("id, trigger_type, contact_ids_evaluated, decisions_made, status, estimated_cost_usd, started_at, completed_at, error_message")
      .gte("created_at", todayISO)
      .order("created_at", { ascending: false }),

    // Recent runs (last 7 days)
    tc.from("agent_runs")
      .select("id, trigger_type, contact_ids_evaluated, decisions_made, status, estimated_cost_usd, started_at, completed_at, error_message")
      .gte("created_at", sevenDaysAgoISO)
      .order("created_at", { ascending: false })
      .limit(50),

    // Decisions today
    tc.from("agent_decisions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayISO),

    // Recent decisions with contact info
    tc.from("agent_decisions")
      .select("id, contact_id, decision_type, reasoning, created_at, contacts(name)")
      .order("created_at", { ascending: false })
      .limit(30),

    // Emails sent today via agent_drafts
    tc.from("agent_drafts")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", todayISO),

    // Trust distribution
    tc.from("contact_trust_levels")
      .select("level"),

    // Total cost today
    tc.from("agent_runs")
      .select("estimated_cost_usd")
      .gte("created_at", todayISO),
  ]);

  // Summary calculations
  const runsCount = runsToday?.length ?? 0;
  const decisionsCount = (decisionsToday as any) ?? 0;
  const sentCount = (sentToday as any) ?? 0;
  const totalCost = (costToday ?? []).reduce(
    (sum: number, r: any) => sum + (parseFloat(r.estimated_cost_usd) || 0),
    0
  );

  // Trust distribution
  const trustDist = { L0: 0, L1: 0, L2: 0, L3: 0 };
  for (const t of trustLevels ?? []) {
    const key = `L${t.level}` as keyof typeof trustDist;
    if (key in trustDist) trustDist[key]++;
  }
  const totalTrust = trustDist.L0 + trustDist.L1 + trustDist.L2 + trustDist.L3;

  const runs = allRuns ?? [];
  const decisions = recentDecisions ?? [];

  return (
    <>
      <PageHeader
        title="Agent Dashboard"
        subtitle="Newsletter agent activity, decisions, and trust levels"
        breadcrumbs={[
          { label: "Email Marketing", href: "/newsletters" },
          { label: "Agent Dashboard" },
        ]}
        actions={
          <a
            href="/newsletters"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            &larr; Back to Email Marketing
          </a>
        }
      />
      <div className="p-6 space-y-6">
        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard icon="🏃" label="Runs Today" value={runsCount} />
          <SummaryCard icon="🧠" label="Decisions Made" value={decisionsCount} />
          <SummaryCard icon="📧" label="Emails Sent" value={sentCount} />
          <SummaryCard icon="💰" label="Total Cost" value={`$${totalCost.toFixed(4)}`} />
        </div>

        {/* ── Trust Distribution ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Trust Distribution
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TrustCard level={0} label="L0 New" count={trustDist.L0} total={totalTrust} color="bg-zinc-100 text-zinc-700 border-zinc-200" />
            <TrustCard level={1} label="L1 Proven" count={trustDist.L1} total={totalTrust} color="bg-blue-50 text-blue-700 border-blue-200" />
            <TrustCard level={2} label="L2 Engaged" count={trustDist.L2} total={totalTrust} color="bg-amber-50 text-amber-700 border-amber-200" />
            <TrustCard level={3} label="L3 Deal" count={trustDist.L3} total={totalTrust} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
          </div>
        </section>

        {/* ── Recent Runs ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Recent Runs
          </h2>
          {runs.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">No agent runs yet. The agent will run on its configured schedule.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Time</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Trigger</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Contacts</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Decisions</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run: any) => {
                      const contactCount = Array.isArray(run.contact_ids_evaluated) ? run.contact_ids_evaluated.length : 0;
                      const cost = parseFloat(run.estimated_cost_usd) || 0;
                      return (
                        <tr key={run.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(run.started_at)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1 text-xs font-medium">
                              {run.trigger_type === "scheduled" ? "🕐" : run.trigger_type === "event" ? "⚡" : "👤"}
                              {" "}{run.trigger_type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs">{contactCount}</td>
                          <td className="px-4 py-2.5 text-center text-xs font-medium">{run.decisions_made ?? 0}</td>
                          <td className="px-4 py-2.5 text-center">
                            <RunStatusBadge status={run.status} />
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                            ${cost.toFixed(4)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── Recent Decisions ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Recent Decisions
          </h2>
          {decisions.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">No decisions recorded yet. Decisions appear after the agent evaluates contacts.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Time</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Contact</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Decision</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Reasoning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decisions.map((d: any) => {
                      const contact = Array.isArray(d.contacts) ? d.contacts[0] : d.contacts;
                      const name = contact?.name ?? "Unknown";
                      const reasoning = d.reasoning ?? "";
                      const truncatedReasoning = reasoning.length > 120 ? reasoning.slice(0, 117) + "..." : reasoning;

                      return (
                        <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(d.created_at)}
                          </td>
                          <td className="px-4 py-2.5">
                            <a href={`/contacts/${d.contact_id}`} className="text-xs font-medium text-primary hover:underline">
                              {name}
                            </a>
                          </td>
                          <td className="px-4 py-2.5">
                            <DecisionBadge type={d.decision_type} />
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-md">
                            {truncatedReasoning || "No reasoning recorded"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/* ── Helper Components ── */

function SummaryCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function TrustCard({ level, label, count, total, color }: { level: number; label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-[10px] font-medium">{pct}%</span>
      </div>
      <p className="text-2xl font-bold">{count}</p>
      <div className="w-full h-1.5 bg-black/5 rounded-full mt-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-current opacity-40"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    running: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-zinc-100 text-zinc-600",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${styles[status] ?? styles.cancelled}`}>
      {status}
    </span>
  );
}

function DecisionBadge({ type }: { type: string }) {
  const config: Record<string, { icon: string; style: string }> = {
    send_email: { icon: "📧", style: "bg-emerald-100 text-emerald-700" },
    skip: { icon: "⏭️", style: "bg-zinc-100 text-zinc-600" },
    defer: { icon: "⏸️", style: "bg-amber-100 text-amber-700" },
    queue_approval: { icon: "📋", style: "bg-blue-100 text-blue-700" },
  };
  const c = config[type] ?? { icon: "🔵", style: "bg-zinc-100 text-zinc-600" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${c.style}`}>
      {c.icon} {type.replace(/_/g, " ")}
    </span>
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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

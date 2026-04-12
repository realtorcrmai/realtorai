
import Link from "next/link";
import { getAuthenticatedTenantClient, getRealtorId } from "@/lib/supabase/tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/* ── Server Actions ── */

async function approveSuggestion(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (!id) return;
  const supabase = createAdminClient();
  await supabase
    .from("agent_learning_log")
    .update({ approved: true })
    .eq("id", id);
  revalidatePath("/newsletters/learning");
}

async function rejectSuggestion(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (!id) return;
  const supabase = createAdminClient();
  await supabase
    .from("agent_learning_log")
    .update({ approved: false })
    .eq("id", id);
  revalidatePath("/newsletters/learning");
}

/* ── Page ── */

export default async function AILearningReportPage() {
  const realtorId = await getRealtorId();
  const tc = await getAuthenticatedTenantClient();
  const supabase = createAdminClient();

  // Fetch all data in parallel
  const [
    { data: agentConfig },
    { data: autoAdjustments },
    { data: pendingSuggestions },
    { data: recentVoiceRules },
    { data: sentNewsletters },
    { data: openEvents },
  ] = await Promise.all([
    // Realtor agent config (voice rules, content rankings, learning metadata)
    supabase
      .from("realtor_agent_config")
      .select("voice_rules, content_rankings, total_emails_analyzed, learning_confidence, last_learning_cycle, default_send_day, default_send_hour")
      .eq("realtor_id", realtorId)
      .single(),

    // Auto-adjustments (approved = true, auto_applied = true)
    supabase
      .from("agent_learning_log")
      .select("id, change_type, field_changed, old_value, new_value, reason, created_at")
      .eq("realtor_id", realtorId)
      .eq("auto_applied", true)
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(20),

    // Pending suggestions (approved IS NULL)
    supabase
      .from("agent_learning_log")
      .select("id, change_type, field_changed, old_value, new_value, reason, created_at")
      .eq("realtor_id", realtorId)
      .is("approved", null)
      .order("created_at", { ascending: false })
      .limit(20),

    // Voice rule entries specifically (for "when learned" timestamps)
    supabase
      .from("agent_learning_log")
      .select("id, new_value, reason, created_at")
      .eq("realtor_id", realtorId)
      .eq("change_type", "voice_rule")
      .order("created_at", { ascending: false })
      .limit(20),

    // Sent newsletters count (for performance stats)
    tc.from("newsletters")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent"),

    // Open events count
    tc.from("newsletter_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "opened"),
  ]);

  const voiceRules: string[] = (agentConfig?.voice_rules as string[]) || [];
  const contentRankings: Array<{ type: string; openRate: number; clickRate: number; effectiveness: number; sent: number }> =
    (agentConfig?.content_rankings as any[]) || [];
  const totalAnalyzed = agentConfig?.total_emails_analyzed || 0;
  const confidence = agentConfig?.learning_confidence || "low";
  const lastCycle = agentConfig?.last_learning_cycle;

  // Build voice rule cards with timestamps from learning log
  const voiceRuleCards = voiceRules.map((rule, i) => {
    // Find the log entry that added this rule
    const logEntry = (recentVoiceRules || []).find((entry) => {
      const newVal = entry.new_value as string[];
      return Array.isArray(newVal) && newVal.includes(rule);
    });
    return {
      rule,
      learnedAt: logEntry?.created_at || null,
      source: logEntry?.reason?.includes("edit") ? "realtor_edit" : "explicit",
    };
  });

  const totalSent = (sentNewsletters as any)?.length ?? 0;
  // Use the count from the head query
  const sentCount = totalAnalyzed || 0;
  const openCount = (openEvents as any)?.length ?? 0;

  const emptyState = !agentConfig && (!autoAdjustments || autoAdjustments.length === 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/newsletters"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              🧠 AI Learning Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              What your AI newsletter agent has learned from your edits, emails, and engagement data
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`lf-badge ${
              confidence === "high"
                ? "lf-badge-done"
                : confidence === "medium"
                ? "lf-badge-active"
                : "lf-badge-pending"
            }`}
          >
            {confidence === "high" ? "🟢" : confidence === "medium" ? "🟡" : "🟠"}{" "}
            {confidence} confidence
          </span>
          {lastCycle && (
            <span className="text-xs text-muted-foreground">
              Last cycle: {new Date(lastCycle).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {emptyState ? (
        <div className="lf-card p-12 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No learning data yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The AI will start learning from your edits in the approval queue.
            As you review, edit, and approve AI-drafted emails, voice rules and
            performance patterns will appear here.
          </p>
          <Link
            href="/newsletters/queue"
            className="lf-btn mt-6 inline-block"
          >
            Go to Approval Queue
          </Link>
        </div>
      ) : (
        <>
          {/* ═══ Section 1: Current Voice Rules ═══ */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              🎙️ Current Voice Rules
            </h2>
            {voiceRuleCards.length === 0 ? (
              <div className="lf-card p-6 text-center text-muted-foreground">
                <p>No voice rules learned yet. Edit AI-drafted emails in the approval queue and the AI will extract your writing preferences.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {voiceRuleCards.map((card, i) => (
                  <div key={i} className="lf-card p-4">
                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      &ldquo;{card.rule}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>
                        {card.source === "realtor_edit" ? "📝 From your edit" : "💡 Extracted"}
                      </span>
                      {card.learnedAt && (
                        <span>
                          {new Date(card.learnedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ═══ Section 2: Auto-Adjustments ═══ */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              ⚡ Auto-Adjustments
            </h2>
            {!autoAdjustments || autoAdjustments.length === 0 ? (
              <div className="lf-card p-6 text-center text-muted-foreground">
                <p>No auto-adjustments yet. The AI will optimize send times, content types, and frequency as it gathers engagement data.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {autoAdjustments.map((adj) => (
                  <div key={adj.id} className="lf-card p-4 flex items-start gap-3">
                    <span className="text-lg mt-0.5">
                      {adj.change_type === "content_ranking"
                        ? "📊"
                        : adj.field_changed === "default_send_day" || adj.field_changed === "default_send_hour"
                        ? "🕐"
                        : adj.change_type === "voice_rule"
                        ? "🎙️"
                        : adj.change_type === "frequency"
                        ? "📬"
                        : "🔧"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatFieldName(adj.field_changed)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {adj.reason}
                      </p>
                      {adj.old_value != null && adj.new_value != null && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-red-500/70 line-through">
                            {formatValue(adj.old_value)}
                          </span>
                          <span className="text-muted-foreground">&rarr;</span>
                          <span className="text-emerald-600 font-medium">
                            {formatValue(adj.new_value)}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(adj.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ═══ Section 3: Pending Suggestions ═══ */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              💡 Pending Suggestions
              {pendingSuggestions && pendingSuggestions.length > 0 && (
                <span className="lf-badge lf-badge-pending ml-2 text-xs">
                  {pendingSuggestions.length}
                </span>
              )}
            </h2>
            {!pendingSuggestions || pendingSuggestions.length === 0 ? (
              <div className="lf-card p-6 text-center text-muted-foreground">
                <p>No pending suggestions. When the AI identifies changes that need your approval, they will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingSuggestions.map((sug) => (
                  <div key={sug.id} className="lf-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">🤔</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {formatFieldName(sug.field_changed)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {sug.reason}
                        </p>
                        {sug.new_value != null && (
                          <p className="text-xs text-foreground/70 mt-1">
                            Suggested: <span className="font-medium">{formatValue(sug.new_value)}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <form action={approveSuggestion}>
                          <input type="hidden" name="id" value={sug.id} />
                          <button
                            type="submit"
                            className="lf-btn-sm lf-btn-success"
                            aria-label="Approve suggestion"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={rejectSuggestion}>
                          <input type="hidden" name="id" value={sug.id} />
                          <button
                            type="submit"
                            className="lf-btn-sm lf-btn-danger"
                            aria-label="Reject suggestion"
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 ml-8">
                      {new Date(sug.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ═══ Section 4: Performance Impact ═══ */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              📈 Performance Impact
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lf-card p-4 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {sentCount.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Emails Analyzed</div>
              </div>
              <div className="lf-card p-4 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {voiceRules.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Voice Rules Learned</div>
              </div>
              <div className="lf-card p-4 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {(autoAdjustments || []).length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Auto-Adjustments Made</div>
              </div>
              <div className="lf-card p-4 text-center">
                <div className="text-2xl font-bold text-foreground capitalize">
                  {confidence}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Learning Confidence</div>
              </div>
            </div>

            {/* Content Rankings */}
            {contentRankings.length > 0 && (
              <div className="lf-card p-4 mt-3">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  🏆 Content Type Rankings
                </h3>
                <div className="space-y-2">
                  {contentRankings.map((cr, i) => {
                    const barWidth = Math.max(5, Math.round(cr.effectiveness * 100));
                    return (
                      <div key={cr.type} className="flex items-center gap-3">
                        <span className="text-sm w-5 text-muted-foreground text-right">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </span>
                        <span className="text-sm font-medium text-foreground w-40 truncate capitalize">
                          {cr.type.replace(/_/g, " ")}
                        </span>
                        <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${barWidth}%`,
                              background: i === 0
                                ? "linear-gradient(90deg, var(--lf-indigo), var(--lf-teal))"
                                : i === 1
                                ? "linear-gradient(90deg, var(--lf-indigo), var(--lf-coral))"
                                : "var(--lf-indigo)",
                              opacity: 1 - i * 0.15,
                            }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground w-28 text-right">
                          {Math.round(cr.openRate * 100)}% open &middot;{" "}
                          {Math.round(cr.clickRate * 100)}% click
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Optimal Send Time */}
            {agentConfig && (agentConfig.default_send_day || agentConfig.default_send_hour) && (
              <div className="lf-card p-4 mt-3">
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  🕐 Optimal Send Time (Learned)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Best day:{" "}
                  <span className="font-medium text-foreground capitalize">
                    {agentConfig.default_send_day || "tuesday"}
                  </span>
                  {" "}&middot;{" "}Best hour:{" "}
                  <span className="font-medium text-foreground">
                    {formatHour(agentConfig.default_send_hour ?? 9)}
                  </span>
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* ── Helpers ── */

function formatFieldName(field: string): string {
  const map: Record<string, string> = {
    content_rankings: "Content Type Rankings",
    default_send_day: "Optimal Send Day",
    default_send_hour: "Optimal Send Hour",
    voice_rules: "Voice Rules",
    frequency_caps: "Frequency Caps",
    escalation_thresholds: "Escalation Thresholds",
    content_type_removal: "Content Type Removal",
    buyer_sequence: "Buyer Email Sequence",
    seller_sequence: "Seller Email Sequence",
  };
  return map[field] || field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    if (typeof val[0] === "string") return val.join(", ");
    // Content rankings array — show count
    return `${val.length} items`;
  }
  if (typeof val === "object") {
    // Try to show a meaningful summary
    const str = JSON.stringify(val);
    return str.length > 60 ? str.slice(0, 57) + "..." : str;
  }
  return String(val);
}

function formatHour(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}

import { createAdminClient } from "@/lib/supabase/admin";
import {
  VoiceAnalytics,
  type VoiceSession,
  type VoiceCall,
  type DateRange,
} from "@/components/voice-agent/VoiceAnalytics";


const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

function getDateCutoff(range: DateRange): string {
  const d = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function parseDateRange(value: string | undefined): DateRange {
  if (value === "30d" || value === "90d") return value;
  return "7d";
}

export default async function VoiceAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const dateRange = parseDateRange(params.range);
  const cutoff = getDateCutoff(dateRange);
  const tenantId = DEFAULT_TENANT_ID;

  const supabase = createAdminClient();

  /* Fetch sessions */
  const { data: rawSessions } = await supabase
    .from("voice_sessions")
    .select("id, tenant_id, platform, started_at, ended_at, duration_seconds")
    .eq("tenant_id", tenantId)
    .gte("started_at", cutoff)
    .order("started_at", { ascending: false })
    .limit(500);

  /* Fetch calls */
  const { data: rawCalls } = await supabase
    .from("voice_calls")
    .select("id, session_id, tenant_id, tool_name, cost_usd, created_at, duration_ms")
    .eq("tenant_id", tenantId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(2000);

  const sessions: VoiceSession[] = (rawSessions ?? []) as VoiceSession[];
  const calls: VoiceCall[] = (rawCalls ?? []) as VoiceCall[];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="lf-glass p-4 rounded-xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1
              className="text-xl font-bold"
              style={{
                background:
                  "linear-gradient(135deg, var(--lf-indigo), var(--lf-coral))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              🎙️ Voice Analytics
            </h1>
            <p className="text-sm text-[var(--lf-muted)] mt-1">
              Usage, performance, and cost metrics for the voice agent
            </p>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-1">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <a
                key={r}
                href={`?range=${r}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  dateRange === r
                    ? "bg-[var(--lf-indigo)] text-white"
                    : "bg-white/60 text-[var(--lf-muted)] hover:bg-white"
                }`}
              >
                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Component */}
      <VoiceAnalytics
        sessions={sessions}
        calls={calls}
        dateRange={dateRange}
      />
    </div>
  );
}

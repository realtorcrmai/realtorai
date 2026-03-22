import { createAdminClient } from "@/lib/supabase/admin";

export type TrustLevel = "ghost" | "copilot" | "supervised" | "autonomous";

const TRUST_ORDER: TrustLevel[] = ["ghost", "copilot", "supervised", "autonomous"];

export interface TrustMetrics {
  emailsAtCurrentLevel: number;
  editRate: number;
  approvalRate: number;
  skipRate: number;
}

export async function getGlobalTrustLevel(): Promise<TrustLevel> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agent_settings")
    .select("value")
    .eq("key", "global_trust_level")
    .single();

  if (!data) return "ghost";
  const val = typeof data.value === "string" ? data.value : JSON.stringify(data.value);
  return val.replace(/"/g, "") as TrustLevel;
}

export async function getEffectiveTrustLevel(contactId?: string): Promise<TrustLevel> {
  if (contactId) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("contacts")
      .select("agent_trust_level")
      .eq("id", contactId)
      .single();

    if (data?.agent_trust_level) {
      return data.agent_trust_level as TrustLevel;
    }
  }
  return getGlobalTrustLevel();
}

export async function setGlobalTrustLevel(level: TrustLevel, reason: string): Promise<void> {
  const supabase = createAdminClient();
  const previous = await getGlobalTrustLevel();

  await supabase
    .from("agent_settings")
    .update({ value: JSON.stringify(level), updated_at: new Date().toISOString() })
    .eq("key", "global_trust_level");

  await supabase.from("trust_audit_log").insert({
    previous_level: previous,
    new_level: level,
    reason,
    triggered_by: "manual",
  });
}

export async function setContactTrustOverride(
  contactId: string,
  level: TrustLevel | null
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("contacts")
    .update({ agent_trust_level: level })
    .eq("id", contactId);
}

export async function calculateTrustMetrics(): Promise<TrustMetrics> {
  const supabase = createAdminClient();
  const currentLevel = await getGlobalTrustLevel();

  // Get the timestamp when current level was set
  const { data: auditLog } = await supabase
    .from("trust_audit_log")
    .select("created_at")
    .eq("new_level", currentLevel)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const since = auditLog?.created_at ?? new Date(Date.now() - 90 * 86400000).toISOString();

  // Count decisions at current level
  const { data: decisions } = await supabase
    .from("agent_decisions")
    .select("id, decision, outcome")
    .gte("created_at", since);

  const total = decisions?.length ?? 0;
  const sends = decisions?.filter((d) => d.decision === "send") ?? [];
  const approved = sends.filter((d) => d.outcome === "approved" || d.outcome === "sent");
  const edited = sends.filter((d) => d.outcome === "edited");
  const skipped = sends.filter((d) => d.outcome === "skipped_by_user");

  const editRate = sends.length > 0 ? edited.length / sends.length : 0;
  const approvalRate = sends.length > 0 ? approved.length / sends.length : 0;
  const skipRate = sends.length > 0 ? skipped.length / sends.length : 0;

  return {
    emailsAtCurrentLevel: total,
    editRate,
    approvalRate,
    skipRate,
  };
}

export async function evaluateTrustPromotion(): Promise<{
  eligible: boolean;
  currentLevel: TrustLevel;
  suggestedLevel: TrustLevel | null;
  metrics: TrustMetrics;
}> {
  const currentLevel = await getGlobalTrustLevel();
  const metrics = await calculateTrustMetrics();

  const supabase = createAdminClient();
  const { data: thresholds } = await supabase
    .from("agent_settings")
    .select("value")
    .eq("key", "trust_promotion_threshold")
    .single();

  const config = thresholds?.value ?? { min_emails: 20, max_edit_rate: 0.15, min_approval_rate: 0.50 };

  const currentIdx = TRUST_ORDER.indexOf(currentLevel);
  if (currentIdx >= TRUST_ORDER.length - 1) {
    return { eligible: false, currentLevel, suggestedLevel: null, metrics };
  }

  const eligible =
    metrics.emailsAtCurrentLevel >= config.min_emails &&
    metrics.editRate <= config.max_edit_rate &&
    metrics.approvalRate >= config.min_approval_rate;

  return {
    eligible,
    currentLevel,
    suggestedLevel: eligible ? TRUST_ORDER[currentIdx + 1] : null,
    metrics,
  };
}

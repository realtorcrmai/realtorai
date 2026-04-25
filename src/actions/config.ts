"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

// ── Read Config ─────────────────────────────────────────────
export async function getRealtorConfig() {
  try {
    const tc = await getAuthenticatedTenantClient();
    const { data } = await tc
      .from("realtor_agent_config")
      .select("*")
      .maybeSingle();
    return data;
  } catch {
    // Fallback for unauthenticated contexts (cron jobs)
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("realtor_agent_config")
      .select("*")
      .limit(1)
      .maybeSingle();
    return data;
  }
}

// ── Update Settings ─────────────────────────────────────────
export async function updateRealtorSettings(settings: {
  sending_enabled?: boolean;
  skip_weekends?: boolean;
  quiet_hours?: { start: string; end: string };
  frequency_caps?: Record<string, unknown>;
  default_send_day?: string;
  default_send_hour?: number;
  default_send_mode?: string;
  ai_quality_tier?: string;
  brand_name?: string;
  tone?: string;
  writing_style_rules?: string[];
  content_rankings?: Array<{ type: string; effectiveness: number }>;
  listing_blast_enabled?: boolean;
}) {
  const supabase = createAdminClient();
  const config = await getRealtorConfig();
  if (!config) return { error: "Config not found" };

  // Merge brand_config-scoped settings
  const updates: Record<string, unknown> = { ...settings, updated_at: new Date().toISOString() };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brandConfig = (config.brand_config as any) || {};
  let brandConfigChanged = false;

  if (settings.default_send_mode) {
    brandConfig.default_send_mode = settings.default_send_mode;
    delete updates.default_send_mode;
    brandConfigChanged = true;
  }

  if (typeof settings.listing_blast_enabled === "boolean") {
    brandConfig.listing_blast_enabled = settings.listing_blast_enabled;
    delete updates.listing_blast_enabled;
    brandConfigChanged = true;
  }

  if (brandConfigChanged) {
    updates.brand_config = brandConfig;
  }

  const { error } = await supabase
    .from("realtor_agent_config")
    .update(updates)
    .eq("id", config.id);

  if (error) return { error: error.message };
  revalidatePath("/newsletters");
  return { success: true };
}

// ── Automation Rules ────────────────────────────────────────
export type AutomationRule = {
  id: string;
  trigger: string;
  template: string;
  recipients: string;
  approval: "review" | "auto";
  enabled: boolean;
};

export async function getAutomationRules(): Promise<AutomationRule[]> {
  const config = await getRealtorConfig();
  if (!config?.brand_config) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rules = (config.brand_config as any).automation_rules;
  return Array.isArray(rules) ? rules : [];
}

export async function saveAutomationRules(rules: AutomationRule[]) {
  const supabase = createAdminClient();
  const config = await getRealtorConfig();
  if (!config) return { error: "Config not found" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brandConfig = (config.brand_config as any) || {};
  brandConfig.automation_rules = rules;

  const { error } = await supabase
    .from("realtor_agent_config")
    .update({
      brand_config: brandConfig,
      updated_at: new Date().toISOString(),
    })
    .eq("id", config.id);

  if (error) return { error: error.message };
  revalidatePath("/newsletters");
  return { success: true };
}

// ── Greeting Automations ────────────────────────────────────
export type GreetingRule = {
  id: string;
  occasion: string;
  recipients: string;
  approval: "review" | "auto";
  personalNote: string;
  enabled: boolean;
};

export async function getGreetingRules(): Promise<GreetingRule[]> {
  const config = await getRealtorConfig();
  if (!config?.brand_config) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rules = (config.brand_config as any).greeting_rules;
  return Array.isArray(rules) ? rules : [];
}

export async function saveGreetingRules(rules: GreetingRule[]) {
  const supabase = createAdminClient();
  const config = await getRealtorConfig();
  if (!config) return { error: "Config not found" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brandConfig = (config.brand_config as any) || {};
  brandConfig.greeting_rules = rules;

  const { error } = await supabase
    .from("realtor_agent_config")
    .update({
      brand_config: brandConfig,
      updated_at: new Date().toISOString(),
    })
    .eq("id", config.id);

  if (error) return { error: error.message };
  revalidatePath("/newsletters");
  return { success: true };
}

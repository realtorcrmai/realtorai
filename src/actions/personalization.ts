"use server";

import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Save a single personalization step to the user's record (P10).
 * Each screen saves independently — no race conditions since each writes a different column.
 */
export async function savePersonalizationStep(
  field: "onboarding_persona" | "onboarding_market" | "onboarding_team_size" | "onboarding_experience" | "onboarding_focus",
  value: string | string[] | null,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ [field]: value })
    .eq("id", session.user.id);

  if (error) {
    console.error(`[personalization] Error saving ${field}:`, error.message);
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Mark personalization as complete — sets personalization_completed = true.
 * Called from Screen 6 after the loading animation.
 */
export async function completePersonalization() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ personalization_completed: true })
    .eq("id", session.user.id);

  if (error) {
    console.error("[personalization] Error completing:", error.message);
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Get saved personalization data for resuming mid-wizard.
 * Returns the first unanswered screen index (0-5).
 */
export async function getPersonalizationProgress() {
  const session = await auth();
  if (!session?.user?.id) return { screen: 0, data: {} };

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("onboarding_persona, onboarding_market, onboarding_team_size, onboarding_experience, onboarding_focus, personalization_completed")
    .eq("id", session.user.id)
    .single();

  if (!user) return { screen: 0, data: {} };

  // Already completed — return screen 5 (redirect handler in page will redirect)
  if (user.personalization_completed) return { screen: 5, data: user, completed: true };

  // Find first unanswered screen (null = unanswered, default values = answered)
  // Screen order: persona(0), market(1), team_size(2), experience(3), focus(4), loading(5)
  const fields = [
    { key: "onboarding_persona", default: '["solo_agent"]' },
    { key: "onboarding_market", default: '["residential"]' },
    { key: "onboarding_team_size", default: "just_me" },
    { key: "onboarding_experience", default: "new" },
    { key: "onboarding_focus", default: "[]" },
  ];

  // Check which screens have been explicitly saved (non-default values mean user answered)
  // We track this by checking if any field was explicitly set via savePersonalizationStep
  // For simplicity: resume at screen 0 if persona is still default (user hasn't started)
  // This is a heuristic — exact tracking would need a separate progress column
  let screen = 0;
  for (let i = 0; i < fields.length; i++) {
    const val = user[fields[i].key as keyof typeof user];
    const isDefault = val === null || JSON.stringify(val) === fields[i].default || val === fields[i].default;
    if (!isDefault) {
      screen = i + 1; // This screen was answered, resume at next
    } else {
      break; // First unanswered screen
    }
  }

  return { screen: Math.min(screen, 5), data: user };
}

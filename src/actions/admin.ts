"use server";

import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { FEATURE_KEYS, getUserFeatures, type FeatureKey } from "@/lib/features";
import { PLANS } from "@/lib/plans";
import { trackEvent } from "@/lib/analytics";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    throw new Error("Unauthorized: admin access required");
  }
  return session;
}

export async function getUsers() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return { error: "Failed to fetch users" };
  }
  return { data };
}

export async function updateUserFeatures(
  userId: string,
  enabledFeatures: string[]
) {
  await requireAdmin();

  // Validate all feature keys
  const valid = enabledFeatures.every((f) =>
    (FEATURE_KEYS as readonly string[]).includes(f)
  );
  if (!valid) {
    return { error: "Invalid feature keys" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ enabled_features: enabledFeatures as FeatureKey[] })
    .eq("id", userId);

  if (error) {
    return { error: "Failed to update features" };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  await requireAdmin();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) {
    return { error: "Failed to update user status" };
  }

  revalidatePath("/admin");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 1. Search users with filters
// ---------------------------------------------------------------------------
export async function searchUsers(
  query: string,
  filters?: { plan?: string; status?: string; sort?: string }
) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    let q = supabase.from("users").select("*");

    // ILIKE search on name and email
    if (query && query.trim().length > 0) {
      const term = `%${query.trim()}%`;
      q = q.or(`name.ilike.${term},email.ilike.${term}`);
    }

    // Plan filter
    if (filters?.plan) {
      q = q.eq("plan", filters.plan);
    }

    // Status filter
    if (filters?.status === "active") {
      q = q.eq("is_active", true);
    } else if (filters?.status === "inactive") {
      q = q.eq("is_active", false);
    } else if (filters?.status === "trial") {
      q = q.gt("trial_ends_at", new Date().toISOString());
    } else if (filters?.status === "onboarding") {
      q = q.eq("onboarding_completed", false);
    }

    // Sort
    if (filters?.sort === "newest") {
      q = q.order("created_at", { ascending: false });
    } else if (filters?.sort === "oldest") {
      q = q.order("created_at", { ascending: true });
    } else if (filters?.sort === "last_active") {
      q = q.order("last_active_at", { ascending: false, nullsFirst: false });
    } else if (filters?.sort === "name") {
      q = q.order("name", { ascending: true });
    } else {
      q = q.order("created_at", { ascending: false });
    }

    const { data, error } = await q;
    if (error) return { error: "Failed to search users" };
    return { data };
  } catch {
    return { error: "Unauthorized or search failed" };
  }
}

// ---------------------------------------------------------------------------
// 2. Get full user detail
// ---------------------------------------------------------------------------
export async function getUserDetail(userId: string) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // Fetch user row
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !user) return { error: "User not found" };

    // Count related entities
    const [contacts, listings, appointments, newsletters, tasks] =
      await Promise.all([
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("realtor_id", userId),
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("realtor_id", userId),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("realtor_id", userId),
        supabase
          .from("newsletters")
          .select("id", { count: "exact", head: true })
          .eq("realtor_id", userId),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("realtor_id", userId),
      ]);

    // Last 20 platform analytics events for this user
    const { data: recentEvents } = await supabase
      .from("platform_analytics")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      data: {
        user,
        counts: {
          contacts: contacts.count ?? 0,
          listings: listings.count ?? 0,
          appointments: appointments.count ?? 0,
          newsletters: newsletters.count ?? 0,
          tasks: tasks.count ?? 0,
        },
        recentEvents: recentEvents ?? [],
      },
    };
  } catch {
    return { error: "Failed to fetch user detail" };
  }
}

// ---------------------------------------------------------------------------
// 3. Change user plan
// ---------------------------------------------------------------------------
export async function changeUserPlan(userId: string, newPlan: string) {
  try {
    const session = await requireAdmin();
    const supabase = createAdminClient();

    // Validate plan exists
    if (!PLANS[newPlan]) return { error: `Invalid plan: ${newPlan}` };

    // Read current user
    const { data: currentUser, error: fetchErr } = await supabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single();

    if (fetchErr || !currentUser) return { error: "User not found" };

    const oldPlan = currentUser.plan;
    const newFeatures = getUserFeatures(newPlan);

    const { error } = await supabase
      .from("users")
      .update({ plan: newPlan, enabled_features: newFeatures })
      .eq("id", userId);

    if (error) return { error: "Failed to change plan" };

    await trackEvent("plan_changed", userId, {
      from: oldPlan,
      to: newPlan,
      trigger: "admin",
    });
    await trackEvent("admin_action", session.user.id ?? null, {
      action: "plan_change",
      target_user_id: userId,
      before_state: { plan: oldPlan },
      after_state: { plan: newPlan },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to change user plan" };
  }
}

// ---------------------------------------------------------------------------
// 4. Start user trial
// ---------------------------------------------------------------------------
export async function startUserTrial(
  userId: string,
  plan: string,
  days: number
) {
  try {
    const session = await requireAdmin();
    const supabase = createAdminClient();

    if (!PLANS[plan]) return { error: `Invalid plan: ${plan}` };
    if (days < 1 || days > 365) return { error: "Days must be between 1 and 365" };

    const trialEndsAt = new Date(Date.now() + days * 86400000).toISOString();

    const { error } = await supabase
      .from("users")
      .update({ trial_plan: plan, trial_ends_at: trialEndsAt })
      .eq("id", userId);

    if (error) return { error: "Failed to start trial" };

    await trackEvent("trial_started", userId, { plan, days });
    await trackEvent("admin_action", session.user.id ?? null, {
      action: "start_trial",
      target_user_id: userId,
      after_state: { trial_plan: plan, trial_ends_at: trialEndsAt },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to start user trial" };
  }
}

// ---------------------------------------------------------------------------
// 5. Extend user trial
// ---------------------------------------------------------------------------
export async function extendUserTrial(
  userId: string,
  additionalDays: number
) {
  try {
    const session = await requireAdmin();
    const supabase = createAdminClient();

    if (additionalDays < 1 || additionalDays > 365) {
      return { error: "Additional days must be between 1 and 365" };
    }

    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("trial_ends_at")
      .eq("id", userId)
      .single();

    if (fetchErr || !user) return { error: "User not found" };
    if (!user.trial_ends_at) return { error: "User has no active trial" };

    const currentEnd = new Date(user.trial_ends_at).getTime();
    // If trial already expired, extend from now instead
    const base = Math.max(currentEnd, Date.now());
    const newEnd = new Date(base + additionalDays * 86400000).toISOString();

    const { error } = await supabase
      .from("users")
      .update({ trial_ends_at: newEnd })
      .eq("id", userId);

    if (error) return { error: "Failed to extend trial" };

    await trackEvent("admin_action", session.user.id ?? null, {
      action: "extend_trial",
      target_user_id: userId,
      before_state: { trial_ends_at: user.trial_ends_at },
      after_state: { trial_ends_at: newEnd },
      additional_days: additionalDays,
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to extend user trial" };
  }
}

// ---------------------------------------------------------------------------
// 6. Reset user onboarding
// ---------------------------------------------------------------------------
export async function resetUserOnboarding(userId: string) {
  try {
    const session = await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("users")
      .update({ onboarding_completed: false, onboarding_step: 1 })
      .eq("id", userId);

    if (error) return { error: "Failed to reset onboarding" };

    await trackEvent("admin_action", session.user.id ?? null, {
      action: "reset_onboarding",
      target_user_id: userId,
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to reset user onboarding" };
  }
}

// ---------------------------------------------------------------------------
// 7. Create user (admin-created)
// ---------------------------------------------------------------------------
export async function createUser(data: {
  email: string;
  name: string;
  plan: string;
}) {
  try {
    const session = await requireAdmin();
    const supabase = createAdminClient();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) return { error: "Invalid email format" };

    // Validate plan
    if (!PLANS[data.plan]) return { error: `Invalid plan: ${data.plan}` };

    // Validate name
    if (!data.name || data.name.trim().length === 0) {
      return { error: "Name is required" };
    }

    const features = getUserFeatures(data.plan);

    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        email: data.email.toLowerCase().trim(),
        name: data.name.trim(),
        plan: data.plan,
        enabled_features: features,
        signup_source: "admin_created",
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return { error: "A user with this email already exists" };
      return { error: "Failed to create user" };
    }

    await trackEvent("signup", newUser.id, {
      method: "admin_created",
      source: "admin",
    });
    await trackEvent("admin_action", session.user.id ?? null, {
      action: "create_user",
      target_user_id: newUser.id,
      after_state: { email: data.email, plan: data.plan },
    });

    revalidatePath("/admin");
    return { data: newUser };
  } catch {
    return { error: "Failed to create user" };
  }
}

// ---------------------------------------------------------------------------
// 8. Delete user
// ---------------------------------------------------------------------------
export async function deleteUser(userId: string) {
  try {
    const session = await requireAdmin();
    const supabase = createAdminClient();

    // Prevent self-delete
    if (userId === session.user.id) {
      return { error: "Cannot delete your own admin account" };
    }

    // Check target is not admin
    const { data: target, error: fetchErr } = await supabase
      .from("users")
      .select("role, email")
      .eq("id", userId)
      .single();

    if (fetchErr || !target) return { error: "User not found" };
    if (target.role === "admin") return { error: "Cannot delete an admin user" };

    const { error } = await supabase.from("users").delete().eq("id", userId);

    if (error) return { error: "Failed to delete user" };

    await trackEvent("admin_action", session.user.id ?? null, {
      action: "delete_user",
      target_user_id: userId,
      deleted_email: target.email,
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to delete user" };
  }
}

// ---------------------------------------------------------------------------
// 9. Bulk change plan
// ---------------------------------------------------------------------------
export async function bulkChangePlan(userIds: string[], plan: string) {
  try {
    await requireAdmin();

    if (!PLANS[plan]) return { error: `Invalid plan: ${plan}` };
    if (userIds.length === 0) return { error: "No users specified" };
    if (userIds.length > 50) return { error: "Maximum 50 users per bulk operation" };

    for (const uid of userIds) {
      const result = await changeUserPlan(uid, plan);
      if ("error" in result && result.error) {
        return { error: `Failed for user ${uid}: ${result.error}` };
      }
    }

    return { success: true, count: userIds.length };
  } catch {
    return { error: "Bulk plan change failed" };
  }
}

// ---------------------------------------------------------------------------
// 10. Bulk toggle feature
// ---------------------------------------------------------------------------
export async function bulkToggleFeature(
  userIds: string[],
  feature: string,
  enabled: boolean
) {
  try {
    const session = await requireAdmin();
    const supabase = createAdminClient();

    // Validate feature key
    if (!(FEATURE_KEYS as readonly string[]).includes(feature)) {
      return { error: `Invalid feature: ${feature}` };
    }
    if (userIds.length === 0) return { error: "No users specified" };
    if (userIds.length > 50) return { error: "Maximum 50 users per bulk operation" };

    for (const uid of userIds) {
      const { data: user, error: fetchErr } = await supabase
        .from("users")
        .select("enabled_features")
        .eq("id", uid)
        .single();

      if (fetchErr || !user) continue;

      const currentFeatures: string[] = user.enabled_features ?? [];
      let newFeatures: string[];

      if (enabled) {
        newFeatures = [...new Set([...currentFeatures, feature])];
      } else {
        newFeatures = currentFeatures.filter((f) => f !== feature);
      }

      await updateUserFeatures(uid, newFeatures);
    }

    await trackEvent("admin_action", session.user.id ?? null, {
      action: "bulk_toggle_feature",
      feature,
      enabled,
      user_count: userIds.length,
    });

    revalidatePath("/admin");
    return { success: true, count: userIds.length };
  } catch {
    return { error: "Bulk feature toggle failed" };
  }
}

// ---------------------------------------------------------------------------
// 11. Bulk toggle active
// ---------------------------------------------------------------------------
export async function bulkToggleActive(userIds: string[], isActive: boolean) {
  try {
    const session = await requireAdmin();
    const supabase = createAdminClient();

    if (userIds.length === 0) return { error: "No users specified" };
    if (userIds.length > 50) return { error: "Maximum 50 users per bulk operation" };

    const { error } = await supabase
      .from("users")
      .update({ is_active: isActive })
      .in("id", userIds);

    if (error) return { error: "Failed to update user statuses" };

    await trackEvent("admin_action", session.user.id ?? null, {
      action: "bulk_toggle_active",
      is_active: isActive,
      user_count: userIds.length,
      user_ids: userIds,
    });

    revalidatePath("/admin");
    return { success: true, count: userIds.length };
  } catch {
    return { error: "Bulk active toggle failed" };
  }
}

// ---------------------------------------------------------------------------
// 12. Find user by email
// ---------------------------------------------------------------------------
export async function findUserByEmail(email: string) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, trial_ends_at, trial_plan, plan, is_active")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error || !data) return { error: "User not found" };
    return { data };
  } catch {
    return { error: "Failed to find user" };
  }
}

// ---------------------------------------------------------------------------
// 13. Update admin user fields (inline edit)
// ---------------------------------------------------------------------------
export async function updateAdminUserFields(
  userId: string,
  fields: Record<string, unknown>
) {
  try {
    const session = await requireAdmin();
    const supabase = createAdminClient();

    // Allowlist of editable fields
    const ALLOWED_FIELDS = [
      "name",
      "email",
      "phone",
      "brokerage",
      "license_number",
      "bio",
      "timezone",
      "role",
    ];

    // Filter to only allowed fields
    const allowedUpdate: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in fields) {
        allowedUpdate[key] = fields[key];
      }
    }

    if (Object.keys(allowedUpdate).length === 0) {
      return { error: "No valid fields to update" };
    }

    // Read current values for audit trail
    const { data: currentUser, error: fetchErr } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchErr || !currentUser) return { error: "User not found" };

    const beforeState: Record<string, unknown> = {};
    for (const key of Object.keys(allowedUpdate)) {
      beforeState[key] = (currentUser as Record<string, unknown>)[key];
    }

    const { error } = await supabase
      .from("users")
      .update(allowedUpdate)
      .eq("id", userId);

    if (error) return { error: "Failed to update user fields" };

    await trackEvent("admin_action", session.user.id ?? null, {
      action: "update_user_fields",
      target_user_id: userId,
      fields_changed: Object.keys(allowedUpdate),
      before_state: beforeState,
      after_state: allowedUpdate,
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Failed to update user fields" };
  }
}

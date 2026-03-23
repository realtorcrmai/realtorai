"use server";

import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { FEATURE_KEYS, type FeatureKey } from "@/lib/features";

async function requireAdmin() {
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

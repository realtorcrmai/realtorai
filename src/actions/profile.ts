"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Not authenticated" };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters" };
  }

  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return { error: "User not found" };
  }

  if (!user.password_hash) {
    return { error: "Account uses Google sign-in. No password to change." };
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return { error: "Current password is incorrect" };
  }

  const password_hash = await bcrypt.hash(newPassword, 12);

  const { error: updateError } = await supabase
    .from("users")
    .update({ password_hash })
    .eq("id", user.id);

  if (updateError) {
    return { error: "Failed to update password" };
  }

  return { success: true };
}

export async function getProfile() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Not authenticated" };
  }

  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, email, name, role, plan, image, password_hash, created_at")
    .eq("email", session.user.email)
    .single();

  if (!user) {
    return { error: "User not found" };
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan,
    image: user.image,
    hasPassword: !!user.password_hash,
    createdAt: user.created_at,
  };
}

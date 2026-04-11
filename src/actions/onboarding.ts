"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/lib/auth";

// ── Onboarding Progress Resume ──

export async function getOnboardingProgress(): Promise<{ step: number; avatarUrl: string | null }> {
  const session = await auth();
  if (!session?.user?.id) return { step: 1, avatarUrl: null };

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("onboarding_step, avatar_url")
    .eq("id", session.user.id)
    .single();

  return {
    step: Math.max(1, Math.min(user?.onboarding_step || 1, 7)),
    avatarUrl: user?.avatar_url || null,
  };
}

// ── Profile Completeness Calculation ──

export async function recalculateProfileCompleteness(userId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("name, email_verified, phone_verified, avatar_url, brokerage, license_number, timezone, bio")
    .eq("id", userId)
    .single();

  if (!user) return 0;

  const { data: calendarIntegration } = await supabase
    .from("user_integrations")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "google_calendar")
    .maybeSingle();

  const { count: realContactCount } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("realtor_id", userId)
    .eq("is_sample", false);

  let completeness = 0;
  if (user.name && user.name.trim().length >= 2) completeness += 10;
  if (user.email_verified) completeness += 10;
  if (user.phone_verified) completeness += 10;
  if (user.avatar_url) completeness += 10;
  if (user.brokerage && user.brokerage.trim().length > 0) completeness += 10;
  if (user.license_number && user.license_number.trim().length > 0) completeness += 10;
  if (calendarIntegration) completeness += 10;
  if (user.timezone && user.timezone !== "America/Vancouver") completeness += 10;
  if (user.bio && user.bio.trim().length >= 10) completeness += 10;
  if ((realContactCount || 0) >= 1) completeness += 10;

  await supabase.from("users").update({ profile_completeness: completeness }).eq("id", userId);
  return completeness;
}

// ── Onboarding Step Advancement ──

export async function advanceOnboardingStep(step: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const supabase = createAdminClient();
  await supabase.from("users").update({ onboarding_step: step }).eq("id", session.user.id);

  if (step >= 6) {
    await supabase.from("users").update({ onboarding_completed: true }).eq("id", session.user.id);
    await supabase.from("signup_events").insert({
      user_id: session.user.id,
      event: "onboarding_complete",
    });

    // A3 + A5 + A6: Fire AI tasks async on onboarding completion (fire-and-forget)
    const userId = session.user.id;
    import("@/actions/ai-onboarding").then(async ({ generateDashboardBriefing, suggestAutomations }) => {
      await Promise.allSettled([
        generateDashboardBriefing(userId),
        suggestAutomations(userId),
      ]);
    }).catch(console.error);
  }

  return { success: true };
}

// ── Headshot Upload ──

export async function uploadHeadshot(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };

  const maxSize = 5 * 1024 * 1024;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (file.size > maxSize) return { error: "Image must be under 5MB" };
  if (!allowedTypes.includes(file.type)) return { error: "Only JPG, PNG, and WebP accepted" };

  const ext = file.type.split("/")[1];
  const filePath = `${session.user.id}/headshot.${ext}`;
  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true, contentType: file.type, cacheControl: "3600" });

  if (uploadError) {
    console.error("[headshot] Upload error:", uploadError.message);
    return { error: "Failed to upload image. Please try again." };
  }

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
  await supabase.from("users").update({ avatar_url: urlData.publicUrl }).eq("id", session.user.id);
  await recalculateProfileCompleteness(session.user.id);

  return { url: urlData.publicUrl };
}

// ── Professional Info Update ──

export async function updateProfessionalInfo(data: {
  brokerage?: string;
  licenseNumber?: string;
  bio?: string;
  timezone?: string;
  phone?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const supabase = createAdminClient();
  const updates: Record<string, string | null> = {};
  if (data.brokerage !== undefined) updates.brokerage = data.brokerage.trim() || null;
  if (data.licenseNumber !== undefined) updates.license_number = data.licenseNumber.trim() || null;
  if (data.bio !== undefined) updates.bio = data.bio.trim() || null;
  if (data.timezone !== undefined) updates.timezone = data.timezone;
  if (data.phone !== undefined) updates.phone = data.phone.trim() || null;

  if (Object.keys(updates).length > 0) {
    await supabase.from("users").update(updates).eq("id", session.user.id);
    await recalculateProfileCompleteness(session.user.id);
  }

  return { success: true };
}

// ── Save Family Info ──

export async function saveFamilyInfo(familyInfo: { spouse_name?: string; kids_count?: number }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const supabase = createAdminClient();
  await supabase.from("users").update({ family_info: familyInfo }).eq("id", session.user.id);
  return { success: true };
}

// ── Create Family Member Contacts ──

export async function createFamilyContacts(
  members: Array<{ name: string; phone?: string; email?: string; relationship: string }>
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const supabase = createAdminClient();
  const validMembers = members.filter((m) => m.name.trim().length >= 2);
  if (validMembers.length === 0) return { success: true, created: 0 };

  const created: Array<{ id: string; name: string; relationship: string }> = [];

  for (const member of validMembers) {
    const phone = member.phone?.trim() || null;
    const email = member.email?.trim() || null;

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        realtor_id: session.user.id,
        name: member.name.trim(),
        phone,
        email,
        type: "other",
        source: "onboarding_family",
        notes: `Family member (${member.relationship})`,
        is_sample: false,
      })
      .select("id")
      .single();

    if (data) {
      created.push({ id: data.id, name: member.name.trim(), relationship: member.relationship });
    } else if (error) {
      console.error(`[family-contacts] Error creating ${member.name}:`, error.message);
    }
  }

  // Save family info on user record for profile reference
  await supabase.from("users").update({
    family_info: created.map((c) => ({
      contact_id: c.id,
      name: c.name,
      relationship: c.relationship,
    })),
  }).eq("id", session.user.id);

  return { success: true, created: created.length };
}

// ── Link Referral ──

export async function linkReferral(contactId: string, referrerId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("contacts")
    .update({ referred_by_id: referrerId })
    .eq("id", contactId)
    .eq("realtor_id", session.user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ── Send Team Invite ──

export async function sendTeamInvite(emails: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  if (!emails.length || emails.length > 10) return { error: "Provide 1-10 email addresses" };

  const supabase = createAdminClient();

  // Store invites in team_invites table (or pending_invites JSONB on users)
  const rows = emails
    .filter((e) => e.includes("@"))
    .map((email) => ({
      inviter_id: session.user.id,
      email: email.trim().toLowerCase(),
      status: "pending",
    }));

  if (rows.length === 0) return { error: "No valid email addresses" };

  const { error } = await supabase.from("team_invites").insert(rows);

  if (error) {
    // Table may not exist yet — store on user record as fallback
    console.error("[team-invite] Insert error:", error.message);
    await supabase.from("users").update({
      pending_team_invites: emails,
    }).eq("id", session.user.id);
  }

  return { success: true, sent: rows.length };
}

// ── Brokerage Auto-Detect ──

export async function searchBrokerages(query: string): Promise<string[]> {
  if (!query || query.trim().length < 2) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("brokerage")
    .ilike("brokerage", `${query.trim()}%`)
    .not("brokerage", "is", null)
    .limit(20);

  if (!data) return [];

  // Deduplicate and sort by frequency
  const counts = new Map<string, number>();
  for (const row of data) {
    if (row.brokerage) {
      const key = row.brokerage.trim();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 5);
}

// ── Sample Data Seeding ──

export async function seedSampleData() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const supabase = createAdminClient();

  // Check if user already has contacts
  const { count } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("realtor_id", session.user.id);

  if ((count || 0) > 0) return { success: true, message: "Already has contacts" };

  // Seed 3 demo contacts
  await supabase.from("contacts").insert([
    {
      realtor_id: session.user.id,
      name: "Sarah Chen",
      email: null, // null to prevent accidental emails
      phone: null,
      type: "buyer",
      source: "sample",
      is_sample: true,
      notes: "Sample buyer contact — replace with your real contacts",
    },
    {
      realtor_id: session.user.id,
      name: "James Patel",
      email: null,
      phone: null,
      type: "seller",
      source: "sample",
      is_sample: true,
      notes: "Sample seller contact — replace with your real contacts",
    },
    {
      realtor_id: session.user.id,
      name: "Lisa Wong",
      email: null,
      phone: null,
      type: "agent",
      source: "sample",
      is_sample: true,
      notes: "Sample agent contact — replace with your real contacts",
    },
  ]);

  return { success: true };
}

// ── Clear Sample Data ──

export async function clearSampleData() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const supabase = createAdminClient();
  await supabase.from("contacts").delete().eq("realtor_id", session.user.id).eq("is_sample", true);
  await supabase.from("listings").delete().eq("realtor_id", session.user.id).eq("is_sample", true);
  await supabase.from("tasks").delete().eq("realtor_id", session.user.id).eq("is_sample", true);

  return { success: true };
}

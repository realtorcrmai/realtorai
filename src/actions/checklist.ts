"use server";

import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
  dismissed: boolean;
}

const CHECKLIST_ITEMS = [
  { key: "first_contact", label: "Add your first contact", description: "Import or create a contact", href: "/contacts/new" },
  { key: "first_listing", label: "Create a listing", description: "Add a property to manage", href: "/listings" },
  { key: "calendar_connected", label: "Connect your calendar", description: "Sync with Google Calendar", href: "/calendar" },
  { key: "first_email", label: "Send your first email", description: "Create a newsletter campaign", href: "/newsletters" },
  { key: "first_showing", label: "Schedule a showing", description: "Book a property viewing", href: "/showings" },
];

/**
 * Get checklist items with auto-detected completion status (PO1).
 * Auto-detection queries real tables. Manual overrides from onboarding_checklist table.
 */
export async function getChecklistItems(userId?: string): Promise<{ items: ChecklistItem[]; dismissedAll: boolean }> {
  const session = await auth();
  const uid = userId || session?.user?.id;
  if (!uid) return { items: [], dismissedAll: false };

  const supabase = createAdminClient();

  // Run auto-detection queries in parallel
  const [contacts, listings, calendars, emails, showings, overrides] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("realtor_id", uid).neq("is_sample", true),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("realtor_id", uid),
    supabase.from("user_integrations").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("provider", "google_calendar"),
    supabase.from("newsletters").select("id", { count: "exact", head: true }).eq("realtor_id", uid).eq("status", "sent"),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("realtor_id", uid),
    supabase.from("onboarding_checklist").select("item_key, completed_at, dismissed").eq("user_id", uid),
  ]);

  const autoCompleted: Record<string, boolean> = {
    first_contact: (contacts.count ?? 0) > 0,
    first_listing: (listings.count ?? 0) > 0,
    calendar_connected: (calendars.count ?? 0) > 0,
    first_email: (emails.count ?? 0) > 0,
    first_showing: (showings.count ?? 0) > 0,
  };

  const overrideMap: Record<string, { completed: boolean; dismissed: boolean }> = {};
  for (const row of overrides.data ?? []) {
    overrideMap[row.item_key] = { completed: !!row.completed_at, dismissed: row.dismissed };
  }

  // Check if all items dismissed
  const dismissedAll = overrides.data?.some((r) => r.item_key === "__all__" && r.dismissed) ?? false;

  // Read user's onboarding_focus for ordering
  const { data: user } = await supabase.from("users").select("onboarding_focus").eq("id", uid).single();
  const focus = (user?.onboarding_focus as string[]) ?? [];

  const items: ChecklistItem[] = CHECKLIST_ITEMS.map((item) => ({
    ...item,
    completed: autoCompleted[item.key] || overrideMap[item.key]?.completed || false,
    dismissed: overrideMap[item.key]?.dismissed || false,
  }));

  // Sort: focus items first (P6 adaptation), then by completion (incomplete first)
  const focusKeys: Record<string, string> = {
    contacts: "first_contact",
    listings: "first_listing",
    marketing: "first_email",
    showings: "first_showing",
  };
  items.sort((a, b) => {
    const aInFocus = focus.some((f) => focusKeys[f] === a.key) ? 0 : 1;
    const bInFocus = focus.some((f) => focusKeys[f] === b.key) ? 0 : 1;
    if (aInFocus !== bInFocus) return aInFocus - bInFocus;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return 0;
  });

  return { items, dismissedAll };
}

/** Mark a checklist item as manually completed */
export async function markChecklistItem(itemKey: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const supabase = createAdminClient();
  await supabase.from("onboarding_checklist").upsert({
    user_id: session.user.id,
    item_key: itemKey,
    completed_at: new Date().toISOString(),
    dismissed: false,
  }, { onConflict: "user_id,item_key" });

  return { success: true };
}

/** Dismiss entire checklist */
export async function dismissChecklist() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const supabase = createAdminClient();
  await supabase.from("onboarding_checklist").upsert({
    user_id: session.user.id,
    item_key: "__all__",
    dismissed: true,
  }, { onConflict: "user_id,item_key" });

  return { success: true };
}

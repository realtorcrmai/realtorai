"use server";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";
import { executeSmartListQuery, countSmartListMatches } from "@/lib/smart-list-engine";
import type { SmartList, SmartListRule, SmartListWithCount, EntityType, MatchMode } from "@/types/smart-lists";

// ── CRUD ─────────────────────────────────────────────────────────────────

export async function getSmartLists(): Promise<SmartListWithCount[]> {
  const tc = await getAuthenticatedTenantClient();

  const { data: lists } = await tc.raw
    .from("smart_lists")
    .select("*")
    .eq("realtor_id", tc.realtorId)
    .order("position", { ascending: true });

  if (!lists || lists.length === 0) {
    // Seed presets on first access
    await seedPresetSmartLists();
    const { data: seeded } = await tc.raw
      .from("smart_lists")
      .select("*")
      .eq("realtor_id", tc.realtorId)
      .order("position", { ascending: true });
    if (!seeded) return [];
    return attachCounts(tc, seeded as SmartList[]);
  }

  return attachCounts(tc, lists as SmartList[]);
}

export async function getPinnedSmartListCounts(): Promise<{ id: string; name: string; icon: string; count: number; entity_type: string }[]> {
  const tc = await getAuthenticatedTenantClient();

  const { data: lists } = await tc.raw
    .from("smart_lists")
    .select("id, name, icon, entity_type, rules, match_mode, sort_field, sort_order, is_pinned, position")
    .eq("realtor_id", tc.realtorId)
    .eq("is_pinned", true)
    .order("position", { ascending: true });

  if (!lists || lists.length === 0) return [];

  const results = await Promise.all(
    (lists as SmartList[]).map(async (sl) => ({
      id: sl.id,
      name: sl.name,
      icon: sl.icon,
      entity_type: sl.entity_type,
      count: await countSmartListMatches(tc, sl),
    }))
  );

  return results;
}

export async function createSmartList(input: {
  name: string;
  icon: string;
  entity_type: EntityType;
  rules: SmartListRule[];
  match_mode: MatchMode;
  sort_field: string;
  sort_order: "asc" | "desc";
  is_pinned: boolean;
}) {
  if (!input.name.trim()) return { error: "Name is required" };
  if (input.rules.length === 0) return { error: "At least one condition is required" };

  const tc = await getAuthenticatedTenantClient();

  // Get next position
  const { count } = await tc.raw
    .from("smart_lists")
    .select("*", { count: "exact", head: true })
    .eq("realtor_id", tc.realtorId);

  const { data, error } = await tc.raw
    .from("smart_lists")
    .insert({
      realtor_id: tc.realtorId,
      name: input.name.trim(),
      icon: input.icon || "📋",
      entity_type: input.entity_type,
      rules: input.rules,
      match_mode: input.match_mode,
      sort_field: input.sort_field,
      sort_order: input.sort_order,
      is_pinned: input.is_pinned,
      position: (count ?? 0) + 1,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/contacts");
  revalidatePath("/listings");
  revalidatePath("/showings");
  return { error: null, smartList: data };
}

export async function updateSmartList(id: string, updates: Partial<{
  name: string;
  icon: string;
  rules: SmartListRule[];
  match_mode: MatchMode;
  sort_field: string;
  sort_order: "asc" | "desc";
  is_pinned: boolean;
}>) {
  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc.raw
    .from("smart_lists")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("realtor_id", tc.realtorId);

  if (error) return { error: error.message };
  revalidatePath("/contacts");
  revalidatePath("/listings");
  revalidatePath("/showings");
  return { error: null };
}

export async function deleteSmartList(id: string) {
  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc.raw
    .from("smart_lists")
    .delete()
    .eq("id", id)
    .eq("realtor_id", tc.realtorId);

  if (error) return { error: error.message };
  revalidatePath("/contacts");
  revalidatePath("/listings");
  revalidatePath("/showings");
  return { error: null };
}

export async function executeSmartList(id: string) {
  const tc = await getAuthenticatedTenantClient();

  const { data: smartList } = await tc.raw
    .from("smart_lists")
    .select("*")
    .eq("id", id)
    .eq("realtor_id", tc.realtorId)
    .single();

  if (!smartList) return { error: "Smart list not found", rows: [], smartList: null };

  const rows = await executeSmartListQuery(tc, smartList as SmartList);
  return { error: null, rows, smartList: smartList as SmartList };
}

export async function countSmartList(id: string): Promise<number> {
  const tc = await getAuthenticatedTenantClient();

  const { data: smartList } = await tc.raw
    .from("smart_lists")
    .select("*")
    .eq("id", id)
    .eq("realtor_id", tc.realtorId)
    .single();

  if (!smartList) return 0;
  return countSmartListMatches(tc, smartList as SmartList);
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function attachCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tc: { raw: any; realtorId: string },
  lists: SmartList[]
): Promise<SmartListWithCount[]> {
  const counts = await Promise.all(
    lists.map((sl) => countSmartListMatches(tc, sl))
  );
  return lists.map((sl, i) => ({ ...sl, count: counts[i] }));
}

// ── Preset Seeding ──────────────────────────────────────────────────────

const PRESETS: Omit<SmartList, "id" | "realtor_id" | "created_at" | "updated_at">[] = [
  {
    name: "Speed-to-Lead",
    icon: "🚀",
    entity_type: "contacts",
    rules: [{ field: "created_at", operator: "newer_than", value: "24h" }],
    match_mode: "all",
    sort_field: "created_at",
    sort_order: "desc",
    is_pinned: true,
    notify_threshold: 1,
    position: 1,
  },
  {
    name: "Hot Buyers",
    icon: "🔥",
    entity_type: "contacts",
    rules: [
      { field: "type", operator: "eq", value: "buyer" },
      { field: "newsletter_intelligence->engagement_score", operator: "gte", value: 60 },
    ],
    match_mode: "all",
    sort_field: "last_activity_date",
    sort_order: "desc",
    is_pinned: true,
    notify_threshold: null,
    position: 2,
  },
  {
    name: "Follow-Up Due",
    icon: "📞",
    entity_type: "contacts",
    rules: [
      { field: "last_activity_date", operator: "older_than", value: "7d" },
      { field: "stage_bar", operator: "not_in", value: ["closed", "cold"] },
    ],
    match_mode: "all",
    sort_field: "last_activity_date",
    sort_order: "asc",
    is_pinned: true,
    notify_threshold: null,
    position: 3,
  },
  {
    name: "Active Listings",
    icon: "🏠",
    entity_type: "listings",
    rules: [{ field: "status", operator: "eq", value: "active" }],
    match_mode: "all",
    sort_field: "created_at",
    sort_order: "desc",
    is_pinned: true,
    notify_threshold: null,
    position: 4,
  },
  {
    name: "Going Cold",
    icon: "🧊",
    entity_type: "contacts",
    rules: [
      { field: "newsletter_intelligence->engagement_score", operator: "lt", value: 30 },
      { field: "last_activity_date", operator: "older_than", value: "30d" },
    ],
    match_mode: "all",
    sort_field: "last_activity_date",
    sort_order: "asc",
    is_pinned: true,
    notify_threshold: null,
    position: 5,
  },
];

async function seedPresetSmartLists() {
  const tc = await getAuthenticatedTenantClient();
  const rows = PRESETS.map((p) => ({ ...p, realtor_id: tc.realtorId }));
  await tc.raw.from("smart_lists").insert(rows);
}

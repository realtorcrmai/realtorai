"use server";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export async function getUnreadNotifications() {
  const tc = await getAuthenticatedTenantClient();
  const { data } = await tc.from("notifications")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function getNotifications(limit = 20) {
  const tc = await getAuthenticatedTenantClient();
  const { data } = await tc.from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function markNotificationRead(id: string) {
  const tc = await getAuthenticatedTenantClient();
  await tc.from("notifications").update({ is_read: true }).eq("id", id);
}

export async function markAllNotificationsRead() {
  const tc = await getAuthenticatedTenantClient();
  await tc.from("notifications").update({ is_read: true }).eq("is_read", false);
}

export async function getUnreadCount() {
  const tc = await getAuthenticatedTenantClient();
  const { count } = await tc.from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  return count ?? 0;
}

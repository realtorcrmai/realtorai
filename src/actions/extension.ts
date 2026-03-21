"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Create an extension task for the Chrome extension to pick up.
 * Called from CRM UI buttons in Steps 7 (explore) and 8 (fill).
 */
export async function createExtensionTask(
  listingId: string,
  taskType: "explore" | "fill"
) {
  const supabase = createAdminClient();

  // Delete any existing pending tasks
  await supabase
    .from("extension_tasks")
    .delete()
    .eq("status", "pending");

  // Create new task
  const { data, error } = await supabase
    .from("extension_tasks")
    .insert({
      listing_id: listingId,
      task_type: taskType,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { success: true, taskId: data.id };
}

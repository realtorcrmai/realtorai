import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

/**
 * POST /api/extension-tasks
 * CRM creates a pending task for the Chrome extension to pick up.
 * Auth: NextAuth session (called from CRM UI).
 */
export async function POST(req: NextRequest) {
  let supabase;
  try { supabase = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }
  const body = await req.json();

  const { listing_id, task_type } = body;

  if (!listing_id || !task_type) {
    return NextResponse.json(
      { error: "listing_id and task_type are required" },
      { status: 400 }
    );
  }

  if (!["explore", "fill"].includes(task_type)) {
    return NextResponse.json(
      { error: "task_type must be 'explore' or 'fill'" },
      { status: 400 }
    );
  }

  // Delete any existing pending tasks to keep queue clean
  await supabase
    .from("extension_tasks")
    .delete()
    .eq("status", "pending");

  // Create new task
  const { data, error } = await supabase
    .from("extension_tasks")
    .insert({
      listing_id,
      task_type,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/**
 * GET /api/extension-tasks
 * Extension polls for pending tasks.
 * Auth: X-API-Key header validated against user_integrations.
 */
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "X-API-Key header is required" },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  // Validate API key
  const { data: integrations } = await supabase
    .from("user_integrations")
    .select("id, config")
    .eq("provider", "mls_extension");

  const integration = integrations?.find(
    (row) => (row.config as Record<string, string>)?.api_key === apiKey
  );

  if (!integration) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Fetch most recent pending task (ignore tasks older than 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: tasks } = await supabase
    .from("extension_tasks")
    .select("id, listing_id, task_type, status, created_at")
    .eq("status", "pending")
    .gte("created_at", tenMinutesAgo)
    .order("created_at", { ascending: false })
    .limit(1);

  const task = tasks && tasks.length > 0 ? tasks[0] : null;

  return NextResponse.json({ task });
}

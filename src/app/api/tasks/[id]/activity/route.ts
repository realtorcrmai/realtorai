import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/tasks/[id]/activity — task activity log
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  // Verify task access
  const { data: task } = await tc.from("tasks").select("id").eq("id", taskId).single();
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") || "50") || 50);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0") || 0;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("task_activity")
    .select("id, user_id, action, field_name, old_value, new_value, metadata, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Batch fetch user names
  const userIds = [...new Set((data ?? []).map((a) => a.user_id))];
  let nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await admin.from("users").select("id, name").in("id", userIds);
    nameMap = new Map((users ?? []).map((u) => [u.id, u.name ?? "Unknown"]));
  }

  return NextResponse.json(
    (data ?? []).map((a) => ({ ...a, user_name: nameMap.get(a.user_id) || "Unknown" }))
  );
}

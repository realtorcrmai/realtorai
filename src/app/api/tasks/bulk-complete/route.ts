import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

// POST /api/tasks/bulk-complete — bulk operations on tasks
// Body: { ids: string[], action: "complete" | "archive" | "delete" | "assign" | "priority", value?: string }
export async function POST(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const body = await req.json();
  const { ids, action = "complete", value } = body as {
    ids?: string[];
    action?: "complete" | "archive" | "delete" | "assign" | "priority" | "unarchive";
    value?: string;
  };

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000) {
    return NextResponse.json({ error: "ids array must have 1-1000 items" }, { status: 400 });
  }

  let result;

  switch (action) {
    case "complete":
      result = await tc
        .from("tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .in("id", ids)
        .neq("status", "completed");
      break;

    case "archive":
      result = await tc
        .from("tasks")
        .update({ archived_at: new Date().toISOString() })
        .in("id", ids)
        .is("archived_at", null);
      break;

    case "unarchive":
      result = await tc
        .from("tasks")
        .update({ archived_at: null })
        .in("id", ids);
      break;

    case "delete":
      result = await tc.from("tasks").delete().in("id", ids);
      break;

    case "assign":
      if (!value) return NextResponse.json({ error: "Assignee user ID required" }, { status: 400 });
      result = await tc
        .from("tasks")
        .update({ assigned_to: value === "unassign" ? null : value })
        .in("id", ids);
      break;

    case "priority":
      if (!value || !["low", "medium", "high", "urgent"].includes(value)) {
        return NextResponse.json({ error: "Valid priority required" }, { status: 400 });
      }
      result = await tc.from("tasks").update({ priority: value }).in("id", ids);
      break;

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return NextResponse.json({ success: true, updated: result.count ?? ids.length });
}

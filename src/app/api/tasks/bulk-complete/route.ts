import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { ids } = body as { ids?: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "ids array is required and must not be empty" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const completedAt = new Date().toISOString();

  const { error, count } = await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: completedAt })
    .in("id", ids)
    .neq("status", "completed"); // skip already-completed tasks

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: count ?? ids.length });
}

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export async function POST(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const body = await req.json();
  const { ids } = body as { ids?: string[] };

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000) {
    return NextResponse.json(
      { error: "ids array must have 1-1000 items" },
      { status: 400 }
    );
  }

  const completedAt = new Date().toISOString();

  const { error, count } = await tc
    .from("tasks")
    .update({ status: "completed", completed_at: completedAt })
    .in("id", ids)
    .neq("status", "completed"); // skip already-completed tasks

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return NextResponse.json({ success: true, updated: count ?? ids.length });
}

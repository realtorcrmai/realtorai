import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PATCH /api/extension-tasks/[id]
 * Extension updates task status (picked_up or completed).
 * Auth: X-API-Key header.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const body = await req.json();

  const { status } = body;

  if (!status || !["picked_up", "completed"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'picked_up' or 'completed'" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("extension_tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

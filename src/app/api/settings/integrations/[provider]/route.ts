import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

/** DELETE /api/settings/integrations/[provider] - remove an integration */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { session, unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const { provider } = await params;
  const supabase = createAdminClient();
  const email = session!.user.email!;

  const { error } = await supabase
    .from("user_integrations")
    .delete()
    .eq("user_email", email)
    .eq("provider", provider);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

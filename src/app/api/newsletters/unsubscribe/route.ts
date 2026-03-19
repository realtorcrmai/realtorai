import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/newsletters/unsubscribe?id=<contactId>
 * Unsubscribe a contact from newsletters
 */
export async function GET(request: NextRequest) {
  const contactId = request.nextUrl.searchParams.get("id");
  if (!contactId) {
    return new NextResponse("Invalid unsubscribe link", { status: 400 });
  }

  const supabase = createAdminClient();

  await supabase
    .from("contacts")
    .update({ newsletter_unsubscribed: true })
    .eq("id", contactId);

  // Pause all journeys
  await supabase
    .from("contact_journeys")
    .update({
      is_paused: true,
      pause_reason: "unsubscribed",
      updated_at: new Date().toISOString(),
    })
    .eq("contact_id", contactId);

  // Return a simple confirmation page
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><title>Unsubscribed</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px 20px;background:#f6f5ff;">
  <div style="max-width:400px;margin:0 auto;background:white;padding:40px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <h1 style="font-size:24px;color:#1a1535;">You've been unsubscribed</h1>
    <p style="color:#6b6b8d;font-size:15px;">You will no longer receive newsletter emails from us. If this was a mistake, please contact your realtor directly.</p>
  </div>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

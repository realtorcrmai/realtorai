import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/newsletters/unsubscribe?id=<contactId>
 * Unsubscribe a contact from newsletters (CASL compliant)
 */
export async function GET(request: NextRequest) {
  const contactId = request.nextUrl.searchParams.get("id");
  if (!contactId) {
    return new NextResponse("Invalid unsubscribe link", { status: 400 });
  }

  const supabase = createAdminClient();

  // Get contact name for confirmation
  const { data: contact } = await supabase
    .from("contacts")
    .select("name, email")
    .eq("id", contactId)
    .single();

  if (!contact) {
    return new NextResponse("Contact not found", { status: 404 });
  }

  // Mark as unsubscribed
  await supabase
    .from("contacts")
    .update({
      newsletter_unsubscribed: true,
      newsletter_intelligence: {
        ...(contact as any).newsletter_intelligence,
        unsubscribed_at: new Date().toISOString(),
        unsubscribe_source: "email_link",
      },
    })
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

  // Audit log
  await supabase.from("activity_log").insert({
    contact_id: contactId,
    activity_type: "newsletter_unsubscribed",
    description: `${contact.name} unsubscribed from newsletters via email link`,
    metadata: {
      email: contact.email,
      timestamp: new Date().toISOString(),
      source: "email_unsubscribe_link",
    },
  });

  const firstName = contact.name?.split(" ")[0] || "";

  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribed</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;text-align:center;padding:60px 20px;background:#f6f5ff;margin:0;">
  <div style="max-width:420px;margin:0 auto;background:white;padding:40px 32px;border-radius:12px;box-shadow:0 2px 12px rgba(79,53,210,0.06);">
    <div style="font-size:48px;margin-bottom:16px;">\u{1F44B}</div>
    <h1 style="font-size:22px;color:#1a1535;margin:0 0 8px;">You've been unsubscribed${firstName ? `, ${firstName}` : ""}</h1>
    <p style="color:#6b6b8d;font-size:15px;line-height:1.5;margin:0;">
      You will no longer receive newsletter emails from us.
      If this was a mistake, please contact your realtor directly.
    </p>
  </div>
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

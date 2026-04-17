/**
 * GET /api/consent/reconfirm?id=<consent_record_id>
 *
 * Called when a contact clicks "Yes, keep me subscribed" in the
 * CASL consent re-confirmation email. Extends the consent expiry
 * by 2 years (CASL implied consent maximum).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkApiRateLimit } from "@/lib/api-rate-limit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkApiRateLimit(ip, "consent-reconfirm");
  if (!rateCheck.allowed) {
    return new NextResponse("Too many requests.", { status: 429 });
  }

  const consentId = request.nextUrl.searchParams.get("id");
  if (!consentId) {
    return new NextResponse("Missing consent ID", { status: 400 });
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(consentId)) {
    return new NextResponse("Invalid consent ID", { status: 400 });
  }

  const supabase = createAdminClient();

  // Find the consent record
  const { data: record } = await supabase
    .from("consent_records")
    .select("id, contact_id, consent_type, contacts(name)")
    .eq("id", consentId)
    .single();

  if (!record) {
    return new NextResponse("Consent record not found", { status: 404 });
  }

  // Extend expiry by 2 years (CASL maximum for implied consent)
  const newExpiry = new Date();
  newExpiry.setFullYear(newExpiry.getFullYear() + 2);

  await supabase
    .from("consent_records")
    .update({
      expiry_date: newExpiry.toISOString(),
      withdrawn: false,
    })
    .eq("id", consentId);

  // Unpause any journeys that were paused due to expired consent
  await supabase
    .from("contact_journeys")
    .update({ is_paused: false, pause_reason: null })
    .eq("contact_id", record.contact_id)
    .eq("pause_reason", "consent_expired");

  // Audit log
  await supabase.from("activity_log").insert({
    contact_id: record.contact_id,
    activity_type: "consent_reconfirmed",
    description: `${(record.contacts as unknown as { name: string })?.name || "Contact"} re-confirmed email consent`,
    metadata: {
      consent_record_id: consentId,
      new_expiry: newExpiry.toISOString(),
    },
  });

  const contactName = (record.contacts as unknown as { name: string })?.name?.split(" ")[0] || "";

  return new NextResponse(
    `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Confirmed</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;text-align:center;padding:60px 20px;background:#f6f5ff;margin:0;">
<div style="max-width:420px;margin:0 auto;background:white;padding:40px 32px;border-radius:12px;box-shadow:0 2px 12px rgba(79,53,210,0.06);">
  <div style="font-size:48px;margin-bottom:16px;">&#10003;</div>
  <h1 style="font-size:22px;color:#1a1535;margin:0 0 8px;">You're all set${contactName ? `, ${contactName}` : ""}!</h1>
  <p style="color:#6b6b8d;font-size:15px;line-height:1.5;margin:0;">
    Your email subscription has been renewed. You'll continue receiving
    updates from your realtor.
  </p>
</div>
</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

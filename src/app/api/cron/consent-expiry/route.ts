import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Find implied consents expiring in next 30 days
    const { data: expiring } = await supabase
      .from("consent_records")
      .select("id, contact_id, consent_type, expiry_date, contacts(name, email)")
      .eq("consent_type", "implied")
      .eq("withdrawn", false)
      .not("expiry_date", "is", null)
      .lte("expiry_date", thirtyDaysFromNow)
      .gte("expiry_date", now);

    // Find already expired (need to pause journeys)
    const { data: expired } = await supabase
      .from("consent_records")
      .select("id, contact_id")
      .eq("consent_type", "implied")
      .eq("withdrawn", false)
      .not("expiry_date", "is", null)
      .lt("expiry_date", now);

    let paused = 0;
    if (expired) {
      for (const record of expired) {
        await supabase
          .from("contact_journeys")
          .update({ is_paused: true, pause_reason: "consent_expired" })
          .eq("contact_id", record.contact_id);

        // Mark consent as withdrawn
        await supabase
          .from("consent_records")
          .update({ withdrawn: true })
          .eq("id", record.id);

        paused++;
      }
    }

    // Send re-confirmation emails for consents expiring soon
    let reconfirmationsSent = 0;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://magnate360.com";

    if (expiring) {
      for (const record of expiring) {
        const contact = record.contacts as unknown as { name: string; email: string } | null;
        if (!contact?.email) continue;

        // Only send one re-confirmation per contact (check if already sent)
        const { data: alreadySent } = await supabase
          .from("activity_log")
          .select("id")
          .eq("contact_id", record.contact_id)
          .eq("activity_type", "consent_reconfirmation_sent")
          .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (alreadySent?.length) continue;

        const firstName = contact.name?.split(" ")[0] || "";
        const expiryDate = new Date(record.expiry_date).toLocaleDateString("en-CA", {
          year: "numeric", month: "long", day: "numeric",
        });
        const unsubscribeUrl = buildUnsubscribeUrl(record.contact_id);

        try {
          await sendEmail({
            to: contact.email,
            subject: "Stay connected — confirm your email preferences",
            html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f6f5ff;padding:40px 20px;margin:0;">
<div style="max-width:520px;margin:0 auto;background:white;padding:32px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <h2 style="color:#1a1535;margin:0 0 16px;">Stay in touch${firstName ? `, ${firstName}` : ""}?</h2>
  <p style="color:#6b6b8d;font-size:15px;line-height:1.6;margin:0 0 16px;">
    Your email subscription is set to expire on <strong>${expiryDate}</strong>.
    To keep receiving market updates, property alerts, and personalized insights,
    please confirm your preferences.
  </p>
  <a href="${appUrl}/api/consent/reconfirm?id=${record.id}" style="display:inline-block;background:#4f35d2;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
    Yes, keep me subscribed
  </a>
  <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;">
    If you do nothing, your subscription will expire automatically on ${expiryDate}
    and you'll stop receiving emails from us.
  </p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px;"/>
  <p style="color:#9ca3af;font-size:12px;margin:0;">
    <a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe now</a>
  </p>
</div>
</body></html>`,
            metadata: { contactId: record.contact_id, emailType: "consent_reconfirmation" },
          });

          // Log that we sent the re-confirmation
          await supabase.from("activity_log").insert({
            contact_id: record.contact_id,
            activity_type: "consent_reconfirmation_sent",
            description: `Consent re-confirmation email sent to ${contact.name}`,
            metadata: {
              expiry_date: record.expiry_date,
              consent_record_id: record.id,
            },
          });

          reconfirmationsSent++;
        } catch (err) {
          console.error(`Failed to send re-confirmation to ${contact.email}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      expiring_soon: expiring?.length || 0,
      expired_and_paused: paused,
      reconfirmations_sent: reconfirmationsSent,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

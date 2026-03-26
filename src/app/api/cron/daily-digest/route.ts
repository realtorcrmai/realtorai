import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Emails sent in last 24h
    const { count: sentCount } = await supabase
      .from("newsletters")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", yesterday);

    // 2. Pending drafts
    const { count: pendingCount } = await supabase
      .from("newsletters")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft");

    // 3. Hot leads (score > 60 with recent activity)
    const { data: hotLeads } = await supabase
      .from("contacts")
      .select("id, name, email, type, newsletter_intelligence")
      .not("newsletter_intelligence", "is", null)
      .limit(100);

    const hot = (hotLeads || []).filter((c) => {
      const intel = c.newsletter_intelligence as Record<string, unknown> | null;
      return intel && (intel.engagement_score as number) >= 60;
    }).slice(0, 5);

    // 4. Engagement changes (contacts with score changes in last 24h)
    const { data: recentEvents } = await supabase
      .from("newsletter_events")
      .select("newsletter_id, event_type")
      .gte("created_at", yesterday);

    const opensToday = recentEvents?.filter((e) => e.event_type === "opened").length || 0;
    const clicksToday = recentEvents?.filter((e) => e.event_type === "clicked").length || 0;

    // 5. Open rate
    const openRate = sentCount && sentCount > 0 ? Math.round((opensToday / sentCount) * 100) : 0;

    const digest = {
      date: new Date().toISOString().slice(0, 10),
      emails_sent: sentCount || 0,
      pending_drafts: pendingCount || 0,
      opens_today: opensToday,
      clicks_today: clicksToday,
      open_rate: openRate,
      hot_leads: hot.map((c) => ({
        name: c.name,
        type: c.type,
        score: (c.newsletter_intelligence as Record<string, unknown>)?.engagement_score,
      })),
    };

    // Send digest email via Resend to realtor
    const realtorEmail = process.env.AGENT_EMAIL || "demo@realestatecrm.com";

    // Build Apple-quality digest email
    const F = "-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter','Helvetica Neue',sans-serif";
    const hotLeadRows = digest.hot_leads.map((l: any) =>
      `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0"><div style="display:flex;align-items:center;gap:8px"><div style="font-size:14px;font-weight:500;color:#1d1d1f">${l.name}</div></div></td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#86868b">${l.type}</td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:700;color:${l.score >= 70 ? "#dc2626" : l.score >= 50 ? "#f59e0b" : "#1d1d1f"}">${l.score}</td></tr>`
    ).join("");

    const digestHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light dark"><style>@media(prefers-color-scheme:dark){.eb{background:#111!important}.ec{background:#1c1c1e!important}}</style></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:${F};-webkit-font-smoothing:antialiased;" class="eb">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;"><tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);" class="ec">
  <tr><td style="padding:20px 32px 16px;"><table width="100%"><tr><td><span style="font-size:15px;font-weight:700;color:#1d1d1f;">ListingFlow</span></td><td align="right"><span style="font-size:11px;color:#86868b;letter-spacing:0.5px;text-transform:uppercase;">Daily Digest</span></td></tr></table></td></tr>
  <tr><td style="padding:0 16px;"><div style="background:linear-gradient(135deg,#5856d6,#af52de);border-radius:16px;padding:36px 28px;text-align:center;">
    <div style="font-size:12px;color:rgba(255,255,255,0.6);letter-spacing:1.5px;text-transform:uppercase;">${digest.date}</div>
    <div style="font-size:28px;font-weight:800;color:#fff;margin-top:8px;letter-spacing:-0.5px;">Your AI worked overnight</div>
  </div></td></tr>
  <tr><td style="padding:20px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;"><div style="font-size:28px;font-weight:800;color:#1d1d1f;">${digest.emails_sent}</div><div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Sent</div></td>
      <td width="8"></td>
      <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;"><div style="font-size:28px;font-weight:800;color:#15803d;">${digest.open_rate}%</div><div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Opens</div></td>
      <td width="8"></td>
      <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;"><div style="font-size:28px;font-weight:800;color:#5856d6;">${digest.clicks_today}</div><div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Clicks</div></td>
    </tr></table>
  </td></tr>
  ${digest.pending_drafts > 0 ? `<tr><td style="padding:20px 32px 0;"><div style="background:linear-gradient(135deg,#fff7ed,#fffbeb);border:1px solid #fde68a;border-radius:14px;padding:16px 20px;"><div style="font-size:14px;font-weight:600;color:#92400e;">📬 ${digest.pending_drafts} draft${digest.pending_drafts > 1 ? "s" : ""} pending approval</div><div style="font-size:13px;color:#a16207;margin-top:4px;">Review in the approval queue to keep your pipeline moving.</div></div></td></tr>` : ""}
  ${digest.hot_leads.length > 0 ? `<tr><td style="padding:20px 32px 0;"><div style="font-size:12px;font-weight:700;color:#1d1d1f;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">🔥 Hot Buyers — Call Today</div><table width="100%" cellpadding="0" cellspacing="0">${hotLeadRows}</table></td></tr>` : ""}
  <tr><td style="padding:28px 32px 0;text-align:center;"><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/newsletters" style="display:inline-block;background:#1d1d1f;color:#fff;padding:16px 48px;border-radius:980px;text-decoration:none;font-weight:600;font-size:15px;">Open Dashboard</a></td></tr>
  <tr><td style="padding:24px 32px 20px;text-align:center;"><p style="font-size:11px;color:#86868b;margin:0;">ListingFlow CRM · <a href="#" style="color:#86868b;text-decoration:underline;">Unsubscribe from digest</a></p></td></tr>
</table></td></tr></table></body></html>`.trim();

    let emailResult = null;
    try {
      emailResult = await sendEmail({
        to: realtorEmail,
        subject: `ListingFlow Daily Digest - ${digest.date}`,
        html: digestHtml,
      });
    } catch (emailError) {
      console.error("Failed to send digest email:", emailError);
    }

    return NextResponse.json({ success: true, digest, emailResult });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

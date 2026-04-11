import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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

    // 5. Open rate and click rate
    const emailsSent = sentCount || 0;
    const openRate = emailsSent > 0 ? Math.round((opensToday / emailsSent) * 100) : 0;
    const clickRate = emailsSent > 0 ? Math.round((clicksToday / emailsSent) * 100) : 0;

    const digest = {
      date: new Date().toISOString().slice(0, 10),
      emails_sent: emailsSent,
      pending_drafts: pendingCount || 0,
      opens_today: opensToday,
      clicks_today: clicksToday,
      open_rate: openRate,
      click_rate: clickRate,
      hot_leads: hot.map((c) => ({
        name: c.name,
        type: c.type,
        score: (c.newsletter_intelligence as Record<string, unknown>)?.engagement_score,
      })),
    };

    // Resolve realtor email: AGENT_EMAIL > EMAIL_MONITOR_BCC > fallback
    const realtorEmail =
      process.env.AGENT_EMAIL ||
      process.env.EMAIL_MONITOR_BCC ||
      "demo@realestatecrm.com";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const F = "-apple-system,BlinkMacSystemFont,'Bricolage Grotesque','Inter','Helvetica Neue',sans-serif";

    // Score color: >= 80 coral (urgent), >= 60 emerald (warm)
    const scoreColor = (s: number) =>
      s >= 80 ? "#ff5c3a" : s >= 60 ? "#059669" : "#4f35d2";

    const hotLeadRows = digest.hot_leads
      .map(
        (l: any) =>
          `<tr>
            <td style="padding:12px 16px;border-bottom:1px solid #f0ecff;">
              <div style="font-size:14px;font-weight:600;color:#1a1535;">${l.name}</div>
              <div style="font-size:12px;color:#6b6b8a;margin-top:2px;">${l.type || "Contact"}</div>
            </td>
            <td style="padding:12px 16px;border-bottom:1px solid #f0ecff;text-align:right;">
              <span style="display:inline-block;background:${scoreColor(l.score)};color:#fff;font-size:13px;font-weight:700;padding:4px 12px;border-radius:20px;">${l.score}</span>
            </td>
          </tr>`
      )
      .join("");

    const digestHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light dark"><style>@media(prefers-color-scheme:dark){.eb{background:#1a1535!important}.ec{background:#221e3a!important}.el{color:#e0ddf5!important}.em{color:#9b97b0!important}.es{background:#2a2548!important}}</style></head>
<body style="margin:0;padding:0;background:#f4f2ff;font-family:${F};-webkit-font-smoothing:antialiased;" class="eb">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ff;"><tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(79,53,210,0.08);" class="ec">

  <!-- Header -->
  <tr><td style="padding:20px 32px 16px;border-bottom:1px solid #f0ecff;">
    <table width="100%"><tr>
      <td><span style="font-size:16px;font-weight:700;color:#4f35d2;" class="el">Realtors360</span></td>
      <td align="right"><span style="font-size:11px;color:#6b6b8a;letter-spacing:0.5px;text-transform:uppercase;" class="em">Daily Digest</span></td>
    </tr></table>
  </td></tr>

  <!-- Hero Banner -->
  <tr><td style="padding:16px 16px 0;"><div style="background:linear-gradient(135deg,#4f35d2,#7c5ce7);border-radius:13px;padding:32px 28px;text-align:center;">
    <div style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:1.5px;text-transform:uppercase;">${digest.date}</div>
    <div style="font-size:26px;font-weight:800;color:#fff;margin-top:8px;letter-spacing:-0.5px;">Your Daily Newsletter Digest</div>
  </div></td></tr>

  <!-- Stats Row: Sent | Open Rate | Click Rate -->
  <tr><td style="padding:20px 16px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="text-align:center;padding:16px;background:#f4f2ff;border-radius:13px;" class="es">
        <div style="font-size:28px;font-weight:800;color:#1a1535;" class="el">${digest.emails_sent}</div>
        <div style="font-size:11px;color:#6b6b8a;text-transform:uppercase;letter-spacing:1px;margin-top:4px;" class="em">Emails Sent</div>
      </td>
      <td width="8"></td>
      <td style="text-align:center;padding:16px;background:#f4f2ff;border-radius:13px;" class="es">
        <div style="font-size:28px;font-weight:800;color:#059669;">${digest.open_rate}%</div>
        <div style="font-size:11px;color:#6b6b8a;text-transform:uppercase;letter-spacing:1px;margin-top:4px;" class="em">Open Rate</div>
      </td>
      <td width="8"></td>
      <td style="text-align:center;padding:16px;background:#f4f2ff;border-radius:13px;" class="es">
        <div style="font-size:28px;font-weight:800;color:#4f35d2;">${digest.click_rate}%</div>
        <div style="font-size:11px;color:#6b6b8a;text-transform:uppercase;letter-spacing:1px;margin-top:4px;" class="em">Click Rate</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Hot Leads Section -->
  ${
    digest.hot_leads.length > 0
      ? `<tr><td style="padding:24px 32px 0;">
          <div style="font-size:12px;font-weight:700;color:#ff5c3a;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Hot Leads &mdash; Engagement Score 60+</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0ecff;border-radius:13px;overflow:hidden;">${hotLeadRows}</table>
        </td></tr>`
      : ""
  }

  <!-- Pending Drafts -->
  ${
    digest.pending_drafts > 0
      ? `<tr><td style="padding:20px 32px 0;">
          <div style="background:#fef9f0;border:1px solid #fde68a;border-radius:13px;padding:16px 20px;">
            <div style="font-size:14px;font-weight:600;color:#92400e;">
              ${digest.pending_drafts} draft${digest.pending_drafts > 1 ? "s" : ""} pending approval
            </div>
            <div style="font-size:13px;color:#a16207;margin-top:4px;">
              <a href="${appUrl}/newsletters/queue" style="color:#4f35d2;text-decoration:underline;font-weight:600;">Review in the approval queue</a> to keep your pipeline moving.
            </div>
          </div>
        </td></tr>`
      : ""
  }

  <!-- CTA Button -->
  <tr><td style="padding:28px 32px 0;text-align:center;">
    <a href="${appUrl}/newsletters" style="display:inline-block;background:#4f35d2;color:#fff;padding:14px 48px;border-radius:13px;text-decoration:none;font-weight:600;font-size:15px;">Open Dashboard</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 32px 20px;text-align:center;">
    <p style="font-size:11px;color:#6b6b8a;margin:0;" class="em">Realtors360 CRM &middot; <a href="${appUrl}/settings" style="color:#6b6b8a;text-decoration:underline;">Manage digest preferences</a></p>
  </td></tr>

</table></td></tr></table></body></html>`.trim();

    let emailResult = null;
    try {
      emailResult = await sendEmail({
        to: realtorEmail,
        subject: `Realtors360 Daily: ${digest.emails_sent} emails sent, ${digest.hot_leads.length} hot leads`,
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

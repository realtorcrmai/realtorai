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

    const hotLeadRows = digest.hot_leads
      .map(
        (l) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${l.name}</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${l.type}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600">${l.score}</td></tr>`
      )
      .join("");

    const digestHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f2ff">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px">
    <div style="background:#fff;border-radius:13px;padding:32px;box-shadow:0 2px 12px rgba(79,53,210,.08)">
      <h1 style="margin:0 0 4px;font-size:22px;color:#4f35d2">ListingFlow Daily Digest</h1>
      <p style="margin:0 0 24px;color:#888;font-size:14px">${digest.date}</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="text-align:center;padding:16px;background:#f8f7ff;border-radius:8px">
            <div style="font-size:28px;font-weight:700;color:#4f35d2">${digest.emails_sent}</div>
            <div style="font-size:12px;color:#666;margin-top:4px">Emails Sent</div>
          </td>
          <td style="width:8px"></td>
          <td style="text-align:center;padding:16px;background:#f8f7ff;border-radius:8px">
            <div style="font-size:28px;font-weight:700;color:#4f35d2">${digest.open_rate}%</div>
            <div style="font-size:12px;color:#666;margin-top:4px">Open Rate</div>
          </td>
          <td style="width:8px"></td>
          <td style="text-align:center;padding:16px;background:#f8f7ff;border-radius:8px">
            <div style="font-size:28px;font-weight:700;color:#4f35d2">${digest.clicks_today}</div>
            <div style="font-size:12px;color:#666;margin-top:4px">Clicks</div>
          </td>
        </tr>
      </table>

      ${digest.pending_drafts > 0 ? `<div style="background:#fff7ed;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px"><strong style="color:#b45309">${digest.pending_drafts} draft${digest.pending_drafts > 1 ? "s" : ""} pending approval</strong><br><span style="font-size:13px;color:#92400e">Review in the approval queue to keep your pipeline moving.</span></div>` : ""}

      ${digest.hot_leads.length > 0 ? `<h2 style="font-size:16px;color:#1a1535;margin:0 0 12px">Hot Leads</h2><table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr style="background:#f8f7ff"><th style="text-align:left;padding:8px 12px;font-size:13px;color:#666">Name</th><th style="text-align:left;padding:8px 12px;font-size:13px;color:#666">Type</th><th style="text-align:left;padding:8px 12px;font-size:13px;color:#666">Score</th></tr></thead><tbody>${hotLeadRows}</tbody></table>` : ""}

      <p style="margin:0;font-size:13px;color:#999;text-align:center">Sent by ListingFlow CRM</p>
    </div>
  </div>
</body>
</html>`.trim();

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

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
        // Pause journey for expired consent
        await supabase
          .from("contact_journeys")
          .update({ is_paused: true })
          .eq("contact_id", record.contact_id);
        paused++;
      }
    }

    // TODO: Send re-confirmation emails for expiring consents

    return NextResponse.json({
      success: true,
      expiring_soon: expiring?.length || 0,
      expired_and_paused: paused,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

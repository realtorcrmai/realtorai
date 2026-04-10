import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserFeatures } from "@/lib/features";

/**
 * Daily cron: downgrade expired trials (B3).
 * Finds users where trial_ends_at < NOW() and trial_plan IS NOT NULL.
 * Sets plan to "free", clears trial fields, recalculates features.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Find expired trials (idempotent — checks trial_plan IS NOT NULL)
    const { data: expiredUsers } = await supabase
      .from("users")
      .select("id, email, name")
      .not("trial_plan", "is", null)
      .lt("trial_ends_at", new Date().toISOString());

    if (!expiredUsers?.length) {
      return NextResponse.json({ processed: 0, message: "No expired trials" });
    }

    const freeFeatures = getUserFeatures("free");
    let downgraded = 0;

    for (const user of expiredUsers) {
      await supabase
        .from("users")
        .update({
          plan: "free",
          trial_plan: null,
          trial_ends_at: null,
          enabled_features: freeFeatures,
        })
        .eq("id", user.id);

      downgraded++;

      // Send trial expired email (fire-and-forget)
      import("@/actions/drip").then(({ sendDripEmail }) => {
        sendDripEmail(user.id, user.email, user.name, 14).catch(console.error);
      });
    }

    return NextResponse.json({
      success: true,
      processed: expiredUsers.length,
      downgraded,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/trial-expiry] Error:", err);
    return NextResponse.json({ error: "Trial expiry processing failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

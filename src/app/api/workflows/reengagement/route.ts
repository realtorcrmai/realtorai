import { NextRequest, NextResponse } from "next/server";
import { checkInactiveContacts } from "@/lib/workflow-triggers";

/**
 * Cron endpoint: checks for inactive contacts and auto-enrolls
 * them into re-engagement workflows.
 *
 * Should run daily (e.g., every 24 hours).
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkInactiveContacts(60);
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "reengagement-check" });
}

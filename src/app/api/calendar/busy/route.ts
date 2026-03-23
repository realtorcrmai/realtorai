import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBusyBlocks } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end query parameters are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: tokenData } = await supabase
    .from("google_tokens")
    .select("*")
    .limit(1);

  const tokenRow = tokenData?.[0] ?? null;

  if (!tokenRow) {
    return NextResponse.json({ busy: [] });
  }

  try {
    const busy = await fetchBusyBlocks(
      tokenRow.user_email,
      new Date(start),
      new Date(end)
    );
    return NextResponse.json({ busy });
  } catch (err) {
    console.error("Busy blocks API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch busy blocks" },
      { status: 500 }
    );
  }
}

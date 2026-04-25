import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { fetchBusyBlocks } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end query parameters are required" },
      { status: 400 }
    );
  }

  // google_tokens is a global table keyed by user_email — fetch via tenant
  // client's raw escape and scope to the requesting user (HC-12 compliance).
  const tc = await getAuthenticatedTenantClient();
  const { data: tokenRow } = await tc.raw
    .from("google_tokens")
    .select("user_email")
    .eq("user_email", session.user.email)
    .maybeSingle();

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
    console.warn("Busy blocks API degraded to empty:", err);
    return NextResponse.json({ busy: [], error: "google_unavailable" });
  }
}

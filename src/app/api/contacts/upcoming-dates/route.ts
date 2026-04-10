import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  let tc;
  try {
    tc = await getAuthenticatedTenantClient();
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "30");

  const { data, error } = await tc
    .from("contact_important_dates")
    .select("*, contacts(id, name, phone, email), contact_family_members(id, name)")
    .order("date_value");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const upcoming = (data || [])
    .map((d: Record<string, unknown>) => {
      const next = getNextOccurrence(d.date_value as string);
      return { ...d, next_occurrence: next };
    })
    .filter((d: Record<string, unknown>) => {
      const next = new Date(d.next_occurrence as string);
      return next >= now && next <= cutoff;
    })
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      (a.next_occurrence as string).localeCompare(b.next_occurrence as string)
    );

  return NextResponse.json(upcoming);
}

function getNextOccurrence(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), date.getMonth(), date.getDate());
  if (thisYear >= now) return thisYear.toISOString().split("T")[0];
  const nextYear = new Date(now.getFullYear() + 1, date.getMonth(), date.getDate());
  return nextYear.toISOString().split("T")[0];
}

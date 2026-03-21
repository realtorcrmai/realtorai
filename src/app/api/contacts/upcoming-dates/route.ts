import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "30");

  const { data, error } = await supabase
    .from("contact_important_dates")
    .select("*, contacts(id, name, phone, email), contact_family_members(id, name)")
    .order("date_value");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const upcoming = (data || [])
    .map((d) => {
      const next = getNextOccurrence(d.date_value);
      return { ...d, next_occurrence: next };
    })
    .filter((d) => {
      const next = new Date(d.next_occurrence);
      return next >= now && next <= cutoff;
    })
    .sort((a, b) => a.next_occurrence.localeCompare(b.next_occurrence));

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

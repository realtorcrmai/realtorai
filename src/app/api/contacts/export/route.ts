import { NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

/**
 * GET /api/contacts/export
 * Export all contacts as CSV download.
 */
export async function GET() {
  let tc;
  try {
    tc = await getAuthenticatedTenantClient();
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: contacts, error } = await tc
    .from("contacts")
    .select("name, email, phone, type, pref_channel, notes, address, source, lead_status, stage_bar, tags, company_name, job_title, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = ["name", "email", "phone", "type", "pref_channel", "notes", "address", "source", "lead_status", "stage_bar", "tags", "company_name", "job_title", "created_at"];

  const escapeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = Array.isArray(val) ? val.join("; ") : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [
    headers.join(","),
    ...(contacts ?? []).map((c: Record<string, unknown>) =>
      headers.map((h) => escapeCSV(c[h])).join(",")
    ),
  ];

  const csv = rows.join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts-${date}.csv"`,
    },
  });
}

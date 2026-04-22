import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

// GET /api/tasks/export — export tasks as CSV
export async function GET(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const sp = req.nextUrl.searchParams;
  let query = tc
    .from("tasks")
    .select("id, title, description, status, priority, category, due_date, start_date, created_at, completed_at, contacts(name), listings(address)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const status = sp.get("status");
  if (status) query = query.in("status", status.split(","));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build CSV
  const headers = ["Title", "Description", "Status", "Priority", "Category", "Due Date", "Start Date", "Contact", "Listing", "Created", "Completed"];
  const rows = (data ?? []).map((t: Record<string, unknown>) => {
    const contact = t.contacts as { name: string } | null;
    const listing = t.listings as { address: string } | null;
    return [
      csvEscape(t.title as string),
      csvEscape((t.description as string) || ""),
      t.status,
      t.priority,
      t.category,
      t.due_date || "",
      t.start_date || "",
      contact?.name || "",
      listing?.address || "",
      t.created_at,
      t.completed_at || "",
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="tasks-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

function csvEscape(str: string): string {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

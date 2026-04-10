import { NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export type UpcomingReminder = {
  id: string;
  contactId: string;
  contactName: string;
  dateType: "birthday" | "anniversary" | "mortgage_renewal" | "other";
  date: string;
  daysUntil: number;
};

function getDaysUntilNextOccurrence(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(dateStr);
  // Set to this year
  const nextOccurrence = new Date(
    today.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  // If already passed this year, use next year
  if (nextOccurrence < today) {
    nextOccurrence.setFullYear(today.getFullYear() + 1);
  }

  return Math.floor(
    (nextOccurrence.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export async function GET() {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  // Fetch important dates from contacts
  const { data: importantDates } = await tc
    .from("contact_important_dates")
    .select("id, contact_id, date_type, date_value, contacts(name)")
    .order("date_value");

  // Fetch mortgage renewals
  const { data: mortgages } = await tc
    .from("mortgages")
    .select("id, contact_id, renewal_date, contacts(name)")
    .not("renewal_date", "is", null);

  const reminders: UpcomingReminder[] = [];

  // Process important dates
  for (const row of importantDates ?? []) {
    if (!row.date_value) continue;
    const daysUntil = getDaysUntilNextOccurrence(row.date_value);
    if (daysUntil <= 30) {
      const contact = (row as unknown as { contacts: { name: string } | null }).contacts;
      reminders.push({
        id: `date-${row.id}`,
        contactId: row.contact_id,
        contactName: contact?.name ?? "Unknown",
        dateType: row.date_type as UpcomingReminder["dateType"],
        date: row.date_value,
        daysUntil,
      });
    }
  }

  // Process mortgage renewals
  for (const row of mortgages ?? []) {
    if (!row.renewal_date) continue;
    const renewalDate = new Date(row.renewal_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.floor(
      (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil >= 0 && daysUntil <= 90) {
      const contact = (row as unknown as { contacts: { name: string } | null }).contacts;
      reminders.push({
        id: `mortgage-${row.id}`,
        contactId: row.contact_id,
        contactName: contact?.name ?? "Unknown",
        dateType: "mortgage_renewal",
        date: row.renewal_date,
        daysUntil,
      });
    }
  }

  // Sort by days until
  reminders.sort((a, b) => a.daysUntil - b.daysUntil);

  return NextResponse.json({ reminders });
}

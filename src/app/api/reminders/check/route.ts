import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";

/**
 * GET /api/reminders/check
 * Cron-callable endpoint that checks for upcoming reminders and sends emails.
 * Secured via CRON_SECRET header — set in Vercel Cron or external scheduler.
 */
export async function GET(req: NextRequest) {
  // Validate cron secret (skip in development)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && process.env.NODE_ENV === "production") {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let sentCount = 0;
  const errors: string[] = [];

  // Check contact important dates
  const { data: importantDates } = await supabase
    .from("contact_important_dates")
    .select("id, contact_id, date_type, date_value, remind_days_before, contacts(name, email)")
    .order("date_value");

  for (const row of importantDates ?? []) {
    if (!row.date_value) continue;

    const dateObj = new Date(row.date_value);
    // Check this year's occurrence
    const thisYearDate = new Date(
      today.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate()
    );
    if (thisYearDate < today) {
      thisYearDate.setFullYear(today.getFullYear() + 1);
    }

    const daysUntil = Math.floor(
      (thisYearDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const remindDays = row.remind_days_before ?? 7;

    if (daysUntil === remindDays || daysUntil === 0) {
      const contact = (row as unknown as { contacts: { name: string; email: string | null } | null }).contacts;
      const contactName = contact?.name ?? "Contact";
      const dateType = row.date_type === "birthday" ? "birthday" : row.date_type === "anniversary" ? "anniversary" : "important date";
      const formattedDate = thisYearDate.toLocaleDateString("en-CA", { month: "long", day: "numeric" });

      // Send reminder to realtor (not the contact)
      const { data: settings } = await supabase
        .from("user_integrations")
        .select("config")
        .eq("provider", "email")
        .maybeSingle();

      const realtorEmail = (settings?.config as Record<string, string>)?.from_email;
      if (realtorEmail) {
        const result = await sendEmail({
          to: realtorEmail,
          subject: daysUntil === 0
            ? `Today: ${contactName}'s ${dateType}`
            : `Reminder: ${contactName}'s ${dateType} in ${daysUntil} days`,
          html: `
            <h2>${daysUntil === 0 ? "Today" : `${daysUntil} Days Away`}: ${contactName}'s ${dateType}</h2>
            <p><strong>${contactName}</strong>'s ${dateType} is on <strong>${formattedDate}</strong>.</p>
            <p>Consider reaching out to strengthen your relationship.</p>
          `,
        });

        if (result.success) sentCount++;
        else errors.push(result.error ?? "Unknown error");
      }
    }
  }

  // Check mortgage renewals
  const { data: mortgages } = await supabase
    .from("mortgages")
    .select("id, contact_id, renewal_date, contacts(name)")
    .not("renewal_date", "is", null);

  for (const row of mortgages ?? []) {
    if (!row.renewal_date) continue;

    const renewalDate = new Date(row.renewal_date);
    const daysUntil = Math.floor(
      (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Remind at 90, 30, 7, and 0 days
    if ([90, 30, 7, 0].includes(daysUntil)) {
      const contact = (row as unknown as { contacts: { name: string } | null }).contacts;
      const contactName = contact?.name ?? "Contact";
      const formattedDate = renewalDate.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });

      const { data: settings } = await supabase
        .from("user_integrations")
        .select("config")
        .eq("provider", "email")
        .maybeSingle();

      const realtorEmail = (settings?.config as Record<string, string>)?.from_email;
      if (realtorEmail) {
        const result = await sendEmail({
          to: realtorEmail,
          subject: daysUntil === 0
            ? `Today: ${contactName}'s mortgage renewal`
            : `Mortgage Renewal: ${contactName} in ${daysUntil} days`,
          html: `
            <h2>Mortgage Renewal Reminder</h2>
            <p><strong>${contactName}</strong>'s mortgage renews on <strong>${formattedDate}</strong> (${daysUntil === 0 ? "today" : `${daysUntil} days away`}).</p>
            <p>This is a great opportunity to connect and discuss refinancing options.</p>
          `,
        });

        if (result.success) sentCount++;
        else errors.push(result.error ?? "Unknown error");
      }
    }
  }

  return NextResponse.json({
    checked: true,
    sent: sentCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}

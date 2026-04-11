import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchGmailContacts } from "@/lib/contacts/gmail-import";
import { auth } from "@/lib/auth";

/** GET: Fetch contacts from Gmail → returns preview list with dedup flags */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get stored Google access token
  const { data: tokenData } = await supabase
    .from("google_tokens")
    .select("access_token")
    .eq("user_email", session.user.email)
    .single();

  if (!tokenData?.access_token) {
    return NextResponse.json(
      { error: "Google not connected. Please sign in with Google first.", needs_auth: true },
      { status: 403 }
    );
  }

  try {
    const contacts = await fetchGmailContacts(tokenData.access_token);

    // Get existing contact emails for dedup
    const { data: existing } = await supabase
      .from("contacts")
      .select("email")
      .eq("realtor_id", session.user.id)
      .not("email", "is", null);

    const existingEmails = new Set(
      (existing || []).map((c) => c.email?.toLowerCase()).filter(Boolean)
    );

    const contactsWithDedup = contacts.map((c) => ({
      ...c,
      already_exists: c.email ? existingEmails.has(c.email.toLowerCase()) : false,
    }));

    return NextResponse.json({
      contacts: contactsWithDedup,
      total: contacts.length,
      duplicates: contactsWithDedup.filter((c) => c.already_exists).length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[gmail-import] Fetch error:", message);
    return NextResponse.json({ error: "Failed to fetch contacts from Gmail" }, { status: 500 });
  }
}

/** POST: Import selected contacts into CRM */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { contacts } = await request.json();
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "No contacts selected" }, { status: 422 });
  }
  if (contacts.length > 2000) {
    return NextResponse.json({ error: "Maximum 2000 contacts per import" }, { status: 422 });
  }

  const supabase = createAdminClient();
  let imported = 0;
  let skipped = 0;

  // Batch insert in chunks of 50
  for (let i = 0; i < contacts.length; i += 50) {
    const batch = contacts.slice(i, i + 50);
    const rows = batch.map((c: Record<string, string>) => ({
      realtor_id: session.user.id,
      name: c.name || "Unknown",
      email: c.email || null,
      phone: c.phone || null,
      company: c.company || null,
      type: "lead",
      source: "gmail_import",
      external_id: c.resourceName || null,
      is_sample: false,
    }));

    const { data, error } = await supabase
      .from("contacts")
      .upsert(rows, { onConflict: "realtor_id,email", ignoreDuplicates: true })
      .select("id");

    if (data) imported += data.length;
    if (error) {
      console.error("[gmail-import] Batch error:", error.message);
      skipped += batch.length;
    }
  }

  // Clean up sample data if user now has real contacts
  if (imported > 0) {
    await supabase
      .from("contacts")
      .delete()
      .eq("realtor_id", session.user.id)
      .eq("is_sample", true);
  }

  // Log event
  await supabase.from("signup_events").insert({
    user_id: session.user.id,
    event: "contacts_imported",
    metadata: { source: "gmail", imported, skipped, total: contacts.length },
  });

  return NextResponse.json({ imported, skipped, total: contacts.length });
}

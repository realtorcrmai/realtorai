import { NextRequest, NextResponse } from "next/server";
import { fetchGmailContacts } from "@/lib/contacts/gmail-import";
import { auth } from "@/lib/auth";
import { decryptGoogleToken } from "@/lib/google-tokens";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

/** GET: Fetch contacts from Gmail → returns preview list with dedup flags */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tc = await getAuthenticatedTenantClient();

  // google_tokens is a global table keyed by user_email — use the raw
  // escape; encrypted at rest via migration 148.
  const { data: rawTokenData } = await tc.raw
    .from("google_tokens")
    .select("access_token")
    .eq("user_email", session.user.email)
    .single();

  const tokenData = decryptGoogleToken(rawTokenData);

  if (!tokenData?.access_token) {
    return NextResponse.json(
      { error: "Google not connected. Please sign in with Google first.", needs_auth: true },
      { status: 403 }
    );
  }

  try {
    const contacts = await fetchGmailContacts(tokenData.access_token as string);

    // tenant client auto-scopes contacts by realtor_id
    const { data: existing } = await tc
      .from("contacts")
      .select("email")
      .not("email", "is", null);

    type ExistingEmail = { email: string | null };
    const existingEmails = new Set(
      (((existing as ExistingEmail[]) ?? [])
        .map((c) => c.email?.toLowerCase())
        .filter(Boolean))
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

  const tc = await getAuthenticatedTenantClient();
  let imported = 0;
  let skipped = 0;

  // Batch upsert in chunks of 50 — tenant client auto-injects realtor_id.
  for (let i = 0; i < contacts.length; i += 50) {
    const batch = contacts.slice(i, i + 50);
    const rows = batch.map((c: Record<string, string>) => ({
      name: c.name || "Unknown",
      email: c.email || null,
      phone: c.phone || null,
      company: c.company || null,
      type: "lead",
      source: "gmail_import",
      external_id: c.resourceName || null,
      is_sample: false,
    }));

    const { data, error } = await tc
      .from("contacts")
      .upsert(rows, { onConflict: "realtor_id,email", ignoreDuplicates: true })
      .select("id");

    if (data) imported += data.length;
    if (error) {
      console.error("[gmail-import] Batch error:", error.message);
      skipped += batch.length;
    }
  }

  // Clean up sample data once user has real contacts
  if (imported > 0) {
    const { error: delErr } = await tc.from("contacts").delete().eq("is_sample", true);
    if (delErr) {
      console.error("[gmail-import] sample cleanup failed:", delErr.message);
    }
  }

  // Log event — non-fatal, surface in server logs if it fails. signup_events
  // is a global onboarding table keyed by user_id; use raw escape.
  const { error } = await tc.raw.from("signup_events").insert({
    user_id: session.user.id,
    event: "contacts_imported",
    metadata: { source: "gmail", imported, skipped, total: contacts.length },
  });
  if (error) {
    console.error("[import-gmail] signup_events insert failed:", error.message);
  }

  return NextResponse.json({ imported, skipped, total: contacts.length });
}

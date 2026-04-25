// Google People API — Contact Sync
// Uses existing Google OAuth tokens from google_tokens table

import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  decryptGoogleToken,
  encryptGoogleTokenFields,
} from "@/lib/google-tokens";

interface GoogleContact {
  resourceName: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  organization?: string;
  notes?: string;
}

/**
 * Get authenticated Google People API client for a user
 */
async function getPeopleClient(userEmail: string) {
  const supabase = createAdminClient();
  const { data: rawTokens } = await supabase
    .from("google_tokens")
    .select("access_token, refresh_token, expiry_date")
    .eq("user_email", userEmail)
    .single();

  if (!rawTokens) throw new Error("No Google tokens found. Please connect Google first.");

  const tokens = decryptGoogleToken(rawTokens)!;

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });

  // Auto-refresh and save new tokens (encrypted at rest — migration 148)
  oauth2.on("tokens", async (newTokens) => {
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (newTokens.access_token) update.access_token = newTokens.access_token;
    if (newTokens.expiry_date) update.expiry_date = newTokens.expiry_date;
    await supabase
      .from("google_tokens")
      .update(encryptGoogleTokenFields(update))
      .eq("user_email", userEmail);
  });

  return google.people({ version: "v1", auth: oauth2 });
}

/**
 * Fetch all contacts from Google People API
 */
export async function fetchGoogleContacts(userEmail: string): Promise<GoogleContact[]> {
  const people = await getPeopleClient(userEmail);
  const contacts: GoogleContact[] = [];
  let pageToken: string | undefined;

  do {
    const res = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: 200,
      personFields: "names,phoneNumbers,emailAddresses,addresses,organizations,biographies",
      pageToken,
    });

    for (const person of res.data.connections || []) {
      const name = person.names?.[0]?.displayName;
      const phone = person.phoneNumbers?.[0]?.value;

      if (!name || !phone) continue;

      contacts.push({
        resourceName: person.resourceName || "",
        name,
        phone,
        email: person.emailAddresses?.[0]?.value || undefined,
        address: person.addresses?.[0]?.formattedValue || undefined,
        organization: person.organizations?.[0]?.name || undefined,
        notes: person.biographies?.[0]?.value || undefined,
      });
    }

    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  return contacts;
}

/**
 * Normalize phone to E.164
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

/**
 * Sync Google contacts into CRM
 * Returns: imported, skipped (duplicates), total
 */
export async function syncGoogleContacts(
  userEmail: string,
  realtorId: string
): Promise<{ imported: number; skipped: number; duplicates: number; total: number; errors: string[] }> {
  const googleContacts = await fetchGoogleContacts(userEmail);

  const supabase = createAdminClient();

  // Get existing contacts for dedup
  const { data: existing } = await supabase
    .from("contacts")
    .select("phone, sync_external_id")
    .eq("realtor_id", realtorId);

  type ExistingContact = { phone: string | null; sync_external_id: string | null };
  const existingRows = (existing ?? []) as ExistingContact[];
  const existingPhones = new Set(existingRows.map((c) => normalizePhone(c.phone || "")));
  const existingExternalIds = new Set(existingRows.map((c) => c.sync_external_id).filter(Boolean));

  let imported = 0;
  let skipped = 0;
  let duplicates = 0;
  const errors: string[] = [];

  for (const gc of googleContacts) {
    const normalized = normalizePhone(gc.phone);

    // Skip if already synced by external ID
    if (existingExternalIds.has(gc.resourceName)) {
      skipped++;
      continue;
    }

    // Skip if phone already exists
    if (existingPhones.has(normalized)) {
      duplicates++;
      continue;
    }

    const contact: Record<string, unknown> = {
      name: gc.name,
      phone: normalized,
      email: gc.email || null,
      address: gc.address || null,
      notes: gc.organization
        ? `${gc.organization}${gc.notes ? ` — ${gc.notes}` : ""}`
        : gc.notes || null,
      type: "customer",
      pref_channel: "sms",
      source: "google_contacts",
      sync_source: "google",
      sync_external_id: gc.resourceName,
      realtor_id: realtorId,
    };

    const { error } = await supabase.from("contacts").insert(contact);
    if (error) {
      errors.push(`${gc.name}: ${error.message}`);
    } else {
      imported++;
      existingPhones.add(normalized);
    }
  }

  // Update sync source record
  await supabase.from("contact_sync_sources").upsert({
    realtor_id: realtorId,
    provider: "google",
    provider_account_id: userEmail,
    provider_account_name: userEmail,
    is_active: true,
    auto_sync: true,
    last_synced_at: new Date().toISOString(),
    total_synced: imported,
    total_duplicates_merged: duplicates,
    sync_error: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
  }, { onConflict: "realtor_id,provider,provider_account_id" });

  return { imported, skipped, duplicates, total: googleContacts.length, errors };
}

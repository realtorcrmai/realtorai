import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

/**
 * POST /api/contacts/import
 * Two-pass CSV import:
 *   Pass 1 — create all contacts, build name→id and phone→id lookup maps.
 *   Pass 2 — link referred_by_id and insert contact_family_members rows.
 *
 * Required columns : name, phone
 * Optional columns : email, type, notes, address, source, pref_channel,
 *                    referred_by (name or phone of referrer),
 *                    family_of   (name or phone of the primary family contact),
 *                    family_relationship (spouse|child|parent|sibling|other — default "other")
 */
export async function POST(request: NextRequest) {
  const tc = await getAuthenticatedTenantClient();
  const contentType = request.headers.get("content-type") || "";

  // ── Path A: JSON body from onboarding CSVImportStep (client-side parsed) ──
  if (contentType.includes("application/json")) {
    return handleJSONImport(tc, request);
  }

  // ── Path B: FormData with raw CSV file (server-side parsed) ──
  return handleFormDataImport(tc, request);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleJSONImport(tc: any, request: NextRequest) {
  const { contacts, source } = await request.json();
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
  }
  if (contacts.length > 5000) {
    return NextResponse.json({ error: "Maximum 5000 contacts per import" }, { status: 422 });
  }

  const validTypes = new Set(["buyer", "seller", "customer", "agent", "partner", "lead", "other"]);
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const newContacts: Array<{ id: string; name: string }> = [];

  // Batch insert in chunks of 50
  for (let i = 0; i < contacts.length; i += 50) {
    const batch = contacts.slice(i, i + 50);
    const rows = batch
      .filter((c: Record<string, string>) => c.name || c.email)
      .map((c: Record<string, string>) => ({
        name: c.name || "Unknown",
        email: c.email || null,
        phone: c.phone ? normalizePhone(c.phone) : null,
        type: validTypes.has(c.type?.toLowerCase()) ? c.type.toLowerCase() : "lead",
        notes: c.notes || null,
        source: source || "csv_import",
        is_sample: false,
      }));

    if (rows.length === 0) { skipped += batch.length; continue; }

    const { data, error } = await tc
      .from("contacts")
      .insert(rows)
      .select("id, name");

    if (data) {
      imported += data.length;
      newContacts.push(...data.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name })));
    }
    if (error) {
      errors.push(error.message);
      skipped += rows.length;
    }
  }

  // Clean up sample data if user now has real contacts
  if (imported > 0) {
    await tc.from("contacts").delete().eq("is_sample", true);
  }

  // ── Referral detection: two-word names where second word matches an existing contact ──
  const referralSuggestions: Array<{
    contact_id: string;
    contact_name: string;
    possible_referrer_id: string;
    possible_referrer_name: string;
  }> = [];

  if (newContacts.length > 0) {
    // Get all contacts (including just-imported) for name matching
    const { data: allContacts } = await tc
      .from("contacts")
      .select("id, name")
      .not("name", "is", null);

    if (allContacts && allContacts.length > 0) {
      // Build first-name lookup: "anish" → [{ id, fullName: "Anish Kumar" }]
      const firstNameMap = new Map<string, Array<{ id: string; name: string }>>();
      for (const c of allContacts) {
        if (!c.name) continue;
        const firstName = c.name.split(/\s+/)[0]?.toLowerCase();
        if (firstName && firstName.length >= 2) {
          if (!firstNameMap.has(firstName)) firstNameMap.set(firstName, []);
          firstNameMap.get(firstName)!.push({ id: c.id, name: c.name });
        }
      }

      // Check newly imported contacts for two-word name pattern
      const newContactIds = new Set(newContacts.map((c) => c.id));
      for (const nc of newContacts) {
        const parts = nc.name.trim().split(/\s+/);
        if (parts.length !== 2) continue; // Only exact two-word names

        const secondWord = parts[1].toLowerCase();
        const matches = firstNameMap.get(secondWord) || [];

        // Filter: don't suggest self, don't suggest other just-imported contacts
        const validMatches = matches.filter(
          (m) => m.id !== nc.id && !newContactIds.has(m.id)
        );

        if (validMatches.length > 0) {
          // Take the best match (first one)
          referralSuggestions.push({
            contact_id: nc.id,
            contact_name: parts[0],
            possible_referrer_id: validMatches[0].id,
            possible_referrer_name: validMatches[0].name,
          });
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    imported,
    skipped,
    errors: errors.slice(0, 5),
    referral_suggestions: referralSuggestions.slice(0, 10),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleFormDataImport(tc: any, request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must have header + at least 1 row" }, { status: 400 });
  }

  // ── Header parsing ─────────────────────────────────────────
  const headers = parseCSVRow(lines[0]).map((h) => h.trim().toLowerCase());

  const nameIdx        = headers.indexOf("name");
  const phoneIdx       = headers.indexOf("phone");
  if (nameIdx === -1 || phoneIdx === -1) {
    return NextResponse.json({ error: "CSV must have 'name' and 'phone' columns" }, { status: 400 });
  }

  const emailIdx       = headers.indexOf("email");
  const typeIdx        = headers.indexOf("type");
  const notesIdx       = headers.indexOf("notes");
  const addressIdx     = headers.indexOf("address");
  const sourceIdx      = headers.indexOf("source");
  const prefIdx        = headers.indexOf("pref_channel");
  const referredByIdx  = headers.indexOf("referred_by");
  const familyOfIdx    = headers.indexOf("family_of");
  const familyRelIdx   = headers.indexOf("family_relationship");

  // ── Fetch existing contacts for duplicate + lookup ──────────
  const { data: existingContacts } = await tc
    .from("contacts")
    .select("id, name, phone");

  // Build lookups: normalised-phone → id, lower-name → id
  const phoneToId = new Map<string, string>();
  const nameToId  = new Map<string, string>();
  for (const c of existingContacts ?? []) {
    if (c.phone) phoneToId.set(normalizePhone(c.phone), c.id);
    if (c.name)  nameToId.set(c.name.toLowerCase().trim(), c.id);
  }
  const existingPhones = new Set(phoneToId.keys());

  const validTypes         = new Set(["buyer", "seller", "customer", "agent", "partner", "other"]);
  const validRelationships = new Set(["spouse", "child", "parent", "sibling", "other"]);

  // ── Parse rows into memory ──────────────────────────────────
  type RowMeta = {
    rowNum:             number;
    name:               string;
    normalizedPhone:    string;
    contact:            Record<string, string>;
    referredByRaw:      string;
    familyOfRaw:        string;
    familyRelationship: string;
  };

  const toCreate: RowMeta[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const row  = parseCSVRow(lines[i]);
    const name = row[nameIdx]?.trim();
    const phone = row[phoneIdx]?.trim();
    if (!name || !phone) { skipped++; continue; }

    const normalized = normalizePhone(phone);
    if (existingPhones.has(normalized)) { skipped++; continue; }

    const type = typeIdx >= 0 ? row[typeIdx]?.trim().toLowerCase() : "buyer";
    const contact: Record<string, string> = {
      name,
      phone:        normalized,
      type:         validTypes.has(type) ? type : "buyer",
      pref_channel: prefIdx >= 0 && row[prefIdx]?.trim() ? row[prefIdx].trim() : "sms",
    };
    if (emailIdx   >= 0 && row[emailIdx]?.trim())   contact.email   = row[emailIdx].trim();
    if (notesIdx   >= 0 && row[notesIdx]?.trim())   contact.notes   = row[notesIdx].trim();
    if (addressIdx >= 0 && row[addressIdx]?.trim()) contact.address = row[addressIdx].trim();
    if (sourceIdx  >= 0 && row[sourceIdx]?.trim())  contact.source  = row[sourceIdx].trim();

    toCreate.push({
      rowNum:             i + 1,
      name,
      normalizedPhone:    normalized,
      contact,
      referredByRaw:      referredByIdx >= 0 ? (row[referredByIdx]?.trim() ?? "") : "",
      familyOfRaw:        familyOfIdx   >= 0 ? (row[familyOfIdx]?.trim()   ?? "") : "",
      familyRelationship: familyRelIdx  >= 0 ? (row[familyRelIdx]?.trim().toLowerCase() ?? "other") : "other",
    });
  }

  // ── Pass 1: Create contacts ─────────────────────────────────
  let imported = 0;
  const errors: string[] = [];

  const newNameToId  = new Map<string, string>();
  const newPhoneToId = new Map<string, string>();

  for (const meta of toCreate) {
    const { data, error } = await tc
      .from("contacts")
      .insert(meta.contact)
      .select("id")
      .single();

    if (error) {
      errors.push(`Row ${meta.rowNum} (${meta.name}): ${error.message}`);
    } else if (data) {
      imported++;
      existingPhones.add(meta.normalizedPhone);
      newNameToId.set(meta.name.toLowerCase().trim(), data.id);
      newPhoneToId.set(meta.normalizedPhone, data.id);
    }
  }

  // ── Pass 2: Link relationships ──────────────────────────────
  let referralsLinked = 0;
  let familiesLinked  = 0;
  const relErrors: string[] = [];

  function resolveContactId(raw: string): string | null {
    if (!raw) return null;
    const lower = raw.toLowerCase().trim();
    if (newNameToId.has(lower))                       return newNameToId.get(lower)!;
    const normPhone = normalizePhone(raw);
    if (newPhoneToId.has(normPhone))                   return newPhoneToId.get(normPhone)!;
    if (nameToId.has(lower))                           return nameToId.get(lower)!;
    if (phoneToId.has(normPhone))                      return phoneToId.get(normPhone)!;
    return null;
  }

  for (const meta of toCreate) {
    const myId = newNameToId.get(meta.name.toLowerCase().trim());
    if (!myId) continue;

    if (meta.referredByRaw) {
      const referrerId = resolveContactId(meta.referredByRaw);
      if (referrerId && referrerId !== myId) {
        const { error } = await tc
          .from("contacts")
          .update({ referred_by_id: referrerId })
          .eq("id", myId);
        if (error) relErrors.push(`Row ${meta.rowNum} referred_by: ${error.message}`);
        else referralsLinked++;
      } else if (!referrerId) {
        relErrors.push(`Row ${meta.rowNum}: referred_by "${meta.referredByRaw}" not found`);
      }
    }

    if (meta.familyOfRaw) {
      const primaryId = resolveContactId(meta.familyOfRaw);
      const relationship = validRelationships.has(meta.familyRelationship)
        ? meta.familyRelationship
        : "other";

      if (primaryId && primaryId !== myId) {
        const { error } = await tc.from("contact_family_members").insert({
          contact_id:   primaryId,
          name:         meta.name,
          relationship,
          phone:        meta.normalizedPhone || null,
          email:        meta.contact.email   || null,
          notes:        `Imported from bulk CSV`,
        });
        if (error) relErrors.push(`Row ${meta.rowNum} family_of: ${error.message}`);
        else familiesLinked++;
      } else if (!primaryId) {
        relErrors.push(`Row ${meta.rowNum}: family_of "${meta.familyOfRaw}" not found`);
      }
    }
  }

  return NextResponse.json({
    ok:              true,
    imported,
    skipped,
    referrals_linked: referralsLinked,
    families_linked:  familiesLinked,
    errors:          [...errors, ...relErrors].slice(0, 15),
    total:           lines.length - 1,
  });
}

function normalizePhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { result.push(current); current = ""; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

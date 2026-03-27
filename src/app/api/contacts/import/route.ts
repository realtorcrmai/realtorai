import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/contacts/import
 * Import contacts from CSV. Expects multipart form data with a "file" field.
 * CSV must have header row. Required: name, phone. Optional: email, type, notes, address, source.
 * Skips rows with duplicate phone numbers (existing in DB).
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

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

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine).map((h) => h.trim().toLowerCase());

  const nameIdx = headers.indexOf("name");
  const phoneIdx = headers.indexOf("phone");

  if (nameIdx === -1 || phoneIdx === -1) {
    return NextResponse.json(
      { error: "CSV must have 'name' and 'phone' columns" },
      { status: 400 }
    );
  }

  // Get existing phones to skip duplicates
  const { data: existing } = await supabase.from("contacts").select("phone");
  const existingPhones = new Set((existing ?? []).map((c) => normalizePhone(c.phone)));

  const emailIdx = headers.indexOf("email");
  const typeIdx = headers.indexOf("type");
  const notesIdx = headers.indexOf("notes");
  const addressIdx = headers.indexOf("address");
  const sourceIdx = headers.indexOf("source");
  const prefIdx = headers.indexOf("pref_channel");

  const validTypes = new Set(["buyer", "seller", "customer", "agent", "partner", "other"]);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    const name = row[nameIdx]?.trim();
    const phone = row[phoneIdx]?.trim();

    if (!name || !phone) {
      skipped++;
      continue;
    }

    const normalized = normalizePhone(phone);
    if (existingPhones.has(normalized)) {
      skipped++;
      continue;
    }

    const type = typeIdx >= 0 ? row[typeIdx]?.trim().toLowerCase() : "buyer";

    const contact: Record<string, string> = {
      name,
      phone: normalized,
      type: validTypes.has(type) ? type : "buyer",
      pref_channel: prefIdx >= 0 && row[prefIdx]?.trim() ? row[prefIdx].trim() : "sms",
    };

    if (emailIdx >= 0 && row[emailIdx]?.trim()) contact.email = row[emailIdx].trim();
    if (notesIdx >= 0 && row[notesIdx]?.trim()) contact.notes = row[notesIdx].trim();
    if (addressIdx >= 0 && row[addressIdx]?.trim()) contact.address = row[addressIdx].trim();
    if (sourceIdx >= 0 && row[sourceIdx]?.trim()) contact.source = row[sourceIdx].trim();

    const { error } = await supabase.from("contacts").insert(contact);
    if (error) {
      errors.push(`Row ${i + 1}: ${error.message}`);
    } else {
      imported++;
      existingPhones.add(normalized);
    }
  }

  return NextResponse.json({
    ok: true,
    imported,
    skipped,
    errors: errors.slice(0, 10),
    total: lines.length - 1,
  });
}

function normalizePhone(phone: string): string {
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
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

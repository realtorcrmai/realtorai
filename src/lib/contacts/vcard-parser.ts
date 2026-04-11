export interface VCardContact {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
}

/**
 * Parse a vCard (.vcf) file into structured contacts.
 * Supports vCard 3.0 (Apple Contacts default) and 4.0.
 * Apple exports all contacts as one .vcf with multiple BEGIN:VCARD blocks.
 *
 * Extracted properties: FN, EMAIL, TEL, ORG, ADR, NOTE.
 * Takes first email/phone only (contacts may have multiple).
 * Unfolds continuation lines per RFC 6350.
 */
export function parseVCard(vcfContent: string): VCardContact[] {
  // Unfold continuation lines (lines starting with space/tab join previous)
  const unfolded = vcfContent.replace(/\r?\n[ \t]/g, "");

  const contacts: VCardContact[] = [];
  const cards = unfolded.split("BEGIN:VCARD").slice(1);

  for (const card of cards) {
    const lines = card.split(/\r?\n/);
    const contact: VCardContact = {
      name: "",
      email: null,
      phone: null,
      company: null,
      address: null,
      notes: null,
    };

    for (const line of lines) {
      if (line.startsWith("FN:") || line.startsWith("FN;")) {
        contact.name = extractValue(line);
      } else if (line.startsWith("EMAIL")) {
        contact.email = contact.email || extractValue(line);
      } else if (line.startsWith("TEL")) {
        contact.phone = contact.phone || extractValue(line);
      } else if (line.startsWith("ORG")) {
        contact.company = extractValue(line)
          .split(";")
          .filter(Boolean)
          .join(" - ")
          .trim();
      } else if (line.startsWith("ADR")) {
        const parts = extractValue(line).split(";").filter(Boolean);
        contact.address = parts.join(", ").trim() || null;
      } else if (line.startsWith("NOTE")) {
        contact.notes = extractValue(line);
      }
    }

    if (contact.name && contact.name !== "Unknown") {
      contacts.push(contact);
    }
  }

  return contacts;
}

/** Extract value after first colon, unescape vCard characters. */
function extractValue(line: string): string {
  const colonIndex = line.indexOf(":");
  if (colonIndex < 0) return "";
  return line
    .slice(colonIndex + 1)
    .trim()
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\\\/g, "\\");
}

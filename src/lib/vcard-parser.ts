/**
 * vCard (.vcf) parser — supports vCard 2.1, 3.0, and 4.0
 * Extracts: name, phone, email, address, organization, notes
 * Handles multi-contact .vcf files (multiple BEGIN:VCARD blocks)
 */

export interface VCardContact {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  organization?: string;
  notes?: string;
  type?: string;
}

export function parseVCard(text: string): VCardContact[] {
  const contacts: VCardContact[] = [];

  // Unfold continuation lines (RFC 2425: line starting with space/tab is continuation)
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");

  // Split into individual vCard blocks
  const blocks = unfolded.split(/BEGIN:VCARD/i).slice(1);

  for (const block of blocks) {
    const endIdx = block.toUpperCase().indexOf("END:VCARD");
    const content = endIdx >= 0 ? block.substring(0, endIdx) : block;
    const lines = content.split(/\r?\n/).filter((l) => l.trim());

    let name = "";
    let phone = "";
    let email = "";
    let address = "";
    let organization = "";
    let notes = "";

    for (const line of lines) {
      const { property, value } = parseLine(line);

      switch (property) {
        case "FN":
          // Full name — preferred
          if (!name) name = decodeValue(value);
          break;

        case "N": {
          // Structured name: last;first;middle;prefix;suffix
          if (!name) {
            const parts = value.split(";").map((p) => decodeValue(p.trim()));
            const [last, first, middle] = parts;
            name = [first, middle, last].filter(Boolean).join(" ");
          }
          break;
        }

        case "TEL": {
          // Take first phone number
          if (!phone) {
            phone = value.replace(/[^\d+]/g, "");
          }
          break;
        }

        case "EMAIL":
          if (!email) email = decodeValue(value);
          break;

        case "ADR": {
          // Structured address: PO;ext;street;city;region;postal;country
          const adrParts = value.split(";").map((p) => decodeValue(p.trim()));
          const formatted = [adrParts[2], adrParts[3], adrParts[4], adrParts[5], adrParts[6]]
            .filter(Boolean)
            .join(", ");
          if (!address && formatted) address = formatted;
          break;
        }

        case "ORG":
          if (!organization) organization = decodeValue(value.split(";")[0]);
          break;

        case "NOTE":
          if (!notes) notes = decodeValue(value);
          break;
      }
    }

    // Only add if we have at least a name
    if (name.trim()) {
      contacts.push({
        name: name.trim(),
        phone: normalizePhone(phone),
        email: email || undefined,
        address: address || undefined,
        organization: organization || undefined,
        notes: notes || undefined,
        type: "buyer", // default type
      });
    }
  }

  return contacts;
}

function parseLine(line: string): { property: string; value: string } {
  // Format: PROPERTY;params:value or PROPERTY:value
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return { property: "", value: "" };

  const left = line.substring(0, colonIdx);
  const value = line.substring(colonIdx + 1);

  // Property name is before any semicolon params
  const semiIdx = left.indexOf(";");
  const property = (semiIdx >= 0 ? left.substring(0, semiIdx) : left).toUpperCase().trim();

  return { property, value };
}

function decodeValue(value: string): string {
  // Handle quoted-printable encoding (=XX)
  let decoded = value.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  // Handle escaped characters
  decoded = decoded.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
  return decoded.trim();
}

function normalizePhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : digits ? `+${digits}` : "";
}

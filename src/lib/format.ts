/**
 * Shared field formatters for North-American inputs.
 *
 * Pure functions with no server/client dependencies — safe to import from either.
 *
 * Conventions:
 *  - Phones are STORED in E.164 (`+16045550100`) and DISPLAYED as `+1 (604) 555-0100`.
 *  - Postal codes are normalized to the Canadian `V5K 0A1` format.
 *  - Currency uses `en-CA` locale with thousands separators for display only.
 */

// ── Phone ──────────────────────────────────────────────────────────

/**
 * Display format: raw/partial input → `+1 (604) 555-0100`.
 *
 * Used on `onBlur` of phone inputs. Preserves partial entries while typing by
 * returning best-effort partial formatting (e.g., `"604"` → `"604"`,
 * `"60455"` → `"(604) 55"`).
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  const national =
    digits.startsWith("1") && digits.length >= 11
      ? digits.slice(1, 11)
      : digits.slice(0, 10);
  if (national.length <= 3) return national;
  if (national.length <= 6) return `(${national.slice(0, 3)}) ${national.slice(3)}`;
  return `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 10)}`;
}

/**
 * Canonical storage format: any phone → `+16045550100` (E.164).
 *
 * Returns `null` if the input cannot be coerced to 10 digits (caller decides
 * whether to reject or proxy the null through). This mirrors the domain rule
 * "phones are stored in E.164" without pulling in the Twilio server SDK.
 */
export function normalizePhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

// ── Postal code ────────────────────────────────────────────────────

/**
 * Canadian postal code: `"v5k0a1"` / `"V5K-0A1"` → `"V5K 0A1"`.
 *
 * Non-alphanumeric characters are stripped; output is uppercased with a single
 * space after the third character. Partial inputs are preserved.
 */
export function formatPostalCode(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return cleaned.slice(0, 3) + " " + cleaned.slice(3, 6);
}

// ── Currency ───────────────────────────────────────────────────────

/**
 * `"950000"` → `"950,000"` (display only — strip with `unformatCurrency`
 * before storing as a number).
 */
export function formatCurrency(raw: string | number): string {
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-CA");
}

/** `"950,000"` → `"950000"` — strip all non-digits for numeric storage. */
export function unformatCurrency(formatted: string): string {
  return formatted.replace(/[^0-9]/g, "");
}

// ── Name ───────────────────────────────────────────────────────────

/**
 * Non-destructive title-case:
 *  - If the name is ALL lowercase (e.g. `"john smith"`), capitalize each word.
 *  - Otherwise leave as-is to preserve intentional casing like `"van Houten"`,
 *    `"McDonald"`, or all-caps acronyms.
 *
 * Designed for `onBlur` handlers so users who type naturally get a sensible
 * default without fighting the formatter.
 */
export function titleCaseName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Only transform if input is entirely lowercase letters/spaces/hyphens/apostrophes
  if (trimmed !== trimmed.toLowerCase()) return trimmed;
  return trimmed
    .split(/(\s+|-)/) // keep separators
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === "-") return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

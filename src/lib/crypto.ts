// SOC 2 CC6.1 — PII encryption at rest
//
// AES-256-GCM encryption for FINTRAC identity fields and other PII
// stored in the database. Separate from src/lib/social/crypto.ts which
// is scoped to OAuth tokens and uses a weaker key-derivation path.
//
// Ciphertext format:  v1:<iv_base64>:<tag_base64>:<ciphertext_base64>
//   - v1 prefix reserves a key-version slot for future rotation.
//     When we add envelope encryption (v2 of this module), new rows
//     get v2 prefix and readers route to the right key by prefix.
//   - base64 chosen over hex to roughly halve the stored string length.
//   - All three components are independently base64-decoded; no
//     ambiguity from colons inside the payload.
//
// Key management (v2 of plan WS-1 — launch fallback):
//   - Single process.env.PII_ENCRYPTION_KEY
//   - Must be 32 bytes of entropy, supplied as base64 (44 chars) or
//     hex (64 chars). Short or missing keys abort at first use — we
//     never fall back to a derived key for PII (social/crypto.ts does
//     that for lower-sensitivity data, but FINTRAC cannot).
//   - Tracked as tech debt in docs/compliance/RISK_REGISTER.md.
//   - Target state: Supabase Vault envelope encryption by Week 4.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // AES-GCM standard
const TAG_BYTES = 16;
const CURRENT_VERSION = "v1";

// ---------------------------------------------------------------
// Key loading
// ---------------------------------------------------------------

let _cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (_cachedKey) return _cachedKey;

  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "[crypto] PII_ENCRYPTION_KEY is not set. " +
        "FINTRAC PII cannot be read or written without it. " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }

  // Accept base64 (44 chars incl padding, or 43 without) or hex (64).
  let key: Buffer;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    try {
      key = Buffer.from(raw, "base64");
    } catch {
      throw new Error("[crypto] PII_ENCRYPTION_KEY is not valid base64 or hex.");
    }
  }

  if (key.length !== 32) {
    throw new Error(
      `[crypto] PII_ENCRYPTION_KEY must be 32 bytes (got ${key.length}). ` +
        "Do not pad or truncate — regenerate a 32-byte key."
    );
  }

  _cachedKey = key;
  return key;
}

// ---------------------------------------------------------------
// Core encrypt / decrypt
// ---------------------------------------------------------------

export function encryptPii(plaintext: string): string {
  if (plaintext === "" || plaintext == null) {
    // Preserve empty-string semantics — don't encrypt nothing, it
    // would be indistinguishable from a legitimately empty field.
    return plaintext;
  }

  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    CURRENT_VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptPii(ciphertext: string): string {
  if (ciphertext === "" || ciphertext == null) return ciphertext;

  const parts = ciphertext.split(":");
  if (parts.length !== 4) {
    throw new Error("[crypto] Malformed ciphertext — expected 4 segments.");
  }
  const [version, ivB64, tagB64, dataB64] = parts;

  if (version !== "v1") {
    throw new Error(`[crypto] Unsupported ciphertext version: ${version}`);
  }

  const key = loadKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  if (iv.length !== IV_BYTES) {
    throw new Error("[crypto] IV length mismatch.");
  }
  if (tag.length !== TAG_BYTES) {
    throw new Error("[crypto] Auth tag length mismatch.");
  }

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(data),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

// ---------------------------------------------------------------
// Row helpers
// ---------------------------------------------------------------

/**
 * Detect whether a field is already encrypted. Used defensively when
 * we can't be sure whether a caller passed us plaintext or ciphertext.
 * Not a security boundary — just a safety net.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^v\d+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(value);
}

/**
 * Encrypt a map of field values. Null / undefined / empty-string values
 * pass through unchanged so the DB sees NULL where the caller meant it.
 */
export function encryptFields<T extends Record<string, unknown>>(
  input: T,
  fields: readonly (keyof T)[]
): T {
  const out: Record<string, unknown> = { ...input };
  for (const f of fields) {
    const v = input[f];
    if (typeof v === "string" && v.length > 0) {
      out[f as string] = encryptPii(v);
    }
  }
  return out as T;
}

/**
 * Decrypt a map of field values. Silently tolerates:
 *   - null / empty-string (returns as-is)
 *   - already-plaintext values (returns as-is — useful during migration
 *     bridge if any plaintext sneaks through)
 * Does NOT silently tolerate malformed ciphertext: throws, so the
 * caller treats it as an error rather than displaying garbage.
 */
export function decryptFields<T extends Record<string, unknown>>(
  row: T,
  fields: readonly (keyof T)[]
): T {
  const out: Record<string, unknown> = { ...row };
  for (const f of fields) {
    const v = row[f];
    if (typeof v === "string" && v.length > 0 && isEncrypted(v)) {
      out[f as string] = decryptPii(v);
    }
  }
  return out as T;
}

// Exported list of FINTRAC identity fields — keep in sync with
// migration 147 and the two identity action files. Single source of
// truth prevents drift.
export const FINTRAC_ENCRYPTED_FIELDS = [
  "id_number",
  "dob",
  "citizenship",
  "mailing_address",
] as const;

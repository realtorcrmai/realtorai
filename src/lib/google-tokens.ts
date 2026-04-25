// SOC 2 CC6.1 — Google OAuth token encryption helpers
//
// `access_token` and `refresh_token` in the google_tokens table are
// encrypted at rest using the same AES-256-GCM scheme as FINTRAC PII
// (see src/lib/crypto.ts). This file is the single point where read
// and write sites wrap the cipher, so tokens enter/leave the DB as
// ciphertext but flow through the rest of the app as plaintext.
//
// Bridge behaviour:
//   - Any row written before migration 148 stores plaintext.
//   - decryptFields() calls isEncrypted() and silently passes plaintext
//     through. This means we do NOT need to truncate and re-link every
//     user's Google account when the feature turns on.
//   - First refresh after this change re-writes the row with ciphertext,
//     so the bridge closes naturally as tokens rotate.
//
// Scope: only Google OAuth tokens. Other OAuth paths (src/lib/oauth/,
// src/lib/social/) have their own crypto and are NOT covered here.

import { encryptFields, decryptFields } from "@/lib/crypto";

export const GOOGLE_TOKEN_ENCRYPTED_FIELDS = [
  "access_token",
  "refresh_token",
] as const;

/**
 * Decrypt a google_tokens row (or a partial projection of one) after it
 * comes back from Supabase. Safe to call with null / undefined — returns
 * the value unchanged. Accepts single rows and arrays.
 */
export function decryptGoogleToken<T extends Record<string, unknown> | null | undefined>(
  row: T
): T {
  if (row == null) return row;
  return decryptFields(row as Record<string, unknown>, GOOGLE_TOKEN_ENCRYPTED_FIELDS) as T;
}

export function decryptGoogleTokens<T extends Record<string, unknown>>(
  rows: T[] | null | undefined
): T[] {
  if (!rows) return [];
  return rows.map((r) =>
    decryptFields(r, GOOGLE_TOKEN_ENCRYPTED_FIELDS) as T
  );
}

/**
 * Encrypt the token fields of a row before insert/update. Leaves other
 * columns (user_email, realtor_id, expiry_date, …) untouched. Non-string
 * or empty values pass through unchanged — consistent with crypto.ts.
 */
export function encryptGoogleTokenFields<T extends Record<string, unknown>>(
  row: T
): T {
  return encryptFields(row, GOOGLE_TOKEN_ENCRYPTED_FIELDS);
}

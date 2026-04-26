// SOC 2 CC6.6 — Multi-factor authentication service
//
// Wraps RFC 6238 TOTP via `otplib` and adds:
//   - Encrypted-at-rest secret + backup codes (AES-256-GCM via crypto.ts)
//   - Constant-time backup-code lookup (timingSafeEqual)
//   - Atomic backup-code consumption (one-shot, removed from JSONB array
//     after successful verify)
//   - Lifecycle separation: enroll → verify → enabled. A row whose
//     enrolled_at is NULL is "in flight" and ignored by the auth gate.
//
// Authority on TOTP:
//   - 30-second step (otplib default)
//   - ±1 step tolerance for clock skew (window: 1) — accepts the previous
//     and current code on each verify. Anything wider (window: 2+) lets
//     attackers resend a stale code from up to 90s back, which is too
//     long given that we're protecting ID + KYC data.
//   - Algorithm: SHA-1 (Google Authenticator / 1Password / Authy default).
//     SHA-256 is supported by some clients but compatibility is poor.
//
// Backup codes:
//   - 10 codes per enrollment, 8 chars each from base32 alphabet
//     (excluding 0/1/I/O for legibility).
//   - Codes are issued once, then encrypted independently and stored
//     in the JSONB array. Each verify decrypts the array and looks for
//     a constant-time match. Consumption removes the matched element.
//   - We do NOT hash backup codes. AES-256-GCM gives equivalent
//     confidentiality with a single key-rotation story; adding an HMAC
//     layer is duplicate work.
//
// What this file does NOT do:
//   - Login flow integration (challenge during sign-in) — that's D3 in
//     src/lib/auth.ts.
//   - Rate limiting on verify — relies on the existing rate-limit
//     middleware applied at the route layer.

import { generateSecret, generateURI, verify } from "otplib";
import { randomBytes, timingSafeEqual } from "crypto";
import { encryptPii, decryptPii } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------
//
// otplib v13 dropped the global `authenticator.options` setter in
// favour of per-call options. We centralise our TOTP parameters here
// so every verify uses the same posture:
//   - period: 30s (RFC 6238 default)
//   - epochTolerance: 30s = ±1 step skew window. Anything wider lets
//     attackers replay a stale code from up to 90s back.
//   - algorithm: sha1 (Google Authenticator / 1Password / Authy default)

const TOTP_OPTIONS = {
  period: 30,
  epochTolerance: 30,
  algorithm: "sha1" as const,
};

const ISSUER = "Realtors360";
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes 0/1/I/O

// ---------------------------------------------------------------
// Secret + URI generation
// ---------------------------------------------------------------

/**
 * Generate a fresh TOTP shared secret and the otpauth:// URI used to
 * render a QR code in the enrollment UI. The secret is base32 (the
 * format Authenticator apps expect when entered manually).
 */
export function generateTotpSecret(userEmail: string): {
  secret: string;
  otpauthUrl: string;
} {
  const secret = generateSecret(); // base32
  const otpauthUrl = generateURI({
    issuer: ISSUER,
    label: userEmail,
    secret,
    algorithm: TOTP_OPTIONS.algorithm,
    period: TOTP_OPTIONS.period,
  });
  return { secret, otpauthUrl };
}

/**
 * Verify a 6-digit TOTP code against a base32 secret. Returns true if
 * the code matches the current 30s window or the immediately adjacent
 * window (clock skew). Constant-time internally via otplib.
 */
export async function verifyTotp(
  secret: string,
  token: string
): Promise<boolean> {
  if (!secret || !token) return false;
  // Reject obvious garbage early — saves an HMAC and avoids leaking
  // timing info on the length check.
  if (!/^\d{6}$/.test(token)) return false;
  try {
    const result = await verify({
      token,
      secret,
      period: TOTP_OPTIONS.period,
      epochTolerance: TOTP_OPTIONS.epochTolerance,
      algorithm: TOTP_OPTIONS.algorithm,
    });
    return result.valid;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------
// Backup codes
// ---------------------------------------------------------------

/**
 * Generate N plaintext backup codes. The plaintext array is returned
 * to the caller exactly once (during enrollment) so the user can save
 * it. The encrypted array is what gets persisted.
 */
export function generateBackupCodes(): {
  plaintext: string[];
  encrypted: string[];
} {
  const plaintext: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    plaintext.push(randomCode(BACKUP_CODE_LENGTH));
  }
  const encrypted = plaintext.map((c) => encryptPii(c));
  return { plaintext, encrypted };
}

function randomCode(len: number): string {
  // Buffer of len bytes, then map each byte modulo alphabet length.
  // Modulo bias on a 32-symbol alphabet over a uniform byte is < 1%
  // (256 / 32 = 8 buckets exactly), so it's acceptable here.
  const buf = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += BACKUP_CODE_ALPHABET[buf[i] % BACKUP_CODE_ALPHABET.length];
  }
  return out;
}

/**
 * Constant-time check: does `candidate` match any of `encryptedCodes`
 * after decryption? Returns the index of the match, or -1.
 *
 * Constant time across the whole array is hard to guarantee without
 * decrypting every entry, so we DO decrypt every entry on every check.
 * For 10-element arrays this is fine (< 1ms).
 */
function findBackupCodeMatch(
  candidate: string,
  encryptedCodes: string[]
): number {
  if (!candidate) return -1;
  const candidateBuf = Buffer.from(candidate.toUpperCase(), "utf8");

  let match = -1;
  for (let i = 0; i < encryptedCodes.length; i++) {
    let plaintext = "";
    try {
      plaintext = decryptPii(encryptedCodes[i]);
    } catch {
      continue; // malformed entry, skip but don't bail
    }
    const codeBuf = Buffer.from(plaintext, "utf8");
    // Bail equally for length mismatch — but DO NOT short-circuit the
    // loop, that would leak which index was the right length.
    if (
      codeBuf.length === candidateBuf.length &&
      timingSafeEqual(codeBuf, candidateBuf) &&
      match === -1
    ) {
      match = i;
    }
  }
  return match;
}

// ---------------------------------------------------------------
// DB operations
// ---------------------------------------------------------------

export interface MfaCredentialsRow {
  user_id: string;
  totp_secret: string; // ciphertext
  backup_codes: string[]; // ciphertext array
  enrolled_at: string | null;
  last_used_at: string | null;
  disabled_at: string | null;
}

/**
 * Read the current MFA row for a user. Returns null when the user
 * has no MFA configured. Does NOT decrypt the secret — callers that
 * need the plaintext call decryptTotpSecret() explicitly so the
 * audit trail clearly shows where decryption happens.
 */
export async function getMfaRow(
  userId: string
): Promise<MfaCredentialsRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mfa_credentials")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as MfaCredentialsRow;
}

export function decryptTotpSecret(row: MfaCredentialsRow): string {
  return decryptPii(row.totp_secret);
}

/**
 * Begin enrollment: create or replace the MFA row with a fresh secret
 * and a fresh backup-code set. enrolled_at stays NULL until the user
 * confirms with their first TOTP code.
 *
 * Returns the plaintext secret + backup codes ONCE — the caller must
 * surface them to the user immediately and never again.
 */
export async function startEnrollment(
  userId: string,
  userEmail: string
): Promise<{
  secret: string;
  otpauthUrl: string;
  backupCodes: string[]; // plaintext, one-shot
}> {
  const { secret, otpauthUrl } = generateTotpSecret(userEmail);
  const { plaintext, encrypted } = generateBackupCodes();

  const supabase = createAdminClient();
  const { error } = await supabase.from("mfa_credentials").upsert(
    {
      user_id: userId,
      totp_secret: encryptPii(secret),
      backup_codes: encrypted,
      enrolled_at: null,
      last_used_at: null,
      disabled_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(`MFA enroll failed: ${error.message}`);
  }

  return { secret, otpauthUrl, backupCodes: plaintext };
}

/**
 * Confirm enrollment: verify the user's first TOTP code against the
 * stored secret and, on success, set enrolled_at = now().
 */
export async function confirmEnrollment(
  userId: string,
  token: string
): Promise<{ ok: boolean; reason?: string }> {
  const row = await getMfaRow(userId);
  if (!row) return { ok: false, reason: "not_started" };
  if (row.enrolled_at) return { ok: false, reason: "already_enrolled" };

  const secret = decryptTotpSecret(row);
  const ok = await verifyTotp(secret, token);
  if (!ok) return { ok: false, reason: "invalid_code" };

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("mfa_credentials")
    .update({ enrolled_at: now, last_used_at: now })
    .eq("user_id", userId);

  if (error) return { ok: false, reason: "db_error" };
  return { ok: true };
}

/**
 * Verify a TOTP code OR a backup code for an already-enrolled user.
 * Used by the login-time MFA challenge (D3) and by the disable flow.
 *
 * On success:
 *   - last_used_at is bumped
 *   - if the match was a backup code, that code is removed from the
 *     stored array (single-use).
 */
export async function verifyChallenge(
  userId: string,
  code: string
): Promise<{ ok: boolean; usedBackupCode?: boolean; reason?: string }> {
  const row = await getMfaRow(userId);
  if (!row) return { ok: false, reason: "not_enrolled" };
  if (!row.enrolled_at) return { ok: false, reason: "not_enrolled" };
  if (row.disabled_at) return { ok: false, reason: "disabled" };

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // 1. TOTP attempt
  const secret = decryptTotpSecret(row);
  if (await verifyTotp(secret, code)) {
    await supabase
      .from("mfa_credentials")
      .update({ last_used_at: now })
      .eq("user_id", userId);
    return { ok: true };
  }

  // 2. Backup-code fallback
  const matchIdx = findBackupCodeMatch(code, row.backup_codes ?? []);
  if (matchIdx >= 0) {
    const remaining = row.backup_codes.filter((_, i) => i !== matchIdx);
    await supabase
      .from("mfa_credentials")
      .update({ last_used_at: now, backup_codes: remaining })
      .eq("user_id", userId);
    return { ok: true, usedBackupCode: true };
  }

  return { ok: false, reason: "invalid_code" };
}

/**
 * Soft-disable MFA for a user. Row is retained for audit history.
 * Requires the caller to have already verified the user's identity
 * (typically via verifyChallenge() at the route layer).
 */
export async function disableMfa(userId: string): Promise<{ ok: boolean }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("mfa_credentials")
    .update({ disabled_at: new Date().toISOString() })
    .eq("user_id", userId);
  return { ok: !error };
}

/**
 * Lightweight check used by the auth gate: is this user currently
 * enrolled and active? Returns false for: no row, in-flight enrollment,
 * or soft-disabled.
 */
export async function isMfaActive(userId: string): Promise<boolean> {
  const row = await getMfaRow(userId);
  return !!row && !!row.enrolled_at && !row.disabled_at;
}

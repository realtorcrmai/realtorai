import { createHash, randomUUID, randomInt, timingSafeEqual } from "crypto";

/**
 * Generate a magic link token for email verification.
 * UUID v4 = 122 bits of randomness. Stored as SHA-256 hash in DB.
 */
export function generateMagicLinkToken(): { token: string; tokenHash: string } {
  const token = randomUUID();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

/**
 * Generate a 6-digit OTP for phone verification.
 * Uses crypto.randomInt (CSPRNG), range 100000–999999 (always 6 digits).
 */
export function generateOtp(): { otp: string; otpHash: string } {
  const otp = randomInt(100000, 999999).toString();
  const otpHash = createHash("sha256").update(otp).digest("hex");
  return { otp, otpHash };
}

/**
 * Constant-time comparison of plaintext input against stored hash.
 * Prevents timing attacks on token/OTP verification.
 */
export function verifyTokenHash(input: string, storedHash: string): boolean {
  const inputHash = createHash("sha256").update(input).digest("hex");
  const a = Buffer.from(inputHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth2.
 * Implements S256 challenge method per RFC 7636.
 */

import { createHash, randomBytes } from "crypto";

/**
 * Generate a cryptographically random code verifier (43-128 chars, URL-safe).
 */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Generate a code challenge from a verifier using S256 method.
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Verify a code verifier against a stored challenge.
 * Returns true if the verifier hashes to the challenge.
 */
export function verifyCodeChallenge(
  verifier: string,
  challenge: string,
  method: string = "S256"
): boolean {
  if (method === "S256") {
    const computed = generateCodeChallenge(verifier);
    return computed === challenge;
  }
  // Plain method (not recommended, but spec-compliant)
  if (method === "plain") {
    return verifier === challenge;
  }
  return false;
}

/**
 * Generate a random authorization code (64 chars, URL-safe).
 */
export function generateAuthCode(): string {
  return randomBytes(48).toString("base64url");
}

/**
 * Generate a random state parameter for CSRF protection.
 */
export function generateState(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Generate a random refresh token.
 */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

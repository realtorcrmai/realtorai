/**
 * Simple in-memory rate limiter for login attempts.
 * Tracks failed login attempts per IP address.
 * After 5 failed attempts in 15 minutes, blocks further attempts for 15 minutes.
 */

interface RateLimitEntry {
  attempts: number;
  firstAttemptTime: number;
  blockedUntil?: number;
}

// In-memory store: IP -> RateLimitEntry
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval: remove entries older than 30 minutes
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes in ms
const MAX_ATTEMPTS = 5;
const TIME_WINDOW = 15 * 60 * 1000; // 15 minutes in ms
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes in ms

// Start periodic cleanup
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [ip, entry] of rateLimitStore.entries()) {
    // Remove if older than 30 minutes from first attempt
    if (now - entry.firstAttemptTime > CLEANUP_INTERVAL) {
      rateLimitStore.delete(ip);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[rate-limit] Cleaned up ${cleaned} expired entries`);
  }
}, CLEANUP_INTERVAL);

/**
 * Extracts client IP from request headers.
 * Checks X-Forwarded-For first (for proxies), then X-Real-IP, then falls back to 'unknown'.
 */
export function getClientIp(headers: HeadersInit | Headers | undefined): string {
  if (!headers) return "unknown";

  const headerObj = headers instanceof Headers ? headers : new Headers(headers);
  const xForwardedFor = headerObj.get("x-forwarded-for");
  if (xForwardedFor) {
    // Take the first IP if there are multiple (client IP is first in X-Forwarded-For)
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = headerObj.get("x-real-ip");
  if (xRealIp) {
    return xRealIp;
  }

  return "unknown";
}

/**
 * Records a failed login attempt for the given IP.
 * Returns true if the IP is currently rate limited, false otherwise.
 */
export function recordFailedAttempt(ip: string): boolean {
  const now = Date.now();
  let entry = rateLimitStore.get(ip);

  // Check if currently blocked
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return true; // Still blocked
  }

  // Reset if outside the time window
  if (!entry || now - entry.firstAttemptTime > TIME_WINDOW) {
    entry = {
      attempts: 1,
      firstAttemptTime: now,
    };
  } else {
    entry.attempts++;
  }

  // Check if we've exceeded max attempts
  if (entry.attempts > MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION;
    rateLimitStore.set(ip, entry);
    return true; // Now blocked
  }

  rateLimitStore.set(ip, entry);
  return false; // Not blocked
}

/**
 * Checks if an IP is currently rate limited.
 * Returns { isLimited: boolean, minutesUntilRetry?: number }
 */
export function isRateLimited(ip: string): {
  isLimited: boolean;
  minutesUntilRetry?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || !entry.blockedUntil) {
    return { isLimited: false };
  }

  if (now < entry.blockedUntil) {
    const minutesRemaining = Math.ceil((entry.blockedUntil - now) / 60000);
    return { isLimited: true, minutesUntilRetry: minutesRemaining };
  }

  // Block period expired
  rateLimitStore.delete(ip);
  return { isLimited: false };
}

/**
 * Resets rate limit for an IP (e.g., on successful login).
 */
export function resetRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

/**
 * Returns current stats (for debugging/monitoring).
 */
export function getRateLimitStats(): {
  totalIPs: number;
  blockedIPs: number;
  entriesInWindow: number;
} {
  const now = Date.now();
  let blockedIPs = 0;
  let entriesInWindow = 0;

  for (const entry of rateLimitStore.values()) {
    if (entry.blockedUntil && now < entry.blockedUntil) {
      blockedIPs++;
    }
    if (now - entry.firstAttemptTime < TIME_WINDOW) {
      entriesInWindow++;
    }
  }

  return {
    totalIPs: rateLimitStore.size,
    blockedIPs,
    entriesInWindow,
  };
}

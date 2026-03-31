// ============================================================
// Rate Limiter — in-memory sliding window for RAG endpoints
// ============================================================

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 5 * 60_000);

/**
 * Check rate limit for a user. Returns { allowed, remaining, retryAfterMs }.
 * Default: 20 requests per 60-second window.
 */
export function checkRateLimit(
  userEmail: string,
  maxRequests: number = 20,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(userEmail) ?? { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestInWindow);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.timestamps.push(now);
  store.set(userEmail, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

// ============================================================
// API Rate Limiting — per-tenant sliding window
// In-memory Map, resets on server restart.
// For production scale, replace with Redis.
// ============================================================

interface RateWindow {
  count: number;
  resetAt: number;
}

const windows = new Map<string, RateWindow>();

// Clean stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, window] of windows) {
      if (window.resetAt < now) windows.delete(key);
    }
  }, 5 * 60 * 1000);
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "voice-agent": { maxRequests: 100, windowMs: 60 * 1000 }, // 100 req/min
  "rag-chat": { maxRequests: 30, windowMs: 60 * 1000 }, // 30 req/min
  "rag-search": { maxRequests: 60, windowMs: 60 * 1000 }, // 60 req/min
  default: { maxRequests: 120, windowMs: 60 * 1000 }, // 120 req/min
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is within rate limits for a tenant + endpoint.
 */
export function checkApiRateLimit(
  tenantId: string,
  endpoint: string
): RateLimitResult {
  const config = RATE_LIMITS[endpoint] ?? RATE_LIMITS["default"];
  const key = `${tenantId}:${endpoint}`;
  const now = Date.now();

  const existing = windows.get(key);

  if (!existing || existing.resetAt < now) {
    windows.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (existing.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Create rate limit headers for the response.
 */
export function rateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
  };
}

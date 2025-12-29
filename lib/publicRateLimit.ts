// lib/publicRateLimit.ts
// Edge-compatible rate limiter for public routes
// Uses in-memory store with sliding window algorithm

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

// In-memory store - note: this resets on serverless cold starts
// but catches most abuse patterns within a single instance
const store = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  const cutoff = now - windowMs;
  
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < cutoff) {
      store.delete(key);
    }
  }
}

/**
 * Simple hash function for edge runtime (no crypto module needed)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export type PublicRateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
};

/**
 * Rate limit check for public routes.
 * 
 * Default: 100 requests per minute per IP
 * This is generous for normal use but blocks aggressive scrapers/attackers
 * 
 * @param ip - Client IP address
 * @param limit - Max requests in window (default: 100)
 * @param windowMs - Time window in ms (default: 60000 = 1 minute)
 */
export function checkPublicRateLimit(
  ip: string,
  limit: number = 100,
  windowMs: number = 60 * 1000
): PublicRateLimitResult {
  // Hash IP for privacy
  const key = `pub:${simpleHash(ip + (process.env.RATE_LIMIT_SALT || "civiportal"))}`;
  const now = Date.now();
  
  // Periodic cleanup
  cleanup(windowMs);
  
  const entry = store.get(key);
  
  // No existing entry - create one
  if (!entry || now > entry.resetTime) {
    store.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }
  
  // Entry exists and window is still active
  if (entry.count < limit) {
    entry.count++;
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetInSeconds: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
  
  // Rate limited
  return {
    allowed: false,
    remaining: 0,
    resetInSeconds: Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Check standard headers in order of reliability
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  
  // Vercel-specific
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp.split(",")[0].trim();
  }
  
  return "unknown";
}

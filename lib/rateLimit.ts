// lib/rateLimit.ts

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

// In-memory store - resets on deployment/restart
const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
};

/**
 * Simple in-memory rate limiter.
 * 
 * @param key - Unique identifier (e.g., IP address, email)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number = 60 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // If no entry or window expired, start fresh
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

  // Window still active
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
// lib/rateLimit.ts
//
// Production-ready rate limiter using sliding window algorithm.
// Falls back to in-memory if database is unavailable.

import { supabaseAdmin } from "./supabaseService";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
};

// In-memory fallback store (used when DB is unavailable)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Clean up memory store periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (now > entry.resetTime) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Check rate limit using sliding window algorithm.
 * Uses database for persistence across deployments/instances.
 * Falls back to in-memory if database is unavailable.
 *
 * REQUIRED: Create rate_limits table in Supabase:
 * 
 * CREATE TABLE IF NOT EXISTS rate_limits (
 *   id SERIAL PRIMARY KEY,
 *   key TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created ON rate_limits(key, created_at);
 *
 * @param key - Unique identifier (e.g., "export:192.168.1.1")
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 */
export async function rateLimitAsync(
  key: string,
  limit: number,
  windowMs: number = 60 * 60 * 1000
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(now - windowMs).toISOString();
  const resetInSeconds = Math.ceil(windowMs / 1000);

  try {
    // Count requests in the current window
    const { count: requestCount, error: countError } = await supabaseAdmin
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", windowStart);

    if (countError) {
      // Table might not exist yet - fall back to memory
      console.warn("Rate limit DB count error, falling back to memory:", countError.message);
      return memoryRateLimit(key, limit, windowMs);
    }

    const currentCount = requestCount ?? 0;

    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds,
      };
    }

    // Record this request
    const { error: insertError } = await supabaseAdmin
      .from("rate_limits")
      .insert({ key });

    if (insertError) {
      console.warn("Rate limit DB insert error, falling back to memory:", insertError.message);
      return memoryRateLimit(key, limit, windowMs);
    }

// Clean up old entries periodically (1% chance per request)
    if (Math.random() < 0.01) {
      void (async () => {
        try {
          await supabaseAdmin
            .from("rate_limits")
            .delete()
            .lt("created_at", windowStart);
        } catch {
          // Ignore cleanup errors
        }
      })();
    }

    return {
      allowed: true,
      remaining: limit - currentCount - 1,
      resetInSeconds,
    };
  } catch (err) {
    console.warn("Rate limit error, falling back to memory:", err);
    return memoryRateLimit(key, limit, windowMs);
  }
}

/**
 * Synchronous in-memory rate limiter (fallback).
 * Note: Resets on deployment and doesn't sync across instances.
 */
function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetTime) {
    memoryStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (entry.count < limit) {
    entry.count++;
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetInSeconds: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetInSeconds: Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Synchronous rate limiter for backwards compatibility.
 * Uses in-memory store only. For production, prefer rateLimitAsync.
 * 
 * @deprecated Use rateLimitAsync for production deployments
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number = 60 * 60 * 1000
): RateLimitResult {
  return memoryRateLimit(key, limit, windowMs);
}

// lib/rateLimitKey.ts
// Centralized rate limit key generation for server-side use
//
// Uses a hash of IP + User-Agent + salt for privacy-preserving rate limiting.

import { createHash } from "crypto";
import { RATE_LIMIT_SALT } from "@/lib/env.server";

/**
 * Generate a rate limit key from request headers.
 *
 * The key is a hash of:
 * - Client IP (from x-forwarded-for or x-real-ip)
 * - User-Agent (helps differentiate clients behind same IP)
 * - Salt (prevents rainbow table attacks on IPs)
 *
 * @param req - The incoming request
 * @param prefix - A prefix to namespace the key (e.g., "search", "export")
 * @returns A hashed key like "search:a1b2c3d4e5f6g7h8"
 *
 * @example
 * const key = rateLimitKey(req, "search");
 * const { allowed } = await rateLimitAsync(key, 60, 60_000);
 */
export function rateLimitKey(req: Request, prefix: string): string {
  // Extract IP from various headers (in order of reliability)
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const vercelIp = req.headers.get("x-vercel-forwarded-for");

  const ip =
    forwarded?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    vercelIp?.split(",")[0]?.trim() ||
    "unknown";

  // Include user-agent to differentiate clients behind same IP
  const ua = req.headers.get("user-agent") || "unknown";

  // Hash for privacy (GDPR/CCPA compliance)
  const hash = createHash("sha256")
    .update(`${prefix}:${ip}:${ua}:${RATE_LIMIT_SALT}`)
    .digest("hex")
    .slice(0, 16);

  return `${prefix}:${hash}`;
}

/**
 * Extract client IP from request (non-hashed, for logging only).
 *
 * @param req - The incoming request
 * @returns IP address string
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const vercelIp = req.headers.get("x-vercel-forwarded-for");

  return (
    forwarded?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    vercelIp?.split(",")[0]?.trim() ||
    "unknown"
  );
}

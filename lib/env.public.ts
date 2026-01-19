// lib/env.public.ts
// Public environment variables - SAFE TO IMPORT ANYWHERE (client or server)
// These are all NEXT_PUBLIC_* variables that are already exposed to the browser.

function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v.trim();
}

function optional(name: string, defaultValue?: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : defaultValue;
}

// =============================================================================
// PUBLIC VARIABLES (safe to expose, already in client bundle via NEXT_PUBLIC_)
// =============================================================================

export const NEXT_PUBLIC_SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// City slug is optional here - fallback to config/cities if not set
export const NEXT_PUBLIC_CITY_SLUG = optional("NEXT_PUBLIC_CITY_SLUG");

// =============================================================================
// BASIC VALIDATION (relaxed for local dev)
// =============================================================================

// Allow both https:// (production) and http://localhost (local Supabase dev)
const validUrlPattern = /^https?:\/\//;
if (!validUrlPattern.test(NEXT_PUBLIC_SUPABASE_URL)) {
  throw new Error(
    `NEXT_PUBLIC_SUPABASE_URL must start with http:// or https://. Got: ${NEXT_PUBLIC_SUPABASE_URL}`
  );
}

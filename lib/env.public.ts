// lib/env.public.ts
// Public environment variables - SAFE TO IMPORT ANYWHERE (client or server)
// These are all NEXT_PUBLIC_* variables that are already exposed to the browser.
//
// IMPORTANT: Next.js only includes env vars in the client bundle when they are
// referenced STATICALLY (e.g., process.env.NEXT_PUBLIC_FOO). Dynamic access
// like process.env[varName] will NOT work in the browser.

// =============================================================================
// PUBLIC VARIABLES (safe to expose, already in client bundle via NEXT_PUBLIC_)
// =============================================================================

// Static references - these MUST be literal strings for Next.js to inline them
export const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const NEXT_PUBLIC_CITY_SLUG = process.env.NEXT_PUBLIC_CITY_SLUG ?? "";

// =============================================================================
// VALIDATION (only runs at import time on server/build)
// =============================================================================

// Validate required vars on server only (client gets inlined values at build)
if (typeof window === "undefined") {
  if (!NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing required env var: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Missing required env var: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  // Allow both https:// (production) and http://localhost (local Supabase dev)
  const validUrlPattern = /^https?:\/\//;
  if (!validUrlPattern.test(NEXT_PUBLIC_SUPABASE_URL)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must start with http:// or https://. Got: " + NEXT_PUBLIC_SUPABASE_URL
    );
  }
}

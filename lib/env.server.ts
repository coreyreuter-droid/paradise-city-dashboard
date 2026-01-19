// lib/env.server.ts
// Server-only environment variables - DO NOT IMPORT IN CLIENT COMPONENTS
//
// This file contains secrets (service_role key) and must only be used in:
// - API routes (app/api/*)
// - Server components
// - Server actions

// Re-export public env for convenience (server code can import from one place)
export {
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_CITY_SLUG,
} from "./env.public";

// =============================================================================
// SERVER-ONLY GUARD
// =============================================================================
// This check runs at module load time. If someone imports this in a client
// component, it will fail immediately rather than leaking secrets.

if (typeof window !== "undefined") {
  throw new Error(
    "SECURITY ERROR: lib/env.server.ts was imported in a browser context. " +
    "This module contains secrets and must only be used server-side. " +
    "For public env vars, import from lib/env.public.ts instead."
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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
// SERVER-ONLY SECRETS
// =============================================================================

export const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");

// =============================================================================
// OPTIONAL SERVER VARIABLES
// =============================================================================

export const RATE_LIMIT_SALT = optional("RATE_LIMIT_SALT", "civiportal")!;
export const SENTRY_DSN = optional("SENTRY_DSN");

// =============================================================================
// SAFETY CHECKS
// =============================================================================

import { NEXT_PUBLIC_SUPABASE_ANON_KEY } from "./env.public";

// Prevent catastrophic misconfiguration
if (SUPABASE_SERVICE_ROLE_KEY === NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    "SECURITY ERROR: SUPABASE_SERVICE_ROLE_KEY equals NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
    "Check your environment configuration."
  );
}

// Sanity check on key length (Supabase JWTs are long)
if (SUPABASE_SERVICE_ROLE_KEY.length < 100) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY looks too short. Expected a Supabase JWT."
  );
}

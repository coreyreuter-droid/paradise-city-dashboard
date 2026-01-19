// lib/supabaseService.ts
// Service role client for admin operations (bypasses RLS)
//
// SECURITY: This module must NEVER be imported in client-side code.

import { createClient } from "@supabase/supabase-js";
import {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} from "@/lib/env.server";

// =============================================================================
// SERVICE ROLE CLIENT
// =============================================================================
// Use this client for admin operations that need to bypass Row Level Security.
// Examples: data uploads, user management, rollup refreshes.
//
// DO NOT use this for regular queries - use the anon client instead.

export const supabaseAdmin = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

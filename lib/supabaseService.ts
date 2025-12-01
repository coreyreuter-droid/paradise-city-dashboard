// lib/supabaseService.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as
  | string
  | undefined;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL for Supabase admin client"
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY for Supabase admin client"
  );
}

/**
 * Supabase client using the service role key.
 * SERVER-SIDE ONLY. Never import this into a client component.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

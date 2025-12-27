// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Supabase URL missing. Set NEXT_PUBLIC_SUPABASE_URL in your environment."
  );
}

if (!supabaseKey) {
  throw new Error(
    "Supabase anon key missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
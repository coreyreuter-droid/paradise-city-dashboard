// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Dev fallback values so local env keeps working even if .env.local
 * doesn't load correctly on Windows/Turbopack.
 *
 * These are SAFE TO EXPOSE:
 * - URL is public
 * - anon/publishable key is meant for client use
 *
 * In production, we STILL require env vars to be set correctly.
 */

const DEV_SUPABASE_URL = "https://waskgkgpkqtaegeclmww.supabase.co";
const DEV_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indhc2tna2dwa3F0YWVnZWNsbXd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMTQwNDIsImV4cCI6MjA3OTY5MDA0Mn0.knHHplCzuZHx7hCPKhG08YCNBUqNO-rmTcIwjfxmHXE";

const isProd = process.env.NODE_ENV === "production";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || (!isProd ? DEV_SUPABASE_URL : undefined);

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (!isProd ? DEV_SUPABASE_ANON_KEY : undefined);

if (!supabaseUrl) {
  throw new Error(
    "Supabase URL missing. In production, set NEXT_PUBLIC_SUPABASE_URL."
  );
}

if (!supabaseKey) {
  throw new Error(
    "Supabase anon key missing. In production, set NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

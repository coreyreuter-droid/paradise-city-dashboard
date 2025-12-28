// lib/auth.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type AuthResult = {
  user: { id: string; email?: string };
  profile: { role: string };
  supabaseAuthed: SupabaseClient;
};

export type AuthError = NextResponse;

type RequireAdminResult = 
  | { success: true; data: AuthResult }
  | { success: false; error: AuthError };

/**
 * Validates that the request has a valid admin or super_admin session.
 * Returns the user, profile, and an authenticated Supabase client.
 * 
 * Usage:
 *   const auth = await requireAdmin(req);
 *   if (!auth.success) return auth.error;
 *   const { user, profile, supabaseAuthed } = auth.data;
 */
export async function requireAdmin(req: NextRequest): Promise<RequireAdminResult> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Missing access token" },
        { status: 401 }
      ),
    };
  }

  const supabaseAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { persistSession: false },
  });

  const { data: { user }, error: userError } = await supabaseAuthed.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabaseAuthed
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Failed to load user profile" },
        { status: 500 }
      ),
    };
  }

  const role = profile.role as string;
  const isAdmin = role === "admin" || role === "super_admin";

  if (!isAdmin) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    data: {
      user: { id: user.id, email: user.email },
      profile: { role },
      supabaseAuthed,
    },
  };
}

/**
 * Same as requireAdmin, but requires super_admin role specifically.
 */
export async function requireSuperAdmin(req: NextRequest): Promise<RequireAdminResult> {
  const result = await requireAdmin(req);
  
  if (!result.success) return result;
  
  if (result.data.profile.role !== "super_admin") {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Super admin privileges required" },
        { status: 403 }
      ),
    };
  }
  
  return result;
}
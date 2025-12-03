// app/api/admin/users/invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseService";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 401 }
      );
    }

    const supabaseAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuthed.auth.getUser();

    if (!user || userError) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // 1) Check caller's role
    const { data: profile } = await supabaseAuthed
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role as string | null;
    const isSuperAdmin = role === "super_admin";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Super admin privileges required" },
        { status: 403 }
      );
    }

    // 2) Parse input
    const body = await req.json();
    const email = (body.email as string | undefined)?.trim();
    const desiredRole = body.role as "admin" | "viewer";

    if (!email || !desiredRole) {
      return NextResponse.json(
        { error: "Missing email or role" },
        { status: 400 }
      );
    }

    // 3) Send Supabase invite
    const {
      data: inviteData,
      error: inviteError,
    } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteError || !inviteData?.user?.id) {
      console.error("Invite error:", inviteError);
      return NextResponse.json(
        { error: "Failed to send invite" },
        { status: 500 }
      );
    }

    const newUser = inviteData.user;
    const newUserId = newUser.id;

    // 4) Upsert into profiles
    const { error: upsertError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUserId,
        role: desiredRole,
      });

    if (upsertError) {
      console.error("Profile upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to assign role" },
        { status: 500 }
      );
    }

    // Return minimal user shape for UI
    return NextResponse.json({
      user: {
        id: newUserId,
        email: newUser.email ?? email,
        role: desiredRole,
        createdAt: newUser.created_at ?? null,
        lastSignInAt: newUser.last_sign_in_at ?? null,
      },
    });
  } catch (err: any) {
    console.error("Invite user error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected server error" },
      { status: 500 }
    );
  }
}

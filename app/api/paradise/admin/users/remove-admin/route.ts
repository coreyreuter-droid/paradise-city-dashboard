// app/api/paradise/admin/users/remove-admin/route.ts
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
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }

    const supabaseAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const {
      data: { user: caller },
      error: userError,
    } = await supabaseAuthed.auth.getUser();

    if (userError || !caller) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    // 1) Check caller's role
    const { data: profile } = await supabaseAuthed
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    const callerRole = profile?.role;
    const isSuperAdmin = callerRole === "super_admin";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Super admin privileges required" },
        { status: 403 }
      );
    }

    // 2) Parse input
    const body = await req.json();
    const userId = body.userId as string | undefined;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    // 3) Don’t let yourself remove your own admin status
    if (caller.id === userId) {
      return NextResponse.json(
        { error: "You cannot remove admin access from yourself" },
        { status: 400 }
      );
    }

    // 4) Demote target user to viewer
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "viewer" })
      .eq("id", userId);

    if (updateError) {
      console.error("remove-admin update error:", updateError);
      return NextResponse.json(
        { error: "Failed to remove admin access" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("remove-admin error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected server error" },
      { status: 500 }
    );
  }
}

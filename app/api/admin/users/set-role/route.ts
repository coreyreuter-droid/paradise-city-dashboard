// app/api/admin/users/set-role/route.ts
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
      data: { user: caller },
      error: userError,
    } = await supabaseAuthed.auth.getUser();

    if (userError || !caller) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // 1) Check caller's role
    const { data: profile } = await supabaseAuthed
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    const callerRole = profile?.role as string | null;
    const isSuperAdmin = callerRole === "super_admin";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Super admin privileges required" },
        { status: 403 }
      );
    }

    // 2) Parse body
    const body = await req.json();
    const userId = body.userId as string | undefined;
    const newRole = body.role as "super_admin" | "admin" | "viewer" | null;

    if (!userId || newRole === undefined) {
      return NextResponse.json(
        { error: "Invalid userId or role" },
        { status: 400 }
      );
    }

    // 3) Prevent a super_admin from demoting themselves
    if (caller.id === userId && newRole !== "super_admin") {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // 4) Prevent removing the last super_admin
    const { data: superAdmins } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "super_admin");

    const isLastSuperAdmin =
      superAdmins &&
      superAdmins.length === 1 &&
      superAdmins[0].id === userId;

    if (isLastSuperAdmin && newRole !== "super_admin") {
      return NextResponse.json(
        { error: "Cannot remove the last super admin" },
        { status: 400 }
      );
    }

    // 5) Apply role change
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (updateError) {
      console.error("Role update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Set role error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected server error" },
      { status: 500 }
    );
  }
}

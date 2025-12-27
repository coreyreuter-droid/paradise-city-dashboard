// app/api/admin/users/set-role/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseService";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase URL or anon key env vars");
}

// Valid roles that can be assigned
const VALID_ROLES = ["viewer", "admin", "super_admin"] as const;
type Role = (typeof VALID_ROLES)[number];

export async function POST(req: NextRequest) {
  try {
    // 1) Extract and validate the access token
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 401 }
      );
    }

    // 2) Parse request body - accept either "role" or "newRole" field
    const body = await req.json();
    const { userId, newRole, role } = body as { userId?: string; newRole?: string; role?: string };
    const effectiveRole = newRole ?? role;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid userId" },
        { status: 400 }
      );
    }

    if (!effectiveRole || !VALID_ROLES.includes(effectiveRole as Role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // 3) Create authed client using caller's access token
    const supabaseAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    // 4) Get the current user (caller)
    const {
      data: { user },
      error: userError,
    } = await supabaseAuthed.auth.getUser();

    if (userError || !user) {
      console.error("set-role: getUser error", userError);
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // 5) Verify caller is super_admin (only super_admins can change roles)
    const { data: callerProfile, error: callerProfileError } =
      await supabaseAuthed.from("profiles").select("role").eq("id", user.id).single();

    if (callerProfileError) {
      console.error("set-role: caller profile error", callerProfileError);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      );
    }

    const callerRole = callerProfile?.role as string | null;

    if (callerRole !== "super_admin") {
      return NextResponse.json(
        { error: "Only super_admin can change user roles" },
        { status: 403 }
      );
    }

    // 6) Prevent super_admin from demoting themselves
    if (userId === user.id && effectiveRole !== "super_admin") {
      return NextResponse.json(
        { error: "You cannot demote yourself. Ask another super_admin to change your role." },
        { status: 400 }
      );
    }

    // 7) If demoting a super_admin, ensure at least one super_admin remains
    if (effectiveRole !== "super_admin") {
      // Check target user's current role
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (targetProfile?.role === "super_admin") {
        // Count how many super_admins exist
        const { count, error: countError } = await supabaseAdmin
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "super_admin");

        if (countError) {
          console.error("set-role: count error", countError);
          return NextResponse.json(
            { error: "Failed to verify admin count" },
            { status: 500 }
          );
        }

        if ((count ?? 0) <= 1) {
          return NextResponse.json(
            { error: "Cannot demote the last super_admin. Promote another user first." },
            { status: 400 }
          );
        }
      }
    }

    // 8) Update the user's role using service-role client (bypass RLS)
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: effectiveRole })
      .eq("id", userId);

    if (updateError) {
      console.error("set-role: update error", updateError);
      return NextResponse.json(
        { error: "Failed to update role" },
        { status: 500 }
      );
    }

    // 9) Log the action for audit purposes
    try {
      await supabaseAdmin.from("admin_audit_log").insert({
        admin_id: user.id,
        action: "set_role",
        target_user_id: userId,
        details: { newRole: effectiveRole },
      });
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error("set-role: audit log error", auditError);
    }

    return NextResponse.json({ success: true, userId, newRole: effectiveRole });
  } catch (err: unknown) {
    console.error("set-role route error:", err);
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
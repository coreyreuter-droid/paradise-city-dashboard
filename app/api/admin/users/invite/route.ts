// app/api/admin/users/invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";
import { requireSuperAdmin } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  try {
    // Verify CSRF token
    const csrfError = await requireCsrf(req);
    if (csrfError) return csrfError;

    // Authenticate and verify super_admin role
    const auth = await requireSuperAdmin(req);
    if (!auth.success) return auth.error;

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

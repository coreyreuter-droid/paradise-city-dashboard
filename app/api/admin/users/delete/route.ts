// app/api/admin/users/delete/route.ts
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
    const { user: caller } = auth.data;

    const body = await req.json();
    const userId = body.userId as string | undefined;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    // Don't let super_admin delete themselves
    if (caller.id === userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Delete profile row first (ok if it doesn't exist)
    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      console.error(
        "delete user: profile delete error",
        profileDeleteError
      );
      // don't early-return; auth deletion is still important
    }

    // Delete Supabase Auth user using service role
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("delete user: auth delete error", deleteError);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("delete user: unexpected error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}

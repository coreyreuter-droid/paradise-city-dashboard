// app/api/admin/users/remove-admin/route.ts
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
  } catch (err: unknown) {
    console.error("remove-admin error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}

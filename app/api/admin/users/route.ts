// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";
import { requireAdmin } from "@/lib/auth";

type ProfileRow = {
  id: string;
  role: string | null;
  created_at: string | null;
};

export async function GET(req: NextRequest) {
  try {
// Authenticate and verify admin role
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;
    const { profile } = auth.data;
    const role = profile.role;

    // 3) Load profiles with service-role (bypass RLS)
    const {
      data: profiles,
      error: profilesError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, role, created_at");

    if (profilesError) {
      console.error("Admin users: profilesError", profilesError);
      return NextResponse.json(
        { error: "Failed to load profiles" },
        { status: 500 }
      );
    }

    const profileMap = new Map<string, ProfileRow>();

    for (const p of profiles ?? []) {
      profileMap.set(p.id, {
        id: p.id,
        role: p.role ?? null,
        created_at: p.created_at ?? null,
      });
    }

    // 4) List auth users with service-role
    const { data: usersData, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      });

    if (usersError) {
      console.error("Admin users: listUsers error", usersError);
      return NextResponse.json(
        { error: "Failed to load auth users" },
        { status: 500 }
      );
    }

    const users =
      usersData?.users?.map((u) => {
        const p = profileMap.get(u.id);

        return {
          id: u.id,
          email: u.email ?? null,
          role: p?.role ?? null,
          createdAt: u.created_at ?? null,
          lastSignInAt: u.last_sign_in_at ?? null,
        };
      }) ?? [];

    users.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));

    // Include the caller's role so the UI can know if they're super_admin
    return NextResponse.json({ users, currentRole: role });
  } catch (err: unknown) {
    console.error("Admin users route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}

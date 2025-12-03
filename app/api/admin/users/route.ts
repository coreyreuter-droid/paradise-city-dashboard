// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseService";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase URL or anon key env vars");
}

type ProfileRow = {
  id: string;
  role: string | null;
  created_at: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 401 }
      );
    }

    // 1) Authed client using caller's access token
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

    const {
      data: { user },
      error: userError,
    } = await supabaseAuthed.auth.getUser();

    if (userError || !user) {
      console.error("Admin users: getUser error", userError);
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // 2) Validate admin/super_admin role via RLS-protected profiles
    const { data: profile, error: profileError } = await supabaseAuthed
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Admin users: profile error", profileError);
    }

    const role = profile?.role as string | null;
    const isAdmin = role === "admin" || role === "super_admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

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
  } catch (err: any) {
    console.error("Admin users route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected server error" },
      { status: 500 }
    );
  }
}

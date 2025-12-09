// app/api/admin/delete-year/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseService";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase URL or anon key env vars");
}

// Keep this in sync with your upload tables
const ALLOWED_TABLES = [
  "budgets",
  "actuals",
  "transactions",
  "revenues",
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

type DeletePayload = {
  table: AllowedTable;
  fiscalYear: number;
};

export async function POST(req: NextRequest) {
  try {
    // 1) Auth the caller using the same pattern as upload
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization bearer token" },
        { status: 401 }
      );
    }

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
      console.error("Admin delete-year: getUser error", userError);
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // 2) Check admin role
    const { data: profile, error: profileError } = await supabaseAuthed
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Admin delete-year: profile error", profileError);
    }

    const allowedRoles = ["admin", "super_admin"] as const;
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    // 3) Validate payload
    const body = (await req.json()) as Partial<DeletePayload>;

    if (!body.table || !ALLOWED_TABLES.includes(body.table)) {
      return NextResponse.json(
        { error: "Invalid or missing table name" },
        { status: 400 }
      );
    }

    const fiscalYear = Number(body.fiscalYear);
    if (!Number.isFinite(fiscalYear) || fiscalYear <= 0) {
      return NextResponse.json(
        { error: "Valid fiscalYear is required" },
        { status: 400 }
      );
    }

    const table = body.table;

    // 4) Delete using supabaseAdmin (bypass RLS)
    // We want to know how many rows we deleted, so we select count first.
    const { count, error: countError } = await supabaseAdmin
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("fiscal_year", fiscalYear);

    if (countError) {
      console.error("Admin delete-year: count error", {
        table,
        fiscalYear,
        error: countError,
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("fiscal_year", fiscalYear);

    if (deleteError) {
      console.error("Admin delete-year: delete error", {
        table,
        fiscalYear,
        error: deleteError,
      });
      return NextResponse.json(
        { error: "Failed to delete data for that fiscal year" },
        { status: 500 }
      );
    }

    // 5) Audit log (optional but strongly recommended)
    const adminIdentifier = user.email ?? user.id;

    try {
      await supabaseAdmin.from("data_uploads").insert({
        table_name: table,
        mode: "replace_year", // reuse mode enum; we can treat delete as a special kind of replace
        row_count: -(count ?? 0), // negative to indicate deletion
        fiscal_year: fiscalYear,
        filename: null,
        admin_identifier: adminIdentifier,
      });
    } catch (auditError) {
      console.error("Admin delete-year: audit log error", auditError);
    }

    return NextResponse.json({
      ok: true,
      message: `Deleted fiscal year ${fiscalYear} from "${table}" (${count ?? 0} row(s)).`,
    });
  } catch (err: any) {
    console.error("Admin delete-year route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected server error" },
      { status: 500 }
    );
  }
}

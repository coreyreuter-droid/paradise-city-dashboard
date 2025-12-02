// app/api/paradise/admin/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseService";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase URL or anon key env vars");
}

type Mode = "append" | "replace_year" | "replace_table";

type UploadPayload = {
  table: "budgets" | "actuals" | "transactions";
  mode: Mode;
  replaceYear?: number | null;
  records: Record<string, any>[];
  filename?: string;
  yearsInData?: number[];
};

export async function POST(req: NextRequest) {
  try {
    // 1) Authenticate caller
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

    // This client uses the caller's JWT and RLS to see only their own data
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
      console.error("Admin upload: getUser error", userError);
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // 2) Check admin role using the authed client + RLS
    const { data: profile, error: profileError } = await supabaseAuthed
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Admin upload: profile error", profileError);
    }

    const allowedRoles = ["admin", "super_admin"] as const;

    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    // 3) Validate payload
    const body = (await req.json()) as UploadPayload;

    if (!body.table || !["budgets", "actuals", "transactions"].includes(body.table)) {
      return NextResponse.json(
        { error: "Invalid or missing table name" },
        { status: 400 }
      );
    }

    if (
      !body.mode ||
      !["append", "replace_year", "replace_table"].includes(body.mode)
    ) {
      return NextResponse.json(
        { error: "Invalid upload mode" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.records) || body.records.length === 0) {
      return NextResponse.json(
        { error: "No records provided for upload" },
        { status: 400 }
      );
    }

    const table = body.table;
    const mode = body.mode;
    const replaceYear =
      typeof body.replaceYear === "number" ? body.replaceYear : null;
    const yearsInData = Array.isArray(body.yearsInData)
      ? body.yearsInData
      : [];

    // 4) Perform delete (if needed) using service-role client (bypasses RLS)
    if (mode === "replace_year") {
      if (!replaceYear) {
        return NextResponse.json(
          { error: "replaceYear is required for replace_year mode" },
          { status: 400 }
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("fiscal_year", replaceYear);

      if (deleteError) {
        console.error("Admin upload delete (year) error:", deleteError);
        return NextResponse.json(
          { error: "Failed to clear existing data for that fiscal year" },
          { status: 500 }
        );
      }
    } else if (mode === "replace_table") {
      const { error: deleteError } = await supabaseAdmin
        .from(table)
        .delete()
        .gte("fiscal_year", 0);

      if (deleteError) {
        console.error("Admin upload delete (table) error:", deleteError);
        return NextResponse.json(
          { error: "Failed to clear existing data for this table" },
          { status: 500 }
        );
      }
    }

    // 5) Insert new records using service role
    const { error: insertError } = await supabaseAdmin
      .from(table)
      .insert(body.records);

    if (insertError) {
      console.error("Admin upload insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to insert uploaded data" },
        { status: 500 }
      );
    }

    // 6) Audit log
    const fiscalYearForAudit =
      mode === "replace_year"
        ? replaceYear
        : yearsInData.length === 1
        ? yearsInData[0]
        : null;

    const adminIdentifier = user.email ?? user.id;

    const { error: auditError } = await supabaseAdmin
      .from("data_uploads")
      .insert({
        table_name: table,
        mode,
        row_count: body.records.length,
        fiscal_year: fiscalYearForAudit,
        filename: body.filename ?? null,
        admin_identifier: adminIdentifier,
      });

    if (auditError) {
      console.error("Admin upload audit log error:", auditError);
      // non-fatal
    }

    let action: string;
    if (mode === "append") {
      action = "appended";
    } else if (mode === "replace_year") {
      action = `replaced fiscal year ${replaceYear}`;
    } else {
      action = "replaced all rows in";
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully ${action} "${table}" with ${body.records.length} record(s).`,
    });
  } catch (err: any) {
    console.error("Admin upload route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected server error" },
      { status: 500 }
    );
  }
}

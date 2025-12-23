// app/api/admin/delete-fiscal-year/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";

const ALLOWED_TABLES = new Set(["budgets", "actuals", "transactions", "revenues"]);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Missing Bearer token." }, { status: 401 });
    }

    // Verify user + role (admin or super_admin)
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const userId = userData.user.id;

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json({ error: "Failed to verify admin role." }, { status: 403 });
    }

    const role = profile?.role as string | null;
    const isAdmin = role === "admin" || role === "super_admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const table = String(body?.table ?? "");
    const fiscalYear = Number(body?.fiscalYear);

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: "Invalid table." }, { status: 400 });
    }
    if (!Number.isFinite(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2100) {
      return NextResponse.json({ error: "Invalid fiscalYear." }, { status: 400 });
    }

    const { error: delErr, count } = await supabaseAdmin
      .from(table)
      .delete({ count: "exact" })
      .eq("fiscal_year", fiscalYear);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    // Keep rollups in sync so the citizen portal stops showing deleted FYs.
    if (table === "budgets" || table === "actuals") {
      const { error: rollupErr } = await supabaseAdmin.rpc(
        "refresh_budget_actuals_rollup_for_year",
        { _fy: fiscalYear }
      );
      if (rollupErr) {
        return NextResponse.json(
          { error: `Deleted FY${fiscalYear} from ${table}, but failed to refresh budget/actual rollups: ${rollupErr.message}` },
          { status: 500 }
        );
      }
    }

    if (table === "transactions") {
      const { error: txRollupErr } = await supabaseAdmin.rpc(
        "refresh_transaction_rollups_for_year",
        { _fy: fiscalYear }
      );
      if (txRollupErr) {
        return NextResponse.json(
          { error: `Deleted FY${fiscalYear} from ${table}, but failed to refresh transaction rollups: ${txRollupErr.message}` },
          { status: 500 }
        );
      }
    }

        // Keep rollups in sync so the portal stops showing deleted FYs.
    // Only applies to budget/actual rollup sources.
    if (table === "budgets" || table === "actuals") {
      const { error: rollupErr } = await supabaseAdmin.rpc(
        "refresh_budget_actuals_year_department_for_year",
        { _fy: fiscalYear }
      );

      if (rollupErr) {
        return NextResponse.json(
          { error: `Deleted FY${fiscalYear} from ${table}, but failed to refresh rollups: ${rollupErr.message}` },
          { status: 500 }
        );
      }
    }


    return NextResponse.json({
      message: `Deleted FY${fiscalYear} from ${table}. Rows deleted: ${count ?? 0}.`,
      deleted: count ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}

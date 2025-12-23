// app/api/admin/delete-fiscal-year/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";

const ALLOWED_TABLES = new Set(["budgets", "actuals", "transactions", "revenues"]);

async function safeDeleteSummaryYear(summaryTable: string, fiscalYear: number) {
  // If this is a VIEW, delete will fail — that's OK, views update automatically.
  const { error } = await supabaseAdmin
    .from(summaryTable)
    .delete()
    .eq("fiscal_year", fiscalYear);

  if (error) {
    console.warn(
      `Non-fatal: could not delete FY${fiscalYear} from ${summaryTable}: ${error.message}`
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Missing Bearer token." }, { status: 401 });
    }

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

    const role = (profile?.role ?? "") as string;
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const body = (await req.json()) as { table?: string; fiscalYear?: number };
    const table = body.table;
    const fiscalYear = body.fiscalYear;

    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: "Invalid table." }, { status: 400 });
    }
    if (!fiscalYear || !Number.isFinite(fiscalYear)) {
      return NextResponse.json({ error: "Invalid fiscal year." }, { status: 400 });
    }

    // 1) Delete base rows
    const { error: delErr, count } = await supabaseAdmin
      .from(table)
      .delete({ count: "exact" })
      .eq("fiscal_year", fiscalYear);

    if (delErr) {
      return NextResponse.json(
        { error: `Failed to delete FY${fiscalYear} from ${table}: ${delErr.message}` },
        { status: 500 }
      );
    }

    // 2) Clear summary tables (this is what the dropdowns read)
    if (table === "budgets" || table === "actuals") {
      await safeDeleteSummaryYear("budget_actuals_year_totals", fiscalYear);
      await safeDeleteSummaryYear("budget_actuals_year_department", fiscalYear);

      // Recompute summaries so if the OTHER dataset still exists (budgets vs actuals),
      // the rollups get re-created correctly.
      const { error: e1 } = await supabaseAdmin.rpc(
        "recompute_budget_actuals_summaries_for_year",
        { p_year: fiscalYear }
      );
      if (e1) {
        return NextResponse.json(
          {
            error: `Deleted FY${fiscalYear} from ${table}, but failed to recompute budget/actual summaries: ${e1.message}`,
          },
          { status: 500 }
        );
      }

      // Optional refresh (non-fatal)
      const { error: e2 } = await supabaseAdmin.rpc("refresh_budget_actuals_rollup_for_year", {
        _fy: fiscalYear,
      });
      if (e2) {
        console.warn(
          `Non-fatal: refresh_budget_actuals_rollup_for_year failed for FY${fiscalYear}: ${e2.message}`
        );
      }
    }

    if (table === "transactions") {
      await safeDeleteSummaryYear("transaction_year_totals", fiscalYear);
      await safeDeleteSummaryYear("transaction_year_department", fiscalYear);
      await safeDeleteSummaryYear("transaction_year_vendor", fiscalYear);

      const { error: e1 } = await supabaseAdmin.rpc(
        "recompute_transaction_summaries_for_year",
        { p_year: fiscalYear }
      );
      if (e1) {
        return NextResponse.json(
          {
            error: `Deleted FY${fiscalYear} from ${table}, but failed to recompute transaction summaries: ${e1.message}`,
          },
          { status: 500 }
        );
      }

      const { error: e2 } = await supabaseAdmin.rpc("refresh_transaction_rollups_for_year", {
        _fy: fiscalYear,
      });
      if (e2) {
        console.warn(
          `Non-fatal: refresh_transaction_rollups_for_year failed for FY${fiscalYear}: ${e2.message}`
        );
      }
    }

    if (table === "revenues") {
      await safeDeleteSummaryYear("revenue_year_totals", fiscalYear);
      // If revenue_year_totals is a view, it's already correct after base delete.
    }

    return NextResponse.json({
      message: `Deleted FY${fiscalYear} from ${table}. Rows deleted: ${count ?? 0}.`,
      deleted: count ?? 0,
    });
  } catch (err: any) {
    console.error("delete-fiscal-year route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error." },
      { status: 500 }
    );
  }
}

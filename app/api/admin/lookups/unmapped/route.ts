/**
 * Unmapped Codes API
 * 
 * GET /api/admin/lookups/unmapped
 * 
 * Returns fund and department codes that exist in data tables
 * but don't have corresponding entries in lookup tables.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    // Get all distinct fund codes from data tables
    const [budgetFunds, actualsFunds, transactionsFunds, revenuesFunds] = await Promise.all([
      supabaseAdmin.from("budgets").select("fund_code").not("fund_code", "is", null),
      supabaseAdmin.from("actuals").select("fund_code").not("fund_code", "is", null),
      supabaseAdmin.from("transactions").select("fund_code").not("fund_code", "is", null),
      supabaseAdmin.from("revenues").select("fund_code").not("fund_code", "is", null),
    ]);

    // Combine all fund codes
    const allFundCodes = new Set<string>();
    for (const result of [budgetFunds, actualsFunds, transactionsFunds, revenuesFunds]) {
      if (result.data) {
        for (const row of result.data) {
          if (row.fund_code) {
            allFundCodes.add(String(row.fund_code).trim());
          }
        }
      }
    }

    // Get all distinct department codes from data tables
    const [budgetDepts, actualsDepts, transactionsDepts, revenuesDepts] = await Promise.all([
      supabaseAdmin.from("budgets").select("department_code").not("department_code", "is", null),
      supabaseAdmin.from("actuals").select("department_code").not("department_code", "is", null),
      supabaseAdmin.from("transactions").select("department_code").not("department_code", "is", null),
      supabaseAdmin.from("revenues").select("department_code").not("department_code", "is", null),
    ]);

    // Combine all department codes
    const allDeptCodes = new Set<string>();
    for (const result of [budgetDepts, actualsDepts, transactionsDepts, revenuesDepts]) {
      if (result.data) {
        for (const row of result.data) {
          if (row.department_code) {
            allDeptCodes.add(String(row.department_code).trim());
          }
        }
      }
    }

    // Get all fund codes that have lookup entries (current entries only)
    const { data: fundLookups } = await supabaseAdmin
      .from("funds_dim")
      .select("code")
      .is("effective_end_fy", null); // Current entries only

    const mappedFundCodes = new Set<string>();
    if (fundLookups) {
      for (const row of fundLookups) {
        if (row.code) {
          mappedFundCodes.add(String(row.code).trim());
        }
      }
    }

    // Get all department codes that have lookup entries (current entries only)
    const { data: deptLookups } = await supabaseAdmin
      .from("departments_dim")
      .select("code")
      .is("effective_end_fy", null); // Current entries only

    const mappedDeptCodes = new Set<string>();
    if (deptLookups) {
      for (const row of deptLookups) {
        if (row.code) {
          mappedDeptCodes.add(String(row.code).trim());
        }
      }
    }

    // Find unmapped codes
    const unmappedFunds: string[] = [];
    for (const code of allFundCodes) {
      if (!mappedFundCodes.has(code)) {
        unmappedFunds.push(code);
      }
    }

    const unmappedDepartments: string[] = [];
    for (const code of allDeptCodes) {
      if (!mappedDeptCodes.has(code)) {
        unmappedDepartments.push(code);
      }
    }

    // Sort for consistent display
    unmappedFunds.sort();
    unmappedDepartments.sort();

    return NextResponse.json({
      unmapped_funds: unmappedFunds,
      unmapped_departments: unmappedDepartments,
      has_unmapped: unmappedFunds.length > 0 || unmappedDepartments.length > 0,
    });
  } catch (err) {
    console.error("Unmapped codes error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}

// lib/queries.ts
//
// Single source of truth for Supabase reads.
// Summary tables are preferred for performance on large datasets.

import { supabase } from "./supabase";
import type { ActualRow, BudgetRow, TransactionRow, RevenueRow } from "./schema";

const PAGE_SIZE = 1000;

/* =========================
   Portal settings
========================= */

export type PortalSettings = {
  id: number;
  city_name: string;
  tagline: string | null;
  primary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  logo_url: string | null;
  hero_message: string | null;
  hero_image_url: string | null;
  seal_url: string | null;

  story_city_description: string | null;
  story_year_achievements: string | null;
  story_capital_projects: string | null;

  leader_name: string | null;
  leader_title: string | null;
  leader_message: string | null;
  leader_photo_url: string | null;

  project1_title: string | null;
  project1_summary: string | null;
  project2_title: string | null;
  project2_summary: string | null;
  project3_title: string | null;
  project3_summary: string | null;
  project1_image_url: string | null;
  project2_image_url: string | null;
  project3_image_url: string | null;

  enable_budget: boolean | null;
  enable_actuals: boolean | null;
  enable_transactions: boolean | null;
  enable_vendors: boolean | null;
  enable_revenues: boolean | null;

  is_published: boolean | null;

  fiscal_year_label: string | null;
  fiscal_year_start_month: number | null;
  fiscal_year_start_day: number | null;
};

export async function getPortalSettings(): Promise<PortalSettings | null> {
  const { data, error } = await supabase
    .from("portal_settings")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Error fetching portal settings", error);
    return null;
  }

  return (data ?? null) as PortalSettings | null;
}

/* =========================
   Fiscal years (canonical)
========================= */

export async function getPortalFiscalYears(): Promise<number[]> {
  const [budgetYears, txYears, revenueYears] = await Promise.all([
    supabase.from("budget_actuals_year_department").select("fiscal_year"),
    supabase.from("transaction_year_department").select("fiscal_year"),
    supabase.from("revenues").select("fiscal_year"),
  ]);

  const years = new Set<number>();

  if (!budgetYears.error) (budgetYears.data ?? []).forEach((r: any) => years.add(Number(r.fiscal_year)));
  if (!txYears.error) (txYears.data ?? []).forEach((r: any) => years.add(Number(r.fiscal_year)));
  if (!revenueYears.error) (revenueYears.data ?? []).forEach((r: any) => years.add(Number(r.fiscal_year)));

  return Array.from(years)
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);
}

/* =========================
   Summary tables
========================= */

export type VendorYearSummary = {
  fiscal_year: number;
  vendor: string;
  total_amount: number;
  txn_count: number;
};

export async function getVendorSummariesForYear(
  fiscalYear: number,
  opts?: { limit?: number; search?: string | null }
): Promise<VendorYearSummary[]> {
  const limit = opts?.limit ?? 500;
  const search = opts?.search ?? null;

  let q: any = supabase
    .from("transaction_year_vendor")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .order("total_amount", { ascending: false })
    .limit(limit);

  if (search && search.trim()) {
    q = q.ilike("vendor", `%${search.trim()}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error("Error fetching vendor summaries", error);
    return [];
  }
  return (data ?? []) as VendorYearSummary[];
}

export type DepartmentYearTxSummary = {
  fiscal_year: number;
  department_name: string;
  txn_count: number;
  total_amount: number;
};

export async function getDepartmentTransactionSummariesForYear(
  fiscalYear: number
): Promise<DepartmentYearTxSummary[]> {
  const { data, error } = await supabase
    .from("transaction_year_department")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .order("total_amount", { ascending: false });

  if (error) {
    console.error("Error fetching department tx summaries", error);
    return [];
  }
  return (data ?? []) as DepartmentYearTxSummary[];
}

export type BudgetActualsYearDeptRow = {
  fiscal_year: number;
  department_name: string;
  budget_amount: number;
  actual_amount: number;
};

export async function getBudgetActualsSummaryForYear(
  fiscalYear: number
): Promise<BudgetActualsYearDeptRow[]> {
  const { data, error } = await supabase
    .from("budget_actuals_year_department")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .order("budget_amount", { ascending: false });

  if (error) {
    console.error("getBudgetActualsSummaryForYear error:", error);
    return [];
  }

  return (data ?? []) as BudgetActualsYearDeptRow[];
}

export async function getBudgetActualsSummaryForDepartment(
  departmentName: string
): Promise<BudgetActualsYearDeptRow[]> {
  const name = (departmentName ?? "").trim();
  if (!name) return [];

  const { data, error } = await supabase
    .from("budget_actuals_year_department")
    .select("*")
    .eq("department_name", name)
    .order("fiscal_year", { ascending: true });

  if (error) {
    console.error("getBudgetActualsSummaryForDepartment error:", error);
    return [];
  }

  return (data ?? []) as BudgetActualsYearDeptRow[];
}

export async function getBudgetActualsSummaryAllYears(): Promise<BudgetActualsYearDeptRow[]> {
  const { data, error } = await supabase
    .from("budget_actuals_year_department")
    .select("*")
    .order("fiscal_year", { ascending: false });

  if (error) {
    console.error("getBudgetActualsSummaryAllYears error:", error);
    return [];
  }

  return (data ?? []) as BudgetActualsYearDeptRow[];
}

export async function getBudgetActualsYearTotals(): Promise<
  Array<{ year: number; Budget: number; Actuals: number; Variance: number }>
> {
  const { data, error } = await supabase
    .from("budget_actuals_year_totals")
    .select("*")
    .order("fiscal_year", { ascending: true });

  if (error) {
    console.error("getBudgetActualsYearTotals error:", error);
    return [];
  }

  const rows = (data ?? []) as any[];
  return rows.map((r) => {
    const budget = Number(r.budget_total ?? 0);
    const actual = Number(r.actual_total ?? 0);
    return {
      year: Number(r.fiscal_year),
      Budget: budget,
      Actuals: actual,
      Variance: actual - budget,
    };
  });
}

/* =========================
   Revenues
========================= */

export async function getRevenuesForYear(fiscalYear: number): Promise<RevenueRow[]> {
  return fetchAllRows<RevenueRow>("revenues", (q) => q.eq("fiscal_year", fiscalYear));
}

/* =========================
   Raw data helpers
========================= */

async function fetchAllRows<T>(table: string, buildQuery?: (q: any) => any): Promise<T[]> {
  const all: T[] = [];
  let page = 0;

  while (true) {
    let query: any = supabase.from(table).select("*");
    if (buildQuery) query = buildQuery(query);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await query.range(from, to);
    if (error) {
      console.error(`fetchAllRows error for "${table}":`, error);
      return [];
    }

    const chunk = (data ?? []) as T[];
    all.push(...chunk);

    if (chunk.length < PAGE_SIZE) break;
    page += 1;
  }

  return all;
}

export async function getAllBudgets(): Promise<BudgetRow[]> {
  return fetchAllRows<BudgetRow>("budgets");
}
export async function getAllActuals(): Promise<ActualRow[]> {
  return fetchAllRows<ActualRow>("actuals");
}
export async function getAllTransactions(): Promise<TransactionRow[]> {
  return fetchAllRows<TransactionRow>("transactions");
}
export async function getAllRevenues(): Promise<RevenueRow[]> {
  return fetchAllRows<RevenueRow>("revenues");
}

export async function getAvailableFiscalYears(): Promise<number[]> {
  const { data, error } = await supabase.from("budgets").select("fiscal_year");
  if (error) {
    console.error("getAvailableFiscalYears error:", error);
    return [];
  }
  const years = new Set<number>();
  (data ?? []).forEach((r: any) => years.add(Number(r.fiscal_year)));
  return Array.from(years).filter((y) => Number.isFinite(y)).sort((a, b) => b - a);
}

/**
 * Backwards-compatible: distinct fiscal years across budgets/actuals/transactions.
 * Used by /transactions and other filters.
 */
export async function getTransactionYears(): Promise<number[]> {
  const [budgetsRes, actualsRes, txRes] = await Promise.all([
    supabase.from("budgets").select("fiscal_year"),
    supabase.from("actuals").select("fiscal_year"),
    supabase.from("transactions").select("fiscal_year"),
  ]);

  if (budgetsRes.error) console.error("getTransactionYears budgets error:", budgetsRes.error);
  if (actualsRes.error) console.error("getTransactionYears actuals error:", actualsRes.error);
  if (txRes.error) console.error("getTransactionYears tx error:", txRes.error);

  const years = new Set<number>();
  (budgetsRes.data ?? []).forEach((r: any) => years.add(Number(r.fiscal_year)));
  (actualsRes.data ?? []).forEach((r: any) => years.add(Number(r.fiscal_year)));
  (txRes.data ?? []).forEach((r: any) => years.add(Number(r.fiscal_year)));

  return Array.from(years).filter((y) => Number.isFinite(y)).sort((a, b) => b - a);
}

export async function getBudgetsForYear(fiscalYear: number): Promise<BudgetRow[]> {
  return fetchAllRows<BudgetRow>("budgets", (q) => q.eq("fiscal_year", fiscalYear));
}

export async function getBudgetsForDepartmentYear(
  departmentName: string,
  fiscalYear: number
): Promise<BudgetRow[]> {
  const name = (departmentName ?? "").trim();
  if (!name) return [];
  return fetchAllRows<BudgetRow>("budgets", (q) =>
    q.eq("fiscal_year", fiscalYear).eq("department_name", name)
  );
}

export async function getActualsForYear(fiscalYear: number): Promise<ActualRow[]> {
  return fetchAllRows<ActualRow>("actuals", (q) => q.eq("fiscal_year", fiscalYear));
}

export async function getActualsForDepartmentYear(
  departmentName: string,
  fiscalYear: number
): Promise<ActualRow[]> {
  const name = (departmentName ?? "").trim();
  if (!name) return [];
  return fetchAllRows<ActualRow>("actuals", (q) =>
    q.eq("fiscal_year", fiscalYear).eq("department_name", name)
  );
}

export async function getTransactionsForYear(fiscalYear: number): Promise<TransactionRow[]> {
  return fetchAllRows<TransactionRow>("transactions", (q) => q.eq("fiscal_year", fiscalYear));
}

export async function getTransactionsForDepartmentYear(
  departmentName: string,
  fiscalYear: number
): Promise<TransactionRow[]> {
  const name = (departmentName ?? "").trim();
  if (!name) return [];
  return fetchAllRows<TransactionRow>("transactions", (q) =>
    q.eq("fiscal_year", fiscalYear)
      .eq("department_name", name)
      .order("date", { ascending: false })
  );
}

/* =========================
   Upload logs
========================= */

export type DataUploadLogRow = {
  id: number;
  created_at: string;
  table_name: string;
  mode: "append" | "replace_year" | "replace_table";
  row_count: number;
  fiscal_year: number | null;
};

export async function getDataUploadLogs(): Promise<DataUploadLogRow[]> {
  // Never throw here (Overview should remain stable even if logs are unavailable).
  const attempt = async (table: string) => {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    return { data, error };
  };

  const first = await attempt("data_upload_logs");
  if (!first.error) return (first.data ?? []) as DataUploadLogRow[];

  const fallback = await attempt("data_uploads");
  if (!fallback.error) return (fallback.data ?? []) as DataUploadLogRow[];

  console.error("getDataUploadLogs error:", first.error || fallback.error);
  return [];
}

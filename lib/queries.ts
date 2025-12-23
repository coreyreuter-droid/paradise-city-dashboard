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

  // Homepage stats + section toggles (used by LandingClient)
  stat_population: string | null;
  stat_employees: string | null;
  stat_square_miles: string | null;
  stat_annual_budget: string | null;

  show_leadership: boolean | null;
  show_story: boolean | null;
  show_year_review: boolean | null;
  show_capital_projects: boolean | null;
  show_stats: boolean | null;
  show_projects: boolean | null;
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

// Recent transactions (compat for overview)
export async function getRecentTransactionsForYear(
  fiscalYear: number,
  limit: number = 10
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}


/* =========================
   Fiscal years (canonical)
========================= */

export async function getPortalFiscalYears(): Promise<number[]> {
    const [budgetYears, txYears, revenueYears] = await Promise.all([

    supabase.from("budget_actuals_year_totals").select("fiscal_year"),
    supabase.from("transaction_year_totals").select("fiscal_year"),
    supabase.from("revenue_year_totals").select("fiscal_year"),
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
  // Use the year+department rollup (which already exists and includes the full year range)
  const { data, error } = await supabase
    .from("budget_actuals_year_department")
    .select("fiscal_year, budget_amount, actual_amount");

  if (error) {
    console.error("getBudgetActualsYearTotals error:", error);
    return [];
  }

  const byYear = new Map<number, { budget: number; actuals: number }>();

  for (const r of (data ?? []) as any[]) {
    const year = Number(r.fiscal_year);
    if (!Number.isFinite(year)) continue;

    const budget = Number(r.budget_amount ?? 0);
    const actuals = Number(r.actual_amount ?? 0);

    const cur = byYear.get(year) ?? { budget: 0, actuals: 0 };
    cur.budget += Number.isFinite(budget) ? budget : 0;
    cur.actuals += Number.isFinite(actuals) ? actuals : 0;
    byYear.set(year, cur);
  }

  return Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0]) // ascending for charts
    .map(([year, totals]) => ({
      year,
      Budget: totals.budget,
      Actuals: totals.actuals,
      Variance: totals.actuals - totals.budget,
    }));
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
  const { data, error } = await supabase

    .from("transaction_year_department")
    .select("fiscal_year")
    .order("fiscal_year", { ascending: false });

  if (error) {
    console.error("getTransactionYears error:", error);
    throw error;
  }

  const seen = new Set<number>();
  const out: number[] = [];

  (data ?? []).forEach((r: any) => {
    const year = Number(r?.fiscal_year);
    if (Number.isFinite(year) && !seen.has(year)) {
      seen.add(year);
      out.push(year);
    }
  });

  return out;
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
  mode: string;
  row_count: number;
  fiscal_year: number | null;
  filename: string | null;
  admin_identifier: string | null;
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

/* =========================
   Legacy exports (compat)
   - DO NOT remove/rename (UI depends on these)
   - Implemented via summary tables + scoped raw reads where possible
========================= */

export type DepartmentBudgetActual = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number; // 0–100
};

export type BudgetPageDepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number;
};

export type TransactionFilter = {
  fiscalYear: number;
  departmentName?: string;
  fundCode?: string;
  accountCode?: string;
  vendorSearch?: string;
  descriptionSearch?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
};

export async function getTransactions(
  filter: TransactionFilter
): Promise<TransactionRow[]> {
  const {
    fiscalYear,
    departmentName,
    fundCode,
    accountCode,
    vendorSearch,
    descriptionSearch,
    minAmount,
    maxAmount,
    limit = 200,
    offset = 0,
  } = filter;

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .order("date", { ascending: false });

  if (departmentName) query = query.eq("department_name", departmentName);
  if (fundCode) query = query.eq("fund_code", fundCode);
  if (accountCode) query = query.eq("account_code", accountCode);

  if (vendorSearch && vendorSearch.trim().length > 0) {
    query = query.ilike("vendor", `%${vendorSearch.trim()}%`);
  }
  if (descriptionSearch && descriptionSearch.trim().length > 0) {
    query = query.ilike("description", `%${descriptionSearch.trim()}%`);
  }
  if (typeof minAmount === "number") query = query.gte("amount", minAmount);
  if (typeof maxAmount === "number") query = query.lte("amount", maxAmount);

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("getTransactions error:", error);
    throw error;
  }

  return (data ?? []) as TransactionRow[];
}

export type TransactionsPageResult = {
  rows: TransactionRow[];
  totalCount: number;
};

/**
 * Fast paginated transaction query (Transactions page).
 * Uses planned count for performance at scale.
 */
export async function getTransactionsPage(options: {
  fiscalYear?: number;
  department?: string;
  vendorQuery?: string;
  page: number;
  pageSize: number;
}): Promise<TransactionsPageResult> {
  const { fiscalYear, department, vendorQuery, page, pageSize } = options;

  let query = supabase
    .from("transactions")
    .select("*", { count: "planned" });

  if (fiscalYear) query = query.eq("fiscal_year", fiscalYear);
  if (department) query = query.eq("department_name", department);

  if (vendorQuery && vendorQuery.trim().length > 0) {
    query = query.ilike("vendor", `%${vendorQuery.trim()}%`);
  }

  // Newest first
  query = query.order("date", { ascending: false });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error("getTransactionsPage error:", error);
    throw error;
  }

  return {
    rows: (data ?? []) as TransactionRow[],
    totalCount: count ?? 0,
  };
}

/**
 * Distinct transaction departments for a year.
 * Uses summary table for performance.
 */
export async function getTransactionDepartmentsForYear(
  fiscalYear: number
): Promise<string[]> {
  const { data, error } = await supabase
    .from("transaction_year_department")
    .select("department_name")
    .eq("fiscal_year", fiscalYear)
    .order("department_name", { ascending: true });

  if (error) {
    console.error("getTransactionDepartmentsForYear error:", error);
    throw error;
  }

  const names = (data ?? [])
    .map((r: any) => (r?.department_name ?? "").toString().trim())
    .filter((s: string) => s.length > 0);

  // de-dupe defensively
  return Array.from(new Set(names));
}

/**
 * Department summaries for Budget page.
 * Uses summary table (no JS aggregation over raw tables).
 */
export async function getBudgetPageDepartmentSummaries(
  fiscalYear: number
): Promise<BudgetPageDepartmentSummary[]> {
  const { data, error } = await supabase
    .from("budget_actuals_year_department")
    .select("department_name,budget_amount,actual_amount")
    .eq("fiscal_year", fiscalYear);

  if (error) {
    console.error("getBudgetPageDepartmentSummaries error:", error);
    throw error;
  }

  return (data ?? []).map((row: any) => {
    const budget = Number(row?.budget_amount ?? 0);
    const actuals = Number(row?.actual_amount ?? 0);
    const percentSpent = budget > 0 ? Math.round((actuals / budget) * 100) : 0;

    return {
      department_name: (row?.department_name ?? "Unassigned").toString(),
      budget,
      actuals,
      percentSpent,
    };
  });
}

/**
 * Budget vs actuals by department for a fiscal year (used in Analytics/Budget views).
 * Summary-table backed.
 */
export async function getDepartmentBudgetVsActual(
  fiscalYear: number
): Promise<DepartmentBudgetActual[]> {
  const rows = await getBudgetPageDepartmentSummaries(fiscalYear);
  // same shape, different exported name in legacy UI
  return rows.map((r) => ({
    department_name: r.department_name,
    budget: r.budget,
    actuals: r.actuals,
    percentSpent: r.percentSpent,
  }));
}

/**
 * Legacy: all budgets for a department (all years).
 * WARNING: can be large; prefer getBudgetsForDepartmentYear where possible.
 */
export async function getBudgetsForDepartment(
  departmentName: string
): Promise<BudgetRow[]> {
  return fetchAllRows<BudgetRow>("budgets", (q) =>
    q.eq("department_name", departmentName)
  );
}

/**
 * Legacy: all actuals for a department (all years).
 * WARNING: can be large; prefer getActualsForDepartmentYear where possible.
 */
export async function getActualsForDepartment(
  departmentName: string
): Promise<ActualRow[]> {
  return fetchAllRows<ActualRow>("actuals", (q) =>
    q.eq("department_name", departmentName)
  );
}

/**
 * Legacy: all transactions for a department (all years).
 * WARNING: can be extremely large; prefer getTransactionsForDepartmentYear.
 */
export async function getTransactionsForDepartment(
  departmentName: string
): Promise<TransactionRow[]> {
  return fetchAllRows<TransactionRow>("transactions", (q) =>
    q.eq("department_name", departmentName)
  );
}

/**
 * Legacy: distinct fiscal years present in revenues.
 */
export async function getRevenueYears(): Promise<number[]> {
  const { data, error } = await supabase
    .from("revenue_year_totals")
    .select("fiscal_year")
    .order("fiscal_year", { ascending: false });

  if (error) {
    console.error("getRevenueYears error:", error);
    throw error;
  }

  const seen = new Set<number>();
  const out: number[] = [];

  (data ?? []).forEach((r: any) => {
    const year = Number(r?.fiscal_year);
    if (Number.isFinite(year) && !seen.has(year)) {
      seen.add(year);
      out.push(year);
    }
  });

  return out;
}

export async function getRevenueYearTotals(): Promise<
  Array<{ year: number; total: number }>
> {
  const { data, error } = await supabase
    .from("revenue_year_totals")
    .select("fiscal_year,total_revenue")
    .order("fiscal_year", { ascending: false });

  if (error) {
    console.error("getRevenueYearTotals error:", error);
    throw error;
  }

  return (data ?? [])
    .map((r: any) => ({
      year: Number(r?.fiscal_year),
      total: Number(r?.total_revenue ?? 0),
    }))
    .filter((r) => Number.isFinite(r.year));
}

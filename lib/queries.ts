// lib/queries.ts
//
// Single source of truth for Supabase reads.
// Summary tables are preferred for performance on large datasets.

import { supabase } from "./supabase";
import type { ActualRow, BudgetRow, TransactionRow, RevenueRow } from "./schema";

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

  stat_population: string | null;
  stat_employees: string | null;
  stat_square_miles: string | null;
  stat_annual_budget: string | null;

  fiscal_year_start_month: number | null;
  fiscal_year_start_day: number | null;
  fiscal_year_label: string | null;

  is_published: boolean | null;

  show_leadership: boolean | null;
  show_story: boolean | null;
  show_year_review: boolean | null;
  show_capital_projects: boolean | null;
  show_stats: boolean | null;
  show_projects: boolean | null;

  enable_budget: boolean | null;
  enable_actuals: boolean | null;
  enable_transactions: boolean | null;
  enable_vendors: boolean | null;
  enable_revenues: boolean | null;
};

export async function getPortalSettings(): Promise<PortalSettings | null> {
  const { data, error } = await supabase
    .from("portal_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("getPortalSettings error:", error);
    return null;
  }
  if (!data) return null;

  const row = data as any;

  const enable_budget =
    row.enable_budget === null || row.enable_budget === undefined
      ? true
      : !!row.enable_budget;

  const enable_actuals =
    row.enable_actuals === null || row.enable_actuals === undefined
      ? true
      : !!row.enable_actuals;

  const enable_transactions =
    row.enable_transactions === null || row.enable_transactions === undefined
      ? false
      : !!row.enable_transactions;

  const enable_vendors =
    enable_transactions === true
      ? row.enable_vendors === null || row.enable_vendors === undefined
        ? false
        : !!row.enable_vendors
      : false;

  const enable_revenues =
    row.enable_revenues === null || row.enable_revenues === undefined
      ? false
      : !!row.enable_revenues;

  return {
    id: row.id,
    city_name: row.city_name ?? "Your City",
    tagline: row.tagline ?? null,
    primary_color: row.primary_color ?? null,
    accent_color: row.accent_color ?? null,
    background_color: row.background_color ?? null,
    logo_url: row.logo_url ?? null,
    hero_message: row.hero_message ?? null,
    hero_image_url: row.hero_image_url ?? null,
    seal_url: row.seal_url ?? null,

    story_city_description: row.story_city_description ?? null,
    story_year_achievements: row.story_year_achievements ?? null,
    story_capital_projects: row.story_capital_projects ?? null,

    leader_name: row.leader_name ?? null,
    leader_title: row.leader_title ?? null,
    leader_message: row.leader_message ?? null,
    leader_photo_url: row.leader_photo_url ?? null,

    project1_title: row.project1_title ?? null,
    project1_summary: row.project1_summary ?? null,
    project2_title: row.project2_title ?? null,
    project2_summary: row.project2_summary ?? null,
    project3_title: row.project3_title ?? null,
    project3_summary: row.project3_summary ?? null,
    project1_image_url: row.project1_image_url ?? null,
    project2_image_url: row.project2_image_url ?? null,
    project3_image_url: row.project3_image_url ?? null,

    stat_population: row.stat_population ?? null,
    stat_employees: row.stat_employees ?? null,
    stat_square_miles: row.stat_square_miles ?? null,
    stat_annual_budget: row.stat_annual_budget ?? null,

    fiscal_year_start_month:
      row.fiscal_year_start_month != null ? Number(row.fiscal_year_start_month) : null,
    fiscal_year_start_day:
      row.fiscal_year_start_day != null ? Number(row.fiscal_year_start_day) : null,
    fiscal_year_label: row.fiscal_year_label ?? null,

    is_published: row.is_published ?? null,

    show_leadership:
      row.show_leadership === null || row.show_leadership === undefined ? true : !!row.show_leadership,
    show_story:
      row.show_story === null || row.show_story === undefined ? true : !!row.show_story,
    show_year_review:
      row.show_year_review === null || row.show_year_review === undefined ? true : !!row.show_year_review,
    show_capital_projects:
      row.show_capital_projects === null || row.show_capital_projects === undefined
        ? true
        : !!row.show_capital_projects,
    show_stats:
      row.show_stats === null || row.show_stats === undefined ? true : !!row.show_stats,
    show_projects:
      row.show_projects === null || row.show_projects === undefined ? true : !!row.show_projects,

    enable_budget,
    enable_actuals,
    enable_transactions,
    enable_vendors,
    enable_revenues,
  };
}

export async function getRevenueYears(): Promise<number[]> {
  const { data, error } = await supabase
    .from("revenues")
    .select("fiscal_year");

  if (error) {
    console.error("getRevenueYears error:", error);
    return [];
  }

  const years =
    (data ?? [])
      .map((row: any) => Number(row.fiscal_year))
      .filter((y: number) => Number.isFinite(y)) ?? [];

  return Array.from(new Set(years)).sort((a, b) => b - a);
}


/* =========================
   Canonical year list (fast)
========================= */

export async function getPortalFiscalYears(): Promise<number[]> {
  const [baydRes, txDeptRes, revRes] = await Promise.all([
    supabase.from("budget_actuals_year_department").select("fiscal_year"),
    supabase.from("transaction_year_department").select("fiscal_year"),
    supabase.from("revenues").select("fiscal_year"),
  ]);

  if (baydRes.error) console.error("getPortalFiscalYears bayd error:", baydRes.error);
  if (txDeptRes.error) console.error("getPortalFiscalYears txDept error:", txDeptRes.error);
  if (revRes.error) console.error("getPortalFiscalYears revenues error:", revRes.error);

  const years = new Set<number>();
  const add = (rows: any[] | null | undefined) => {
    (rows ?? []).forEach((r) => {
      const y = Number(r.fiscal_year);
      if (Number.isFinite(y)) years.add(y);
    });
  };

  add(baydRes.data);
  add(txDeptRes.data);
  add(revRes.data);

  return Array.from(years).sort((a, b) => b - a);
}

/* =========================
   Budget/Actuals summaries
========================= */

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
    console.error("getBudgetActualsSummaryForYear error:", { fiscalYear, error });
    throw error;
  }

  return (data ?? []) as BudgetActualsYearDeptRow[];
}

export async function getBudgetActualsSummaryAllYears(): Promise<BudgetActualsYearDeptRow[]> {
  const { data, error } = await supabase
    .from("budget_actuals_year_department")
    .select("*");

  if (error) {
    console.error("getBudgetActualsSummaryAllYears error:", error);
    return [];
  }

  return (data ?? []) as BudgetActualsYearDeptRow[];
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
  if (txRes.error) console.error("getTransactionYears transactions error:", txRes.error);

  const years = new Set<number>();

  const add = (rows: any[] | null | undefined) => {
    (rows ?? []).forEach((r) => {
      const y = Number(r.fiscal_year);
      if (Number.isFinite(y)) years.add(y);
    });
  };

  add(budgetsRes.data);
  add(actualsRes.data);
  add(txRes.data);

  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Backwards-compatible: departments list for a fiscal year.
 * Used by /transactions filters.
 */
export async function getTransactionDepartmentsForYear(
  fiscalYear: number
): Promise<string[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("department_name")
    .eq("fiscal_year", fiscalYear);

  if (error) {
    console.error("getTransactionDepartmentsForYear error:", { fiscalYear, error });
    return [];
  }

  const set = new Set<string>();

  (data ?? []).forEach((row: any) => {
    const raw = row.department_name as string | null;
    const name = raw && raw.trim().length > 0 ? raw.trim() : "Unspecified";
    set.add(name);
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}



// From view: budget_actuals_year_totals
export async function getBudgetActualsYearTotals(): Promise<
  { year: number; Budget: number; Actuals: number; Variance: number }[]
> {
  const { data, error } = await supabase
    .from("budget_actuals_year_totals")
    .select("fiscal_year, total_budget, total_actuals")
    .order("fiscal_year", { ascending: true });

  if (error) {
    console.error("getBudgetActualsYearTotals error:", error);
    return [];
  }

  return (data ?? []).map((r: any) => {
    const year = Number(r.fiscal_year);
    const budget = Number(r.total_budget || 0);
    const actuals = Number(r.total_actuals || 0);
    return {
      year,
      Budget: budget,
      Actuals: actuals,
      Variance: actuals - budget,
    };
  });
}

/* =========================
   Transaction summaries
========================= */

export type DepartmentYearTxSummary = {
  fiscal_year: number;
  department_name: string;
  total_amount: number;
  txn_count: number;
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
    console.error("getDepartmentTransactionSummariesForYear error:", { fiscalYear, error });
    throw error;
  }

  return (data ?? []) as DepartmentYearTxSummary[];
}

export type VendorYearSummary = {
  fiscal_year: number;
  vendor: string;
  total_amount: number;
  txn_count: number;
  first_txn_date: string | null;
  last_txn_date: string | null;
};

export async function getVendorSummariesForYear(
  fiscalYear: number,
  options?: { search?: string | null; limit?: number }
): Promise<VendorYearSummary[]> {
  const limit = options?.limit ?? 500;
  const search = options?.search?.trim() ?? "";

  let query = supabase
    .from("transaction_year_vendor")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .order("total_amount", { ascending: false });

  if (search.length > 0) {
    query = query.ilike("vendor", `%${search}%`);
  }
  if (limit && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getVendorSummariesForYear error:", { fiscalYear, search, limit, error });
    throw error;
  }

  return (data ?? []) as VendorYearSummary[];
}

export async function getRecentTransactionsForYear(
  fiscalYear: number,
  limit = 20
): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRecentTransactionsForYear error:", { fiscalYear, limit, error });
    throw error;
  }

  return (data ?? []) as TransactionRow[];
}

/* =========================
   Raw table helpers (legacy)
========================= */

const PAGE_SIZE = 1000;

async function fetchAllRows<T>(table: string, buildQuery?: (q: any) => any): Promise<T[]> {
  const all: T[] = [];
  let page = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query: any = supabase.from(table).select("*");
    if (buildQuery) query = buildQuery(query);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await query.range(from, to);

    if (error) {
      console.error(`fetchAllRows error for table "${table}"`, error);
      throw error;
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

  const years =
    data?.map((row: any) => Number(row.fiscal_year)).filter((y: number) => Number.isFinite(y)) ?? [];

  return Array.from(new Set(years)).sort((a, b) => a - b);
}

export async function getBudgetsForYear(fiscalYear: number): Promise<BudgetRow[]> {
  return fetchAllRows<BudgetRow>("budgets", (q) => q.eq("fiscal_year", fiscalYear));
}

export async function getActualsForYear(fiscalYear: number): Promise<ActualRow[]> {
  return fetchAllRows<ActualRow>("actuals", (q) => q.eq("fiscal_year", fiscalYear));
}

export async function getRevenuesForYear(fiscalYear: number): Promise<RevenueRow[]> {
  return fetchAllRows<RevenueRow>("revenues", (q) => q.eq("fiscal_year", fiscalYear));
}

export async function getTransactionsForYear(fiscalYear: number): Promise<TransactionRow[]> {
  return fetchAllRows<TransactionRow>("transactions", (q) => q.eq("fiscal_year", fiscalYear));
}

/* =========================
   Transactions explorer
========================= */

export type TransactionsPageResult = {
  rows: TransactionRow[];
  totalCount: number;
};

export async function getTransactionsPage(options: {
  fiscalYear?: number;
  department?: string;
  vendorQuery?: string;
  page: number;
  pageSize: number;
}): Promise<TransactionsPageResult> {
  const { fiscalYear, department, vendorQuery, page, pageSize } = options;

  let query = supabase.from("transactions").select("*", { count: "planned" });

  if (fiscalYear) query = query.eq("fiscal_year", fiscalYear);
  if (department && department !== "all") query = query.eq("department_name", department);

  if (vendorQuery && vendorQuery.trim().length > 0) {
    const q = `%${vendorQuery.trim()}%`;
    query = query.or(`vendor.ilike.${q},description.ilike.${q}`);
  }

  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order("date", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching paged transactions", { options, error });
    return { rows: [], totalCount: 0 };
  }

  const rows: TransactionRow[] = (data ?? []) as TransactionRow[];
  const totalCount = typeof count === "number" ? count : rows.length;

  return { rows, totalCount };
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
  filename: string | null;
  admin_identifier: string | null;
};

export async function getDataUploadLogs(): Promise<DataUploadLogRow[]> {
  const { data, error } = await supabase
    .from("data_uploads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("getDataUploadLogs error:", error);
    throw error;
  }

  return (data ?? []) as DataUploadLogRow[];
}

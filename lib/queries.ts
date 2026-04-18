// lib/queries.ts
//
// Single source of truth for Supabase reads.
// Summary tables are preferred for performance on large datasets.


import { supabase } from "./supabase";
import { sanitizeSearchInput, sanitizePostgrestValue } from "./format";
import type { ActualRow, BudgetRow, TransactionRow, RevenueRow } from "./schema";

// Internal types for Supabase query results
type FiscalYearRow = { fiscal_year: number };
type BudgetActualsRow = {
  fiscal_year: number;
  budget_amount: number;
  actual_amount: number;
};
type DepartmentNameRow = { department_name: string };
type BudgetActualsDeptRow = {
  department_name: string;
  budget_amount: number;
  actual_amount: number;
};
type RevenueYearTotalRow = {
  fiscal_year: number;
  total_revenue: number;
};

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
  enable_projects: boolean | null;

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
  // IMPORTANT: Portal-wide years should come from summary/rollup sources (fast + consistent for the UI).
  const [budgetYears, txYears, revenueYears] = await Promise.all([
    supabase.from("budget_actuals_year_totals").select("fiscal_year"),
    supabase.from("transaction_year_totals").select("fiscal_year"),
    supabase.from("revenue_year_totals").select("fiscal_year"),
  ]);

  const years = new Set<number>();

  if (!budgetYears.error) {
    ((budgetYears.data ?? []) as FiscalYearRow[]).forEach((r) =>
      years.add(Number(r.fiscal_year))
    );
  }
  if (!txYears.error) {
    ((txYears.data ?? []) as FiscalYearRow[]).forEach((r) =>
      years.add(Number(r.fiscal_year))
    );
  }
  if (!revenueYears.error) {
    ((revenueYears.data ?? []) as FiscalYearRow[]).forEach((r) =>
      years.add(Number(r.fiscal_year))
    );
  }

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
  const limitCount = opts?.limit ?? 500;
  const search = opts?.search ?? null;
  const sanitized = search?.trim() ? sanitizeSearchInput(search) : null;

  const query = supabase
    .from("v_transaction_year_vendor")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .order("total_amount", { ascending: false })
    .limit(limitCount);

  const { data, error } = sanitized
    ? await query.ilike("vendor", `%${sanitized}%`)
    : await query;

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
  // Use department-level view (aggregates across all funds)
  const { data, error } = await supabase
    .from("v_transaction_year_department")
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
  // Use department-level view (aggregates across all funds)
  const { data, error } = await supabase
    .from("v_budget_actuals_year_department")
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

  // Use department-level view (aggregates across all funds)
  const { data, error } = await supabase
    .from("v_budget_actuals_year_department")
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
  // Use department-level view (aggregates across all funds)
  const { data, error } = await supabase
    .from("v_budget_actuals_year_department")
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
  // Use department-level view (already aggregated across funds, fewer rows to process)
  const { data, error } = await supabase
    .from("v_budget_actuals_year_department")
    .select("fiscal_year, budget_amount, actual_amount");

  if (error) {
    console.error("getBudgetActualsYearTotals error:", error);
    return [];
  }

  const byYear = new Map<number, { budget: number; actuals: number }>();

  for (const r of (data ?? []) as BudgetActualsRow[]) {
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

/**
 * Get all revenues for a specific source/category.
 */
export async function getRevenuesForSource(category: string): Promise<RevenueRow[]> {
  return fetchAllRows<RevenueRow>("revenues", (q) => q.eq("category", category));
}

/**
 * Get revenues for a specific source and year.
 */
export async function getRevenuesForSourceYear(category: string, fiscalYear: number): Promise<RevenueRow[]> {
  return fetchAllRows<RevenueRow>("revenues", (q) => 
    q.eq("category", category).eq("fiscal_year", fiscalYear)
  );
}

/**
 * Get summary totals by year for a specific revenue source.
 */
export async function getRevenueSourceSummaryByYear(category: string): Promise<Array<{
  fiscal_year: number;
  total: number;
  count: number;
}>> {
  const rows = await getRevenuesForSource(category);
  
  const byYear = new Map<number, { total: number; count: number }>();
  for (const row of rows) {
    const year = row.fiscal_year;
    const existing = byYear.get(year) ?? { total: 0, count: 0 };
    existing.total += Number(row.amount ?? 0);
    existing.count += 1;
    byYear.set(year, existing);
  }
  
  return Array.from(byYear.entries())
    .map(([fiscal_year, data]) => ({ fiscal_year, ...data }))
    .sort((a, b) => b.fiscal_year - a.fiscal_year);
}

/**
 * Get all distinct revenue categories.
 */
export async function getRevenueCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("revenues")
    .select("category")
    .not("category", "is", null);
  
  if (error) {
    console.error("getRevenueCategories error:", error);
    return [];
  }
  
  const categories = new Set<string>();
  for (const row of (data ?? [])) {
    const cat = (row as { category: string | null }).category;
    if (cat && cat.trim()) {
      categories.add(cat.trim());
    }
  }
  
  return Array.from(categories).sort();
}

/* =========================
   Raw data helpers
========================= */

type SupabaseQuery = ReturnType<ReturnType<typeof supabase.from>["select"]>;

async function fetchAllRows<T>(table: string, buildQuery?: (q: SupabaseQuery) => SupabaseQuery): Promise<T[]> {
  const all: T[] = [];
  let page = 0;

  while (true) {
    let query: SupabaseQuery = supabase.from(table).select("*");
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
  ((data ?? []) as FiscalYearRow[]).forEach((r) => years.add(Number(r.fiscal_year)));
  return Array.from(years).filter((y) => Number.isFinite(y)).sort((a, b) => b - a);
}

/**
 * Backwards-compatible: distinct fiscal years across budgets/actuals/transactions.
 * Used by /transactions and other filters.
 */
export async function getTransactionYears(): Promise<number[]> {
  // Use department-level view (aggregated, fewer rows to scan)
  const { data, error } = await supabase
    .from("v_transaction_year_department")
    .select("fiscal_year")
    .order("fiscal_year", { ascending: false });

  if (error) {
    console.error("getTransactionYears error:", error);
    throw error;
  }

  const seen = new Set<number>();
  const out: number[] = [];

  ((data ?? []) as FiscalYearRow[]).forEach((r) => {
    const year = Number(r.fiscal_year);
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
  const { data, error } = await supabase
    .from("data_uploads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("getDataUploadLogs error:", error);
    return [];
  }

  return (data ?? []) as DataUploadLogRow[];
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
    const sanitized = sanitizeSearchInput(vendorSearch);
    if (sanitized) {
      query = query.ilike("vendor", `%${sanitized}%`);
    }
  }
  if (descriptionSearch && descriptionSearch.trim().length > 0) {
    const sanitized = sanitizeSearchInput(descriptionSearch);
    if (sanitized) {
      query = query.ilike("description", `%${sanitized}%`);
    }
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
    const sanitized = sanitizePostgrestValue(vendorQuery);
    if (sanitized) {
      // Search across vendor, description, and department_name
      query = query.or(
        `vendor.ilike.%${sanitized}%,description.ilike.%${sanitized}%,department_name.ilike.%${sanitized}%`
      );
    }
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
 * Uses department-level view for performance.
 */
export async function getTransactionDepartmentsForYear(
  fiscalYear: number
): Promise<string[]> {
  const { data, error } = await supabase
    .from("v_transaction_year_department")
    .select("department_name")
    .eq("fiscal_year", fiscalYear)
    .order("department_name", { ascending: true });

  if (error) {
    console.error("getTransactionDepartmentsForYear error:", error);
    throw error;
  }

  const names = ((data ?? []) as DepartmentNameRow[])
    .map((r) => (r.department_name ?? "").toString().trim())
    .filter((s) => s.length > 0);

  // de-dupe defensively
  return Array.from(new Set(names));
}

/**
 * Department summaries for Budget page.
 * Uses department-level view (aggregated across all funds).
 */
export async function getBudgetPageDepartmentSummaries(
  fiscalYear: number
): Promise<BudgetPageDepartmentSummary[]> {
  const { data, error } = await supabase
    .from("v_budget_actuals_year_department")
    .select("department_name,budget_amount,actual_amount")
    .eq("fiscal_year", fiscalYear);

  if (error) {
    console.error("getBudgetPageDepartmentSummaries error:", error);
    throw error;
  }

  return ((data ?? []) as BudgetActualsDeptRow[]).map((row) => {
    const budget = Number(row.budget_amount ?? 0);
    const actuals = Number(row.actual_amount ?? 0);
    const percentSpent = budget > 0 ? Math.round((actuals / budget) * 100) : 0;

    return {
      department_name: (row.department_name ?? "Unassigned").toString(),
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

  ((data ?? []) as FiscalYearRow[]).forEach((r) => {
    const year = Number(r.fiscal_year);
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

  return ((data ?? []) as RevenueYearTotalRow[])
    .map((r) => ({
      year: Number(r.fiscal_year),
      total: Number(r.total_revenue ?? 0),
    }))
    .filter((r) => Number.isFinite(r.year));
}


/* =========================
   Capital Projects
========================= */

export type CapitalProject = {
  id: string;
  city_slug: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  status: "planned" | "in_progress" | "completed";
  published: boolean;
  location_text: string | null;
  map_url: string | null;
  start_date: string | null;
  estimated_completion_date: string | null;
  actual_completion_date: string | null;
  estimated_cost: number | null;
  funding_source: string | null;
  created_at: string;
  updated_at: string;
};

export type CapitalProjectImage = {
  id: string;
  project_id: string;
  city_slug: string;
  image_url: string;
  alt_text: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

export type CapitalProjectWithImages = CapitalProject & {
  images: CapitalProjectImage[];
};

/**
 * Get all published projects for public display
 */
export async function getPublishedProjects(
  citySlug: string
): Promise<CapitalProjectWithImages[]> {
  const { data, error } = await supabase
    .from("capital_projects")
    .select(`
      *,
      images:capital_project_images(*)
    `)
    .eq("city_slug", citySlug)
    .eq("published", true)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getPublishedProjects error:", error);
    throw error;
  }

  return (data ?? []).map((p) => ({
    ...p,
    images: (p.images ?? []).sort(
      (a: CapitalProjectImage, b: CapitalProjectImage) => a.sort_order - b.sort_order
    ),
  })) as CapitalProjectWithImages[];
}

/**
 * Get a single published project by slug for public detail page
 */
export async function getPublishedProjectBySlug(
  citySlug: string,
  slug: string
): Promise<CapitalProjectWithImages | null> {
  const { data, error } = await supabase
    .from("capital_projects")
    .select(`
      *,
      images:capital_project_images(*)
    `)
    .eq("city_slug", citySlug)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    console.error("getPublishedProjectBySlug error:", error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    images: (data.images ?? []).sort(
      (a: CapitalProjectImage, b: CapitalProjectImage) => a.sort_order - b.sort_order
    ),
  } as CapitalProjectWithImages;
}

/**
 * Check if a city has any published projects (for nav visibility)
 */
export async function hasPublishedProjects(citySlug: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("capital_projects")
    .select("id", { count: "exact", head: true })
    .eq("city_slug", citySlug)
    .eq("published", true);

  if (error) {
    console.error("hasPublishedProjects error:", error);
    return false;
  }

  return (count ?? 0) > 0;
}

/* =========================
   Admin Audit Log Queries
========================= */

export type AdminAuditLogRow = {
  id: number;
  created_at: string;
  city_slug: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_table: string | null;
  fiscal_year: number | null;
  mode: string | null;
  filename: string | null;
  rows_affected: number | null;
  status: string;
  error_message: string | null;
  meta: Record<string, unknown>;
};

/**
 * Get admin audit log entries filtered by action category
 */
export async function getAdminAuditLogs(
  category?: "data" | "users" | "branding"
): Promise<AdminAuditLogRow[]> {
  let query = supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  // Filter by action category if specified
  if (category === "data") {
    query = query.or(
      "action.like.upload.%,action.like.import.%,action.like.profile.%,action.like.lookup.%,action.like.data.%"
    );
  } else if (category === "users") {
    query = query.or("action.like.user.%");
  } else if (category === "branding") {
    query = query.or("action.like.branding.%,action.like.portal.%");
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAdminAuditLogs error:", error);
    return [];
  }

  return (data ?? []) as AdminAuditLogRow[];
}

/**
 * Get combined activity log (both data_uploads and admin_audit_log for data tab)
 * Returns a unified format for display
 */
export type UnifiedActivityLog = {
  id: string;
  created_at: string;
  action: string;
  description: string;
  actor: string | null;
  status: "SUCCESS" | "FAILED" | null;
  meta: Record<string, unknown>;
};

export async function getUnifiedDataActivity(): Promise<UnifiedActivityLog[]> {
  // Get from data_uploads (traditional uploads)
  const { data: uploads, error: uploadsError } = await supabase
    .from("data_uploads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (uploadsError) {
    console.error("getUnifiedDataActivity uploads error:", uploadsError);
  }

  // Get from admin_audit_log (new system)
  const { data: auditLogs, error: auditError } = await supabase
    .from("admin_audit_log")
    .select("*")
    .or(
      "action.like.upload.%,action.like.import.%,action.like.profile.%,action.like.lookup.%,action.like.data.%"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (auditError) {
    console.error("getUnifiedDataActivity audit error:", auditError);
  }

  // Transform data_uploads to unified format
  const uploadEntries: UnifiedActivityLog[] = (uploads ?? []).map((u) => {
    // Check if this is a delete operation
    const isDelete = u.mode === "delete";
    
    return {
      id: `upload-${u.id}`,
      created_at: u.created_at,
      action: isDelete ? "data.deleted" : "upload.completed",
      description: isDelete
        ? `Deleted ${u.row_count?.toLocaleString() ?? 0} rows from ${u.table_name}${u.fiscal_year ? ` (FY ${u.fiscal_year})` : ""}`
        : `Uploaded ${u.row_count?.toLocaleString() ?? 0} rows to ${u.table_name}${u.fiscal_year ? ` (FY ${u.fiscal_year})` : ""}`,
      actor: u.admin_identifier,
      status: "SUCCESS" as const,
      meta: {
        table_name: u.table_name,
        mode: u.mode,
        row_count: u.row_count,
        fiscal_year: u.fiscal_year,
        filename: u.filename,
        source: "data_uploads",
      },
    };
  });

  // Transform admin_audit_log to unified format
  const auditEntries: UnifiedActivityLog[] = (auditLogs ?? []).map((a) => ({
    id: `audit-${a.id}`,
    created_at: a.created_at,
    action: a.action,
    description: formatAuditDescription(a),
    actor: a.actor_email,
    status: a.status as "SUCCESS" | "FAILED" | null,
    meta: {
      ...a.meta,
      target_table: a.target_table,
      fiscal_year: a.fiscal_year,
      rows_affected: a.rows_affected,
      filename: a.filename,
      error_message: a.error_message,
      source: "admin_audit_log",
    },
  }));

  // Merge and sort by date
  const combined = [...uploadEntries, ...auditEntries];
  combined.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Deduplicate (if same action within 2 seconds, keep only one)
  const deduped: UnifiedActivityLog[] = [];
  for (const entry of combined) {
    const isDupe = deduped.some(
      (e) =>
        e.action === entry.action &&
        Math.abs(
          new Date(e.created_at).getTime() - new Date(entry.created_at).getTime()
        ) < 2000 &&
        JSON.stringify(e.meta) === JSON.stringify(entry.meta)
    );
    if (!isDupe) {
      deduped.push(entry);
    }
  }

  return deduped.slice(0, 100);
}

function formatAuditDescription(log: AdminAuditLogRow): string {
  const meta = log.meta || {};
  
  switch (log.action) {
    case "upload.completed":
      return `Uploaded ${log.rows_affected?.toLocaleString() ?? 0} rows to ${log.target_table}${log.fiscal_year ? ` (FY ${log.fiscal_year})` : ""}`;
    case "upload.failed":
      return `Upload to ${log.target_table} failed: ${log.error_message || "Unknown error"}`;
    case "import.started":
      return `Started import job for ${log.target_table}${log.filename ? ` (${log.filename})` : ""}`;
    case "import.completed":
      return `Completed import: ${log.rows_affected?.toLocaleString() ?? 0} rows to ${log.target_table}`;
    case "import.failed":
      return `Import failed: ${log.error_message || "Unknown error"}`;
    case "profile.created":
      return `Created mapping profile "${meta.profile_name || "Unknown"}" for ${meta.dataset_type || log.target_table}`;
    case "profile.updated":
      return `Updated mapping profile "${meta.profile_name || "Unknown"}"`;
    case "profile.deleted":
      return `Deleted mapping profile "${meta.profile_name || "Unknown"}"`;
    case "lookup.added":
      return `Added ${meta.lookup_type || "lookup"}: ${meta.code} = "${meta.name}"`;
    case "lookup.updated":
      return `Updated ${meta.lookup_type || "lookup"} ${meta.code}: "${meta.old_name}" → "${meta.new_name}"`;
    case "lookup.deleted":
      return `Deleted ${meta.lookup_type || "lookup"}: ${meta.code}`;
    case "data.deleted":
      return `Deleted ${log.rows_affected?.toLocaleString() ?? 0} rows from ${log.target_table}${log.fiscal_year ? ` (FY ${log.fiscal_year})` : ""}`;
    default:
      return log.action;
  }
}

export async function getUserActivityLogs(): Promise<UnifiedActivityLog[]> {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .or("action.like.user.%")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("getUserActivityLogs error:", error);
    return [];
  }

  return (data ?? []).map((a) => ({
    id: `audit-${a.id}`,
    created_at: a.created_at,
    action: a.action,
    description: formatUserDescription(a),
    actor: a.actor_email,
    status: a.status as "SUCCESS" | "FAILED" | null,
    meta: a.meta || {},
  }));
}

function formatUserDescription(log: AdminAuditLogRow): string {
  const meta = log.meta || {};
  
  switch (log.action) {
    case "user.invited":
      return `Invited ${meta.invited_email || "user"} as ${meta.role || "member"}`;
    case "user.role_changed":
      return `Changed ${meta.target_email || "user"} role: ${meta.old_role || "?"} → ${meta.new_role || "?"}`;
    case "user.removed":
      return `Removed ${meta.removed_email || "user"}`;
    default:
      return log.action;
  }
}

export async function getBrandingActivityLogs(): Promise<UnifiedActivityLog[]> {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .or("action.like.branding.%,action.like.portal.%,action.eq.PUBLISH,action.eq.UNPUBLISH")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("getBrandingActivityLogs error:", error);
    return [];
  }

  return (data ?? []).map((a) => ({
    id: `audit-${a.id}`,
    created_at: a.created_at,
    action: a.action,
    description: formatBrandingDescription(a),
    actor: a.actor_email,
    status: a.status as "SUCCESS" | "FAILED" | null,
    meta: a.meta || {},
  }));
}

/* =========================
   Fund-level queries (drill-through)
========================= */

export type BudgetActualsYearFundRow = {
  fiscal_year: number;
  fund_code: string | null;
  fund_name: string;
  budget_amount: number;
  actual_amount: number;
};

export async function getBudgetActualsByFundForYear(
  fiscalYear: number
): Promise<BudgetActualsYearFundRow[]> {
  const { data, error } = await supabase
    .from("v_budget_actuals_year_fund")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .order("budget_amount", { ascending: false });

  if (error) {
    console.error("getBudgetActualsByFundForYear error:", error);
    return [];
  }
  return (data ?? []) as BudgetActualsYearFundRow[];
}

export type BudgetActualsYearFundDeptRow = {
  fiscal_year: number;
  fund_code: string | null;
  fund_name: string;
  department_code: string | null;
  department_name: string;
  budget_amount: number;
  actual_amount: number;
};

export async function getBudgetActualsByFundDeptForYear(
  fiscalYear: number
): Promise<BudgetActualsYearFundDeptRow[]> {
  const { data, error } = await supabase
    .from("v_budget_actuals_year_fund_department")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .order("budget_amount", { ascending: false });

  if (error) {
    console.error("getBudgetActualsByFundDeptForYear error:", error);
    return [];
  }
  return (data ?? []) as BudgetActualsYearFundDeptRow[];
}

export async function getBudgetActualsByFundDeptForFund(
  fiscalYear: number,
  fundName: string
): Promise<BudgetActualsYearFundDeptRow[]> {
  const { data, error } = await supabase
    .from("v_budget_actuals_year_fund_department")
    .select("*")
    .eq("fiscal_year", fiscalYear)
    .eq("fund_name", fundName)
    .order("budget_amount", { ascending: false });

  if (error) {
    console.error("getBudgetActualsByFundDeptForFund error:", error);
    return [];
  }
  return (data ?? []) as BudgetActualsYearFundDeptRow[];
}

/* =========================
   Year-scoping queries (per-dataset)
========================= */

export async function getBudgetOnlyYears(): Promise<number[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select("fiscal_year")
    .order("fiscal_year", { ascending: false });

  if (error) {
    console.error("getBudgetOnlyYears error:", error);
    return [];
  }

  const years = new Set<number>();
  ((data ?? []) as { fiscal_year: number }[]).forEach((r) =>
    years.add(Number(r.fiscal_year))
  );
  return Array.from(years).filter((y) => Number.isFinite(y)).sort((a, b) => b - a);
}

export async function getActualOnlyYears(): Promise<number[]> {
  const { data, error } = await supabase
    .from("actuals")
    .select("fiscal_year")
    .order("fiscal_year", { ascending: false });

  if (error) {
    console.error("getActualOnlyYears error:", error);
    return [];
  }

  const years = new Set<number>();
  ((data ?? []) as { fiscal_year: number }[]).forEach((r) =>
    years.add(Number(r.fiscal_year))
  );
  return Array.from(years).filter((y) => Number.isFinite(y)).sort((a, b) => b - a);
}

/** Returns only fiscal years that have BOTH budget and actuals data */
export async function getBudgetVsActualYears(): Promise<number[]> {
  const [budgetYears, actualYears] = await Promise.all([
    getBudgetOnlyYears(),
    getActualOnlyYears(),
  ]);

  const actualSet = new Set(actualYears);
  return budgetYears.filter((y) => actualSet.has(y));
}

/* =========================
   Category / account drill-through
========================= */

export type CategorySummary = {
  category: string;
  budget_total: number;
  actual_total: number;
};

export async function getCategorySummaryForDeptFundYear(
  fiscalYear: number,
  departmentName: string,
  fundName?: string
): Promise<CategorySummary[]> {
  // Get budget by category
  let budgetQuery = supabase
    .from("budgets")
    .select("category, amount")
    .eq("fiscal_year", fiscalYear)
    .eq("department_name", departmentName);

  if (fundName) {
    budgetQuery = budgetQuery.eq("fund_name", fundName);
  }

  let actualQuery = supabase
    .from("actuals")
    .select("category, amount")
    .eq("fiscal_year", fiscalYear)
    .eq("department_name", departmentName);

  if (fundName) {
    actualQuery = actualQuery.eq("fund_name", fundName);
  }

  const [budgetResult, actualResult] = await Promise.all([
    budgetQuery,
    actualQuery,
  ]);

  if (budgetResult.error) {
    console.error("getCategorySummary budget error:", budgetResult.error);
  }
  if (actualResult.error) {
    console.error("getCategorySummary actual error:", actualResult.error);
  }

  const catMap = new Map<string, { budget: number; actual: number }>();

  for (const row of budgetResult.data ?? []) {
    const cat = (row as { category: string | null; amount: number }).category || "Uncategorized";
    const amt = Number((row as { amount: number }).amount || 0);
    const existing = catMap.get(cat) || { budget: 0, actual: 0 };
    existing.budget += amt;
    catMap.set(cat, existing);
  }

  for (const row of actualResult.data ?? []) {
    const cat = (row as { category: string | null; amount: number }).category || "Uncategorized";
    const amt = Number((row as { amount: number }).amount || 0);
    const existing = catMap.get(cat) || { budget: 0, actual: 0 };
    existing.actual += amt;
    catMap.set(cat, existing);
  }

  return Array.from(catMap.entries())
    .map(([category, totals]) => ({
      category,
      budget_total: totals.budget,
      actual_total: totals.actual,
    }))
    .sort((a, b) => b.budget_total - a.budget_total);
}

export type VendorSummaryForDrill = {
  vendor: string;
  total_amount: number;
  txn_count: number;
};

export async function getVendorSummaryForDeptYear(
  fiscalYear: number,
  departmentName: string,
  fundName?: string
): Promise<VendorSummaryForDrill[]> {
  let query = supabase
    .from("transactions")
    .select("vendor, amount")
    .eq("fiscal_year", fiscalYear)
    .eq("department_name", departmentName);

  if (fundName) {
    query = query.eq("fund_name", fundName);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getVendorSummaryForDeptYear error:", error);
    return [];
  }

  const vendorMap = new Map<string, { total: number; count: number }>();
  for (const row of data ?? []) {
    const v = (row as { vendor: string | null }).vendor?.trim() || "Unspecified";
    const amt = Number((row as { amount: number }).amount || 0);
    const existing = vendorMap.get(v) || { total: 0, count: 0 };
    existing.total += amt;
    existing.count += 1;
    vendorMap.set(v, existing);
  }

  return Array.from(vendorMap.entries())
    .map(([vendor, totals]) => ({
      vendor,
      total_amount: totals.total,
      txn_count: totals.count,
    }))
    .sort((a, b) => b.total_amount - a.total_amount);
}

function formatBrandingDescription(log: AdminAuditLogRow): string {
  const meta = log.meta || {};
  
  switch (log.action) {
    case "branding.updated": {
      // Handle trigger-based logging with changed_fields array
      if (Array.isArray(meta.changed_fields) && meta.changed_fields.length > 0) {
        const fields = meta.changed_fields as string[];
        const formatted = fields.map(f => String(f).replace(/_/g, ' ')).join(', ');
        return `Updated branding: ${formatted}`;
      }
      // Handle API-based logging with single field
      if (meta.field) {
        return `Updated branding: ${String(meta.field).replace(/_/g, ' ')}`;
      }
      return "Updated branding settings";
    }
    case "PUBLISH":
    case "portal.published":
      return "Published portal";
    case "UNPUBLISH":
    case "portal.unpublished":
      return "Unpublished portal";
    default:
      return log.action;
  }
}

/* =============================================================================
   AMENDED BUDGET QUERIES
============================================================================= */

export type AdoptedVsAmendedRow = {
  fiscal_year: number;
  department_name: string;
  adopted_amount: number;
  amended_amount: number;
  change_amount: number;
};

export async function getAdoptedVsAmendedForYear(
  year: number
): Promise<AdoptedVsAmendedRow[]> {
  const { data, error } = await supabase
    .from("v_budget_adopted_vs_amended")
    .select("*")
    .eq("fiscal_year", year)
    .order("adopted_amount", { ascending: false });

  if (error) {
    console.error("getAdoptedVsAmendedForYear error:", error);
    return [];
  }
  return (data ?? []) as AdoptedVsAmendedRow[];
}

export async function getAmendedBudgetYears(): Promise<number[]> {
  const { data, error } = await supabase
    .from("v_budget_types_by_year")
    .select("fiscal_year")
    .eq("budget_type", "amended");

  if (error) {
    console.error("getAmendedBudgetYears error:", error);
    return [];
  }
  const years = (data ?? []).map((r: { fiscal_year: number }) => r.fiscal_year);
  return [...new Set(years)].sort((a, b) => b - a);
}

/* =============================================================================
   PAGE VIEW TRACKING
============================================================================= */

export async function getPageViewSummary(days: number = 30): Promise<
  Array<{ page_path: string; view_count: number }>
> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("page_views")
    .select("page_path")
    .gte("created_at", since.toISOString());

  if (error) {
    console.error("getPageViewSummary error:", error);
    return [];
  }
  const counts = new Map<string, number>();
  for (const row of (data ?? [])) {
    counts.set(row.page_path, (counts.get(row.page_path) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([page_path, view_count]) => ({ page_path, view_count }))
    .sort((a, b) => b.view_count - a.view_count);
}

export async function getTotalPageViews(days: number = 30): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { count, error } = await supabase
    .from("page_views")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since.toISOString());

  if (error) {
    console.error("getTotalPageViews error:", error);
    return 0;
  }
  return count ?? 0;
}

/* =============================================================================
   CITIZEN FEEDBACK
============================================================================= */

export type CitizenFeedbackRow = {
  id: string;
  page_path: string | null;
  name: string | null;
  email: string | null;
  message: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
};

export async function getCitizenFeedback(
  status?: string
): Promise<CitizenFeedbackRow[]> {
  let query = supabase
    .from("citizen_feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getCitizenFeedback error:", error);
    return [];
  }
  return (data ?? []) as CitizenFeedbackRow[];
}
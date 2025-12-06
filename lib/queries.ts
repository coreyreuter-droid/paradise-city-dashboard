// lib/queries.ts
//
// Single source of truth for all Supabase reads.
// All shapes come from ./schema (canonical table schemas).

import { supabase } from "./supabase";
import type {
  ActualRow,
  BudgetRow,
  TransactionRow,
  RevenueRow,
} from "./schema";

// ---- Portal settings ----

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

  // Story blocks
  story_city_description: string | null;
  story_year_achievements: string | null;
  story_capital_projects: string | null;

  // Leadership
  leader_name: string | null;
  leader_title: string | null;
  leader_message: string | null;
  leader_photo_url: string | null;

  // Featured projects
  project1_title: string | null;
  project1_summary: string | null;
  project2_title: string | null;
  project2_summary: string | null;
  project3_title: string | null;
  project3_summary: string | null;
  project1_image_url: string | null;
  project2_image_url: string | null;
  project3_image_url: string | null;

  // City stats (landing page)
  stat_population: string | null;
  stat_employees: string | null;
  stat_square_miles: string | null;
  stat_annual_budget: string | null;

  // publish state
  is_published: boolean | null;

  // Content visibility toggles
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
    .eq("id", 1)
    .limit(1);

  if (error) {
    console.error("getPortalSettings error:", error);
    return null;
  }

  if (!data || data.length === 0) return null;
  return data[0] as PortalSettings;
}

// ---- Internal pagination helper ----

const PAGE_SIZE = 1000;

/**
 * Fetch all rows from a table, in PAGE_SIZE chunks, optionally applying filters.
 * This avoids the default 1000-row limit in PostgREST.
 */
async function fetchAllRows<T>(
  table: string,
  buildQuery?: (q: any) => any
): Promise<T[]> {
  const all: T[] = [];
  let page = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query: any = supabase.from(table).select("*");
    if (buildQuery) {
      query = buildQuery(query);
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await query.range(from, to);

    if (error) {
      console.error(`fetchAllRows error for table "${table}"`, error);
      throw error;
    }

    const chunk = (data ?? []) as T[];
    all.push(...chunk);

    if (chunk.length < PAGE_SIZE) {
      break; // last page
    }

    page += 1;
  }

  return all;
}

// --- Backwards-compatible helpers for existing pages ---
// These keep older imports working while we gradually migrate
// to the newer, more explicit helpers.

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

export type DepartmentBudgetActual = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number; // 0–100
};

/**
 * Get distinct fiscal years from budgets table (authoritative list of years).
 */
export async function getAvailableFiscalYears(): Promise<number[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select("fiscal_year")
    .order("fiscal_year", { ascending: true })
    .limit(10000); // defensive: avoid implicit 1000-row cap

  if (error) {
    console.error("getAvailableFiscalYears error:", error);
    throw error;
  }

  const years = (data ?? [])
    .map((row: any) => Number(row.fiscal_year))
    .filter((y) => Number.isFinite(y));

  // De-duplicate defensively
  return Array.from(new Set(years)).sort((a, b) => a - b);
}

/**
 * Raw budgets for a fiscal year.
 */
export async function getBudgetsForYear(
  fiscalYear: number
): Promise<BudgetRow[]> {
  return fetchAllRows<BudgetRow>("budgets", (q) =>
    q.eq("fiscal_year", fiscalYear)
  );
}

/**
 * Raw actuals for a fiscal year.
 */
export async function getActualsForYear(
  fiscalYear: number
): Promise<ActualRow[]> {
  return fetchAllRows<ActualRow>("actuals", (q) =>
    q.eq("fiscal_year", fiscalYear)
  );
}

/**
 * Raw revenues for a fiscal year.
 */
export async function getRevenuesForYear(
  fiscalYear: number
): Promise<RevenueRow[]> {
  return fetchAllRows<RevenueRow>("revenues", (q) =>
    q.eq("fiscal_year", fiscalYear)
  );
}

/**
 * Raw transactions for a fiscal year.
 */
export async function getTransactionsForYear(
  fiscalYear: number
): Promise<TransactionRow[]> {
  return fetchAllRows<TransactionRow>("transactions", (q) =>
    q.eq("fiscal_year", fiscalYear)
  );
}

/**
 * BvA summarized by department for a given fiscal year.
 * This is what the citywide BvA chart/table should be using.
 */
export async function getDepartmentBudgetVsActual(
  fiscalYear: number
): Promise<DepartmentBudgetActual[]> {
  const [budgets, actuals] = await Promise.all([
    getBudgetsForYear(fiscalYear),
    getActualsForYear(fiscalYear),
  ]);

  type Agg = { budget: number; actuals: number };

  const map = new Map<string, Agg>();

  const upsert = (dept: string | null, field: keyof Agg, amount: number) => {
    const key = (dept ?? "Unassigned").trim() || "Unassigned";
    const existing = map.get(key) ?? { budget: 0, actuals: 0 };
    existing[field] += amount;
    map.set(key, existing);
  };

  for (const row of budgets) {
    upsert(row.department_name, "budget", row.amount);
  }

  for (const row of actuals) {
    upsert(row.department_name, "actuals", row.amount);
  }

  const result: DepartmentBudgetActual[] = Array.from(map.entries()).map(
    ([department_name, agg]) => {
      const { budget, actuals } = agg;
      const percentSpent =
        budget > 0 ? Math.round((actuals / budget) * 100) : 0;

      return {
        department_name,
        budget,
        actuals,
        percentSpent,
      };
    }
  );

  // Sort by largest budget descending (or switch to actuals if you prefer)
  result.sort((a, b) => b.budget - a.budget);

  return result;
}

/**
 * Budget page: merged Budget + Actuals by department for a given fiscal year.
 * Same shape as DepartmentBudgetActual but separate type so you can evolve it.
 */
export type BudgetPageDepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number;
};

export async function getBudgetPageDepartmentSummaries(
  fiscalYear: number
): Promise<BudgetPageDepartmentSummary[]> {
  const [budgets, actuals] = await Promise.all([
    getBudgetsForYear(fiscalYear),
    getActualsForYear(fiscalYear),
  ]);

  type Agg = { budget: number; actuals: number };

  const map = new Map<string, Agg>();

  const upsert = (dept: string | null, field: keyof Agg, amount: number) => {
    const key = (dept ?? "Unassigned").trim() || "Unassigned";
    const current = map.get(key) ?? { budget: 0, actuals: 0 };
    current[field] += amount;
    map.set(key, current);
  };

  for (const row of budgets) {
    upsert(row.department_name, "budget", row.amount);
  }

  for (const row of actuals) {
    upsert(row.department_name, "actuals", row.amount);
  }

  const result: BudgetPageDepartmentSummary[] = Array.from(map.entries()).map(
    ([department_name, agg]) => {
      const { budget, actuals } = agg;
      const percentSpent =
        budget > 0 ? Math.round((actuals / budget) * 100) : 0;

      return {
        department_name,
        budget,
        actuals,
        percentSpent,
      };
    }
  );

  result.sort((a, b) => b.budget - a.budget);

  return result;
}

/**
 * Department-scoped helpers: fetch all years, but only for one department.
 * Used by /paradise/departments/[departmentName].
 */

export async function getBudgetsForDepartment(
  departmentName: string
): Promise<BudgetRow[]> {
  return fetchAllRows<BudgetRow>("budgets", (q) =>
    q.eq("department_name", departmentName)
  );
}

export async function getActualsForDepartment(
  departmentName: string
): Promise<ActualRow[]> {
  return fetchAllRows<ActualRow>("actuals", (q) =>
    q.eq("department_name", departmentName)
  );
}

export async function getTransactionsForDepartment(
  departmentName: string
): Promise<TransactionRow[]> {
  return fetchAllRows<TransactionRow>("transactions", (q) =>
    q.eq("department_name", departmentName)
  );
}

/**
 * Options for transaction listing; keep this small and focused.
 */
export type TransactionFilter = {
  fiscalYear: number;
  departmentName?: string;
  fundCode?: string;
  accountCode?: string;
  vendorSearch?: string; // ILIKE '%foo%'
  descriptionSearch?: string; // ILIKE '%bar%'
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
};

/**
 * Fetch transactions with common filters. Use this for the Transactions tab.
 * This intentionally returns a single page, not all rows.
 */
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
    .order("date", { ascending: true });

  if (departmentName) {
    query = query.eq("department_name", departmentName);
  }

  if (fundCode) {
    query = query.eq("fund_code", fundCode);
  }

  if (accountCode) {
    query = query.eq("account_code", accountCode);
  }

  if (vendorSearch && vendorSearch.trim().length > 0) {
    query = query.ilike("vendor", `%${vendorSearch.trim()}%`);
  }

  if (descriptionSearch && descriptionSearch.trim().length > 0) {
    query = query.ilike("description", `%${descriptionSearch.trim()}%`);
  }

  if (typeof minAmount === "number") {
    query = query.gte("amount", minAmount);
  }

  if (typeof maxAmount === "number") {
    query = query.lte("amount", maxAmount);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("getTransactions error:", error);
    throw error;
  }

  return (data ?? []) as TransactionRow[];
}

// ---- Transactions helpers for existing pages ----

export type TransactionsPageResult = {
  rows: TransactionRow[];
  totalCount: number;
};

/**
 * Get all distinct fiscal years seen across budgets, actuals, and transactions.
 * Used by the Transactions page year dropdown.
 */
export async function getTransactionYears(): Promise<number[]> {
  const [budgetsRes, actualsRes, txRes] = await Promise.all([
    supabase.from("budgets").select("fiscal_year").limit(10000),
    supabase.from("actuals").select("fiscal_year").limit(10000),
    supabase.from("transactions").select("fiscal_year").limit(10000),
  ]);

  const allErrors = [budgetsRes.error, actualsRes.error, txRes.error].filter(
    Boolean
  );
  if (allErrors.length > 0) {
    console.error("Error fetching transaction years", allErrors);
  }

  const set = new Set<number>();

  (budgetsRes.data ?? []).forEach((row: any) => {
    const year = Number(row.fiscal_year);
    if (Number.isFinite(year)) set.add(year);
  });

  (actualsRes.data ?? []).forEach((row: any) => {
    const year = Number(row.fiscal_year);
    if (Number.isFinite(year)) set.add(year);
  });

  (txRes.data ?? []).forEach((row: any) => {
    const year = Number(row.fiscal_year);
    if (Number.isFinite(year)) set.add(year);
  });

  // Sort newest first (matches typical UI expectation)
  return Array.from(set).sort((a, b) => b - a);
}

/**
 * Get distinct fiscal years from revenues table.
 * Used by Revenue Explorer (once we build it).
 */
export async function getRevenueYears(): Promise<number[]> {
  const { data, error } = await supabase
    .from("revenues")
    .select("fiscal_year")
    .limit(10000);

  if (error) {
    console.error("Error fetching revenue years", error);
    return [];
  }

  const set = new Set<number>();

  (data ?? []).forEach((row: any) => {
    const year = Number(row.fiscal_year);
    if (Number.isFinite(year)) set.add(year);
  });

  return Array.from(set).sort((a, b) => b - a);
}

/**
 * Get distinct department names that appear in transactions for a given year.
 * Used for the department filter on the Transactions page.
 */
export async function getTransactionDepartmentsForYear(
  fiscalYear: number
): Promise<string[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("department_name")
    .eq("fiscal_year", fiscalYear)
    .limit(10000);

  if (error) {
    console.error("Error fetching transaction departments", {
      fiscalYear,
      error,
    });
    return [];
  }

  const set = new Set<string>();

  (data ?? []).forEach((row: any) => {
    const raw = row.department_name as string | null;
    const name = raw && raw.length > 0 ? raw : "Unspecified";
    set.add(name);
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Paged transactions with year/department/vendor filters.
 * This is what the TransactionsDashboardClient expects.
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
    .select("*", { count: "exact" });

  if (fiscalYear) {
    query = query.eq("fiscal_year", fiscalYear);
  }

  if (department && department !== "all") {
    query = query.eq("department_name", department);
  }

  // ILIKE search on vendor + description
  if (vendorQuery && vendorQuery.trim().length > 0) {
    const q = `%${vendorQuery.trim()}%`;
    query = query.or(`vendor.ilike.${q},description.ilike.${q}`);
  }

  // 1-based page -> 0-based offset
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order("date", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching paged transactions", {
      options,
      error,
    });
    return { rows: [], totalCount: 0 };
  }

  return {
    rows: (data ?? []) as TransactionRow[],
    totalCount: count ?? 0,
  };
}

/**
 * Fetch upload audit log entries (if you have a data_uploads table).
 * Safe helper so you don't rewrite this in multiple places.
 */
export type DataUploadLogRow = {
  id: number;
  created_at: string;
  table_name: string;
  mode: "append" | "replace_year" | "replace_table";
  row_count: number;
  fiscal_year: number | null;
  filename: string | null;
  admin_identifier: string | null; // email or user id of uploader
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

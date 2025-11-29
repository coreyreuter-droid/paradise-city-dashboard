// lib/queries.ts
import { supabase } from "./supabase";
import type { BudgetRow, ActualRow, TransactionRow } from "./types";

const PAGE_SIZE = 1000;

/**
 * Page through a Supabase table in chunks of PAGE_SIZE until no more rows.
 */
async function fetchAllPaged<T>(
  table: string,
  select: string
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  // Loop until we hit an empty page
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, to);

    if (error) {
      console.error("Error in fetchAllPaged", {
        table,
        select,
        error,
      });
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    all.push(...(data as T[]));

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return all;
}

// ========= Budgets / Actuals =========

export async function getAllBudgets(): Promise<BudgetRow[]> {
  return fetchAllPaged<BudgetRow>(
    "budgets",
    "fiscal_year, department_name, amount"
  );
}

export async function getAllActuals(): Promise<ActualRow[]> {
  return fetchAllPaged<ActualRow>(
    "actuals",
    "fiscal_year, department_name, amount"
  );
}

export async function getBudgetsForYear(
  fiscalYear: number
): Promise<BudgetRow[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select("fiscal_year, department_name, amount")
    .eq("fiscal_year", fiscalYear);

  if (error) {
    console.error("Error fetching budgets for year", {
      fiscalYear,
      error,
    });
    return [];
  }

  return (data ?? []) as BudgetRow[];
}

export async function getActualsForYear(
  fiscalYear: number
): Promise<ActualRow[]> {
  const { data, error } = await supabase
    .from("actuals")
    .select("fiscal_year, department_name, amount")
    .eq("fiscal_year", fiscalYear);

  if (error) {
    console.error("Error fetching actuals for year", {
      fiscalYear,
      error,
    });
    return [];
  }

  return (data ?? []) as ActualRow[];
}

// ========= Transactions =========

export async function getAllTransactions(): Promise<TransactionRow[]> {
  return fetchAllPaged<TransactionRow>(
    "transactions",
    "date, fiscal_year, fund_name, department_name, vendor, description, amount"
  );
}

export async function getTransactionsForYear(
  fiscalYear: number
): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "date, fiscal_year, fund_name, department_name, vendor, description, amount"
    )
    .eq("fiscal_year", fiscalYear)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions for year", {
      fiscalYear,
      error,
    });
    return [];
  }

  return (data ?? []) as TransactionRow[];
}

// ---- Transactions pagination + helpers ----

export type TransactionsPageResult = {
  rows: TransactionRow[];
  totalCount: number;
};

export async function getTransactionYears(): Promise<number[]> {
  // Collect distinct fiscal_year values from budgets, actuals, and transactions
  const [budgetsRes, actualsRes, txRes] = await Promise.all([
    supabase.from("budgets").select("fiscal_year"),
    supabase.from("actuals").select("fiscal_year"),
    supabase.from("transactions").select("fiscal_year"),
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

  return Array.from(set).sort((a, b) => b - a);
}

export async function getTransactionDepartmentsForYear(
  fiscalYear: number
): Promise<string[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("department_name")
    .eq("fiscal_year", fiscalYear);

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
    const name =
      raw && raw.length > 0 ? raw : "Unspecified";
    set.add(name);
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function getTransactionsPage(options: {
  fiscalYear?: number;
  department?: string;
  vendorQuery?: string;
  page: number;
  pageSize: number;
}): Promise<TransactionsPageResult> {
  const {
    fiscalYear,
    department,
    vendorQuery,
    page,
    pageSize,
  } = options;

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
    query = query.or(
      `vendor.ilike.${q},description.ilike.${q}`
    );
  }

  // 1-based page -> 0-based offset
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order("date", { ascending: false })
    .range(from, to);

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

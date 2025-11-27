// lib/queries.ts
import { supabase } from "./supabase";
import type { BudgetRow, ActualRow, TransactionRow } from "./types";

const PAGE_SIZE = 1000;

/**
 * Generic helper to page through a Supabase table in chunks of PAGE_SIZE.
 * This matches what you were doing inline in analytics/budget.
 */
async function fetchAllPaged<T>(
  table: string,
  select: string
): Promise<T[]> {
  const all: T[] = [];
  let page = 0;

  for (;;) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, to);

    if (error) {
      console.error(`Error fetching from ${table}`, { page, error });
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    all.push(...(data as T[]));

    if (data.length < PAGE_SIZE) {
      break; // last page
    }

    page += 1;
  }

  return all;
}

// ---- Public query functions ----

// All budget rows (all years, all departments)
export async function getAllBudgets(): Promise<BudgetRow[]> {
  return fetchAllPaged<BudgetRow>(
    "budgets",
    "fiscal_year, department_name, amount"
  );
}

// All actual rows (all years, all departments)
export async function getAllActuals(): Promise<ActualRow[]> {
  return fetchAllPaged<ActualRow>(
    "actuals",
    "fiscal_year, department_name, amount"
  );
}

// All transactions (all years, all fields)
// Used for analytics / top vendors, etc.
export async function getAllTransactions(): Promise<TransactionRow[]> {
  return fetchAllPaged<TransactionRow>(
    "transactions",
    "date, fiscal_year, fund_name, department_name, vendor, description, amount"
  );
}

// Transactions for a single fiscal year (used by transactions page if needed)
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

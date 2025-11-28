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
      console.error("Error in fetchAllPaged", { table, select, error });
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
    console.error("Error fetching budgets for year", { fiscalYear, error });
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
    console.error("Error fetching actuals for year", { fiscalYear, error });
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

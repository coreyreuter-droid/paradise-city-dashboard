import { supabase } from "../../../lib/supabase";
import CitywideDashboardClient from "@/components/City/CitywideDashboardClient";

type BudgetRow = {
  fiscal_year: number;
  department_name: string | null;
  amount: number;
};

type ActualRow = BudgetRow;

type TransactionRow = {
  fiscal_year: number;
  department_name: string | null;
  vendor: string | null;
  amount: number;
};

/**
 * Fetch all rows from `actuals` in pages of 1000
 * to avoid Supabase's max-rows-per-request limit.
 */
async function fetchAllActuals(): Promise<ActualRow[]> {
  const pageSize = 1000;
  const all: ActualRow[] = [];
  let page = 0;

  for (;;) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("actuals")
      .select("fiscal_year, department_name, amount")
      .range(from, to);

    if (error) {
      console.error("Analytics – actuals page error", { page, error });
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    all.push(...(data as ActualRow[]));

    if (data.length < pageSize) {
      break; // last page
    }

    page += 1;
  }

  return all;
}

/**
 * Fetch all rows from `transactions` in pages of 1000
 * so analytics isn't biased toward earlier years.
 */
async function fetchAllTransactions(): Promise<TransactionRow[]> {
  const pageSize = 1000;
  const all: TransactionRow[] = [];
  let page = 0;

  for (;;) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("transactions")
      .select("fiscal_year, department_name, vendor, amount")
      .range(from, to);

    if (error) {
      console.error("Analytics – transactions page error", { page, error });
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    all.push(...(data as TransactionRow[]));

    if (data.length < pageSize) {
      break; // last page
    }

    page += 1;
  }

  return all;
}

export default async function AnalyticsPage() {
  const [{ data: budgetRows, error: budgetError }, actualRows, transactions] =
    await Promise.all([
      supabase
        .from("budgets")
        .select("fiscal_year, department_name, amount"),
      fetchAllActuals(),
      fetchAllTransactions(),
    ]);

  if (budgetError) {
    console.error("Analytics – budgets error", budgetError);
  }

  const budgets: BudgetRow[] = budgetRows ?? [];
  const actuals: ActualRow[] = actualRows ?? [];

  return (
    <CitywideDashboardClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
    />
  );
}

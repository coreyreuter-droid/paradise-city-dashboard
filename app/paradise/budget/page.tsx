import { supabase } from "../../../lib/supabase";
import BudgetClient from "@/components/Budget/BudgetClient";

type RawRow = {
  fiscal_year: number;
  department_name: string | null;
  amount: number;
};

/**
 * Fetch all rows from `actuals` in pages of 1000
 * to avoid Supabase's max-rows-per-request limit.
 */
async function fetchAllActuals(): Promise<RawRow[]> {
  const pageSize = 1000;
  const all: RawRow[] = [];
  let page = 0;

  for (;;) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("actuals")
      .select("fiscal_year, department_name, amount")
      .range(from, to);

    if (error) {
      console.error("Budget page – actuals page error", { page, error });
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    all.push(...(data as RawRow[]));

    if (data.length < pageSize) {
      break; // last page
    }

    page += 1;
  }

  return all;
}

export default async function BudgetPage() {
  const [{ data: budgetRows, error: budgetError }, actualRows] =
    await Promise.all([
      supabase
        .from("budgets")
        .select("fiscal_year, department_name, amount"),
      fetchAllActuals(),
    ]);

  if (budgetError) {
    console.error("Budget page – budgets error", budgetError);
  }

  const budgets: RawRow[] = (budgetRows ?? []) as RawRow[];
  const actuals: RawRow[] = actualRows ?? [];

  return <BudgetClient budgets={budgets} actuals={actuals} />;
}

// app/paradise/analytics/page.tsx
import CitywideDashboardClient from "@/components/City/CitywideDashboardClient";
import {
  getAllBudgets,
  getAllActuals,
  getAllTransactions,
  getAvailableFiscalYears,
  getTransactionsForYear,
} from "../../../lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "../../../lib/types";

export const revalidate = 0; // always hit Supabase; change if you want caching

type PageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function AnalyticsPage(props: PageProps) {
  const searchParams = await props.searchParams;

  // Get authoritative list of fiscal years from budgets
  const yearsAsc = await getAvailableFiscalYears();
  const yearsDesc = [...yearsAsc].sort((a, b) => b - a);

  let selectedYear: number | undefined;

  if (yearsDesc.length > 0) {
    const param = searchParams["year"];
    const raw =
      typeof param === "string" ? param : Array.isArray(param) ? param[0] : "";
    const parsed = raw ? Number(raw) : NaN;

    if (Number.isFinite(parsed) && yearsDesc.includes(parsed)) {
      selectedYear = parsed;
    } else {
      selectedYear = yearsDesc[0]; // default to latest year
    }
  }

  // Budgets + actuals: still multi-year so YOY features work as before.
  // Transactions: now scoped to a single fiscal year for perf.
  const [budgetsRaw, actualsRaw, transactionsRaw] = await Promise.all([
    getAllBudgets(),
    getAllActuals(),
    selectedYear
      ? getTransactionsForYear(selectedYear)
      : getAllTransactions(),
  ]);

  const budgets: BudgetRow[] = budgetsRaw ?? [];
  const actuals: ActualRow[] = actualsRaw ?? [];
  const transactions: TransactionRow[] = transactionsRaw ?? [];

  return (
    <CitywideDashboardClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
    />
  );
}

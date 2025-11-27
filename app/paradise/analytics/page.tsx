import CitywideDashboardClient from "@/components/City/CitywideDashboardClient";
import {
  getAllBudgets,
  getAllActuals,
  getAllTransactions,
} from "../../../lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "../../../lib/types";

export const revalidate = 0; // optional: always fetch fresh data

export default async function AnalyticsPage() {
  // Fetch all data in parallel
  const [budgetsRaw, actualsRaw, transactionsRaw] = await Promise.all([
    getAllBudgets(),
    getAllActuals(),
    getAllTransactions(),
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

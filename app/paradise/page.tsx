// app/paradise/page.tsx

import ParadiseHomeClient from "@/components/City/ParadiseHomeClient";
import {
  getAllBudgets,
  getAllActuals,
  getAllTransactions,
  getTransactionYears,
  getPortalSettings,
} from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";

export const revalidate = 0;

export default async function ParadisePage() {
  const [budgetsRaw, actualsRaw, transactionsRaw, years, settings] =
    await Promise.all([
      getAllBudgets(),
      getAllActuals(),
      getAllTransactions(),
      getTransactionYears(),
      getPortalSettings(),
    ]);

  const budgets = (budgetsRaw ?? []) as BudgetRow[];
  const actuals = (actualsRaw ?? []) as ActualRow[];
  const transactions = (transactionsRaw ?? []) as TransactionRow[];

  return (
    <ParadiseHomeClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
      availableYears={years}
      portalSettings={settings}
    />
  );
}

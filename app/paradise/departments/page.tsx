// app/paradise/departments/page.tsx
import DepartmentsDashboardClient from "@/components/City/DepartmentsDashboardClient";
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

export const revalidate = 0;

export default async function DepartmentsPage() {
  const [budgetsRaw, actualsRaw, transactionsRaw] = await Promise.all([
    getAllBudgets(),
    getAllActuals(),
    getAllTransactions(),
  ]);

  const budgets: BudgetRow[] = budgetsRaw ?? [];
  const actuals: ActualRow[] = actualsRaw ?? [];
  const transactions: TransactionRow[] = transactionsRaw ?? [];

  return (
    <DepartmentsDashboardClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
    />
  );
}

// app/paradise/departments/[departmentName]/page.tsx
import {
  getAllBudgets,
  getAllActuals,
  getAllTransactions,
} from "../../../../lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "../../../../lib/types";
import DepartmentDetailClient from "@/components/City/DepartmentDetailClient";

// Next is giving you params as a Promise, so allow both shapes.
type PageProps = {
  params:
    | { departmentName: string }
    | Promise<{ departmentName: string }>;
};

export const revalidate = 0;

export default async function DepartmentDetailPage(props: PageProps) {
  // Works whether props.params is already an object or a Promise
  const params = await props.params;
  const decodedName = decodeURIComponent(params.departmentName);

  const [budgetsRaw, actualsRaw, transactionsRaw] = await Promise.all([
    getAllBudgets(),
    getAllActuals(),
    getAllTransactions(),
  ]);

  const budgets: BudgetRow[] = budgetsRaw ?? [];
  const actuals: ActualRow[] = actualsRaw ?? [];
  const transactions: TransactionRow[] = transactionsRaw ?? [];

  return (
    <DepartmentDetailClient
      departmentName={decodedName}
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
    />
  );
}

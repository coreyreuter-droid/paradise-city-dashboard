// app/paradise/departments/[departmentName]/page.tsx
import {
  getBudgetsForDepartment,
  getActualsForDepartment,
  getTransactionsForDepartment,
} from "../../../../lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "../../../../lib/types";
import DepartmentDetailClient from "@/components/City/DepartmentDetailClient";

// Next now hands params/searchParams as Promises in RSC.
// We accept them but only use params; the client handles ?year=
type PageProps = {
  params: Promise<{ departmentName: string }>;
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export const revalidate = 0;

export default async function DepartmentDetailPage(props: PageProps) {
  const { departmentName } = await props.params;
  const decodedName = decodeURIComponent(departmentName);

  // Fetch ONLY this department's data across all years
  const [budgetsRaw, actualsRaw, transactionsRaw] = await Promise.all([
    getBudgetsForDepartment(decodedName),
    getActualsForDepartment(decodedName),
    getTransactionsForDepartment(decodedName),
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

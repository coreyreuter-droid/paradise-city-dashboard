// app/paradise/departments/page.tsx
import DepartmentsDashboardClient from "@/components/City/DepartmentsDashboardClient";
import {
  getAvailableFiscalYears,
  getBudgetsForYear,
  getActualsForYear,
  getTransactionsForYear,
} from "../../../lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "../../../lib/types";

export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function DepartmentsPage(props: PageProps) {
  const searchParams = await props.searchParams;

  // All years (authoritative from budgets)
  const yearsAsc = await getAvailableFiscalYears();
  const years = [...yearsAsc].sort((a, b) => b - a); // newest first

  let selectedYear: number | undefined;

  if (years.length > 0) {
    const param = searchParams["year"];
    const raw =
      typeof param === "string" ? param : Array.isArray(param) ? param[0] : "";
    const parsed = raw ? Number(raw) : NaN;

    if (Number.isFinite(parsed) && years.includes(parsed)) {
      selectedYear = parsed;
    } else {
      selectedYear = years[0]; // default to latest
    }
  }

  if (!selectedYear) {
    // No data at all – pass empty arrays
    return (
      <DepartmentsDashboardClient
        budgets={[]}
        actuals={[]}
        transactions={[]}
        years={[]}
      />
    );
  }

  // Fetch only the selected year's data
  const [budgetsRaw, actualsRaw, transactionsRaw] = await Promise.all([
    getBudgetsForYear(selectedYear),
    getActualsForYear(selectedYear),
    getTransactionsForYear(selectedYear),
  ]);

  const budgets: BudgetRow[] = budgetsRaw ?? [];
  const actuals: ActualRow[] = actualsRaw ?? [];
  const transactions: TransactionRow[] = transactionsRaw ?? [];

  return (
    <DepartmentsDashboardClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
      years={years}
    />
  );
}

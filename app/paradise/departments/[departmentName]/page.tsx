// app/paradise/departments/[departmentName]/page.tsx
import {
  getAllBudgets,
  getAllActuals,
  getTransactionsPage,
} from "../../../../lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "../../../../lib/types";
import DepartmentDetailClient from "@/components/City/DepartmentDetailClient";

export const revalidate = 0;

const PAGE_SIZE = 25;

type PageProps = {
  params:
    | { departmentName: string }
    | Promise<{ departmentName: string }>;
  searchParams?: {
    year?: string;
    page?: string;
  };
};

const normalizeName = (name: string | null | undefined) =>
  (name ?? "").trim().toLowerCase();

export default async function DepartmentDetailPage(
  props: PageProps
) {
  // Works whether props.params is already an object or a Promise
  const params = await props.params;
  const decodedName = decodeURIComponent(
    params.departmentName
  );

  const search = props.searchParams ?? {};

  // Fetch all budgets + actuals once (small-ish tables)
  const [budgetsRaw, actualsRaw] = await Promise.all([
    getAllBudgets(),
    getAllActuals(),
  ]);

  const budgets: BudgetRow[] = budgetsRaw ?? [];
  const actuals: ActualRow[] = actualsRaw ?? [];

  // Determine which years this department appears in
  const normalizedDept = normalizeName(decodedName);

  const deptBudgets = budgets.filter(
    (b) => normalizeName(b.department_name) === normalizedDept
  );
  const deptActuals = actuals.filter(
    (a) => normalizeName(a.department_name) === normalizedDept
  );

  const deptYearsSet = new Set<number>();
  deptBudgets.forEach((b) => deptYearsSet.add(b.fiscal_year));
  deptActuals.forEach((a) => deptYearsSet.add(a.fiscal_year));
  const deptYears = Array.from(deptYearsSet).sort(
    (a, b) => b - a
  );

  // Pick selected year (same logic as client: URL param if valid, else latest)
  let selectedYear: number | undefined;
  if (deptYears.length === 0) {
    selectedYear = undefined;
  } else {
    const paramYear = search.year
      ? Number(search.year)
      : NaN;
    if (
      Number.isFinite(paramYear) &&
      deptYears.includes(paramYear)
    ) {
      selectedYear = paramYear;
    } else {
      selectedYear = deptYears[0];
    }
  }

  // Page (1-based)
  const pageParam = search.page
    ? Number(search.page)
    : 1;
  const page =
    Number.isFinite(pageParam) && pageParam > 0
      ? pageParam
      : 1;

  let transactions: TransactionRow[] = [];
  let totalTxForYear = 0;

  if (selectedYear != null) {
    const { rows, totalCount } = await getTransactionsPage({
      fiscalYear: selectedYear,
      department: decodedName,
      vendorQuery: undefined,
      page,
      pageSize: PAGE_SIZE,
    });

    transactions = rows ?? [];
    totalTxForYear = totalCount ?? 0;
  }

  return (
    <DepartmentDetailClient
      departmentName={decodedName}
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
      totalTxForYear={totalTxForYear}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}

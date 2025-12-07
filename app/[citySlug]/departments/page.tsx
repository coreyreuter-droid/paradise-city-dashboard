import { notFound } from "next/navigation";
import DepartmentsDashboardClient from "@/components/City/DepartmentsDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getAvailableFiscalYears,
  getBudgetsForYear,
  getActualsForYear,
  getTransactionsForYear,
  getPortalSettings,
} from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";

export const revalidate = 0;

type SearchParamsShape = {
  year?: string | string[];
};

type PageProps = {
  params: { citySlug: string };
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

function pickFirst(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

export default async function DepartmentsPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;

  const [availableYearsRaw, settings] = await Promise.all([
    getAvailableFiscalYears(),
    getPortalSettings(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  // Strict actuals gating for Departments:
  // - Departments UI is an actuals-driven module
  // - When enable_actuals is explicitly false, this route must 404
  const enableActuals =
    portalSettings?.enable_actuals === null ||
    portalSettings?.enable_actuals === undefined
      ? true
      : !!portalSettings.enable_actuals;

  if (portalSettings && !enableActuals) {
    notFound();
  }

  const enableTransactions =
    portalSettings?.enable_transactions === true;

  const years = (availableYearsRaw ?? [])
    .map((y) => Number(y))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);

  const yearParam = pickFirst(resolvedSearchParams.year);
  const parsedYear = yearParam ? Number(yearParam) : NaN;

  const selectedYear =
    Number.isFinite(parsedYear) && years.includes(parsedYear)
      ? parsedYear
      : years.length > 0
      ? years[0]
      : undefined;

  let budgets: BudgetRow[] = [];
  let actuals: ActualRow[] = [];
  let transactions: TransactionRow[] = [];

  if (selectedYear != null) {
    const [budgetsRaw, actualsRaw, transactionsRaw] = await Promise.all([
      getBudgetsForYear(selectedYear),
      getActualsForYear(selectedYear),
      getTransactionsForYear(selectedYear),
    ]);

    budgets = (budgetsRaw ?? []) as BudgetRow[];
    actuals = (actualsRaw ?? []) as ActualRow[];
    transactions = (transactionsRaw ?? []) as TransactionRow[];
  }

  return (
    <DepartmentsDashboardClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
      years={years}
      enableTransactions={enableTransactions}
    />
  );
}

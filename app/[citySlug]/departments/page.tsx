// app/[citySlug]/departments/page.tsx
import { notFound } from "next/navigation";
import DepartmentsDashboardClient from "@/components/City/DepartmentsDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getAvailableFiscalYears,
  getBudgetsForYear,
  getActualsForYear,
  getDepartmentTransactionSummariesForYear,
  getPortalSettings,
} from "@/lib/queries";
import type { BudgetRow, ActualRow } from "@/lib/types";
import type { PortalSettings, DepartmentYearTxSummary } from "@/lib/queries";

export const revalidate = 60;

type SearchParamsShape = {
  year?: string | string[];
};

type PageProps = {
  params: { citySlug: string };
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

export default async function DepartmentsPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const [availableYearsRaw, settings] = await Promise.all([
    getAvailableFiscalYears(),
    getPortalSettings(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const enableActuals =
    portalSettings?.enable_actuals === null ||
    portalSettings?.enable_actuals === undefined
      ? true
      : !!portalSettings.enable_actuals;

  if (portalSettings && !enableActuals) {
    notFound();
  }

  const enableTransactions = portalSettings?.enable_transactions === true;

  const years = (availableYearsRaw ?? [])
    .map((y) => Number(y))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);

  const yearParam = pickFirst(sp?.year);
  const parsedYear = yearParam ? Number(yearParam) : NaN;

  const selectedYear =
    Number.isFinite(parsedYear) && years.includes(parsedYear)
      ? parsedYear
      : years.length > 0
      ? years[0]
      : undefined;

  let budgets: BudgetRow[] = [];
  let actuals: ActualRow[] = [];
  let txSummaries: DepartmentYearTxSummary[] = [];

  if (selectedYear != null) {
    const [budgetsRaw, actualsRaw, txSummariesRaw] = await Promise.all([
      getBudgetsForYear(selectedYear),
      getActualsForYear(selectedYear),
      enableTransactions
        ? getDepartmentTransactionSummariesForYear(selectedYear)
        : Promise.resolve([]),
    ]);

    budgets = (budgetsRaw ?? []) as BudgetRow[];
    actuals = (actualsRaw ?? []) as ActualRow[];
    txSummaries = (txSummariesRaw ?? []) as DepartmentYearTxSummary[];
  }

  return (
    <DepartmentsDashboardClient
      budgets={budgets}
      actuals={actuals}
      txSummaries={txSummaries}
      years={years}
      enableTransactions={enableTransactions}
    />
  );
}

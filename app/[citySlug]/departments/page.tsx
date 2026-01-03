// app/[citySlug]/departments/page.tsx
import { notFound } from "next/navigation";
import DepartmentsDashboardClient from "@/components/City/DepartmentsDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import DataFreshness from "@/components/DataFreshness";
import {
  getPortalFiscalYears,
  getBudgetActualsSummaryForYear,
  getDepartmentTransactionSummariesForYear,
  getPortalSettings,
  getDataUploadLogs,
} from "@/lib/queries";
import type { PortalSettings, DepartmentYearTxSummary, BudgetActualsYearDeptRow, DataUploadLogRow } from "@/lib/queries";

export const revalidate = 60;

type SearchParamsShape = {
  year?: string | string[];
  q?: string | string[];
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

  const [yearsRaw, settings, uploadLogsRaw] = await Promise.all([
    getPortalFiscalYears(),
    getPortalSettings(),
    getDataUploadLogs(),
  ]);

  const portalSettings = settings as PortalSettings | null;
  const uploadLogs = (uploadLogsRaw ?? []) as DataUploadLogRow[];

  // Get most recent budget or actuals upload
  const deptLogs = uploadLogs.filter(
    (log) => log.table_name === "budgets" || log.table_name === "actuals"
  );
  const lastUploadAt = deptLogs.length > 0
    ? deptLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
    : null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const enableActuals =
    portalSettings?.enable_actuals === null || portalSettings?.enable_actuals === undefined
      ? true
      : !!portalSettings.enable_actuals;

  if (portalSettings && !enableActuals) {
    notFound();
  }

  const enableTransactions = portalSettings?.enable_transactions === true;

  const years = (yearsRaw ?? []).slice().sort((a, b) => b - a);

  const yearParam = pickFirst(sp?.year);
  const parsedYear = yearParam ? Number(yearParam) : NaN;
  const searchQuery = pickFirst(sp?.q) ?? null;

  const selectedYear =
    Number.isFinite(parsedYear) && years.includes(parsedYear)
      ? parsedYear
      : years.length > 0
      ? years[0]
      : undefined;

  let deptBudgetActuals: BudgetActualsYearDeptRow[] = [];
  let txSummaries: DepartmentYearTxSummary[] = [];

  if (selectedYear != null) {
    const [deptRows, txSummariesRaw] = await Promise.all([
      getBudgetActualsSummaryForYear(selectedYear),
      enableTransactions
        ? getDepartmentTransactionSummariesForYear(selectedYear)
        : Promise.resolve([]),
    ]);

    deptBudgetActuals = (deptRows ?? []) as BudgetActualsYearDeptRow[];
    txSummaries = (txSummariesRaw ?? []) as DepartmentYearTxSummary[];
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-end">
        <DataFreshness lastUploadAt={lastUploadAt} />
      </div>
      <DepartmentsDashboardClient
        deptBudgetActuals={deptBudgetActuals}
        txSummaries={txSummaries}
        years={years}
        enableTransactions={enableTransactions}
        searchQuery={searchQuery}
      />
    </>
  );
}

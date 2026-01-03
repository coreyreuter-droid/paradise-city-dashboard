// app/[citySlug]/budget/page.tsx
import BudgetClient from "@/components/Budget/BudgetClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import DataFreshness from "@/components/DataFreshness";
import {
  getPortalFiscalYears,
  getBudgetActualsSummaryForYear,
  getPortalSettings,
  getDataUploadLogs,
} from "@/lib/queries";
import type { PortalSettings, BudgetActualsYearDeptRow, DataUploadLogRow } from "@/lib/queries";

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

export default async function BudgetPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const [yearsRaw, settings, uploadLogsRaw] = await Promise.all([
    getPortalFiscalYears(),
    getPortalSettings(),
    getDataUploadLogs(),
  ]);

  const portalSettings = settings as PortalSettings | null;
  const uploadLogs = (uploadLogsRaw ?? []) as DataUploadLogRow[];

  // Get most recent budget or actuals upload
  const budgetLogs = uploadLogs.filter(
    (log) => log.table_name === "budgets" || log.table_name === "actuals"
  );
  const lastUploadAt = budgetLogs.length > 0
    ? budgetLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
    : null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const years = (yearsRaw ?? []).slice().sort((a, b) => b - a);

  const yearParam = pickFirst(sp?.year);
  const parsedYear = yearParam ? Number(yearParam) : NaN;

  const selectedYear =
    Number.isFinite(parsedYear) && years.includes(parsedYear)
      ? parsedYear
      : years.length > 0
      ? years[0]
      : undefined;

  let deptBudgetActuals: BudgetActualsYearDeptRow[] = [];

  if (selectedYear != null) {
    const rows = await getBudgetActualsSummaryForYear(selectedYear);
    deptBudgetActuals = (rows ?? []) as BudgetActualsYearDeptRow[];
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-end">
        <DataFreshness lastUploadAt={lastUploadAt} />
      </div>
      <BudgetClient years={years} deptBudgetActuals={deptBudgetActuals} />
    </>
  );
}

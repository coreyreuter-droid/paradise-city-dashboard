// app/[citySlug]/departments/page.tsx
import type { Metadata } from "next";
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
  getAdoptedVsAmendedForYear,
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


export async function generateMetadata(): Promise<Metadata> {
  const ps = await getPortalSettings();
  const city = ps?.city_name?.trim() || "Our City";
  return {
    title: `Spending – ${city} Financial Transparency`,
    description: `See how ${city} allocates and spends public funds across departments.`,
  };
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
    const [deptRows, txSummariesRaw, amendedRows] = await Promise.all([
      getBudgetActualsSummaryForYear(selectedYear),
      enableTransactions
        ? getDepartmentTransactionSummariesForYear(selectedYear)
        : Promise.resolve([]),
      getAdoptedVsAmendedForYear(selectedYear),
    ]);

    deptBudgetActuals = (deptRows ?? []) as BudgetActualsYearDeptRow[];
    txSummaries = (txSummariesRaw ?? []) as DepartmentYearTxSummary[];

    // If amended data exists, use amended amounts instead of adopted
    const amended = (amendedRows ?? []).filter((r) => Number(r.amended_amount || 0) > 0);
    if (amended.length > 0) {
      const amendedMap = new Map(amended.map((r) => [r.department_name, Number(r.amended_amount)]));
      deptBudgetActuals = deptBudgetActuals.map((row) => {
        const amendedAmt = amendedMap.get(row.department_name ?? "");
        if (amendedAmt != null) {
          return { ...row, budget_amount: amendedAmt };
        }
        return row;
      });
    }
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

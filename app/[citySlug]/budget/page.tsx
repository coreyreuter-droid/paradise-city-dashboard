// app/[citySlug]/budget/page.tsx
import BudgetPageClient from "@/components/Budget/BudgetPageClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import DataFreshness from "@/components/DataFreshness";
import {
  getPortalSettings,
  getBudgetOnlyYears,
  getBudgetVsActualYears,
  getBudgetActualsSummaryForYear,
  getBudgetActualsByFundForYear,
  getBudgetActualsByFundDeptForYear,
  getDataUploadLogs,
  getActualOnlyYears,
  getAdoptedVsAmendedForYear,
} from "@/lib/queries";
import type {
  PortalSettings,
  BudgetActualsYearDeptRow,
  BudgetActualsYearFundRow,
  BudgetActualsYearFundDeptRow,
  DataUploadLogRow,
  AdoptedVsAmendedRow,
} from "@/lib/queries";

export const revalidate = 60;

type SearchParamsShape = {
  year?: string | string[];
  view?: string | string[];
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

  const [settings, budgetYearsRaw, bvaYearsRaw, actualYearsRaw, uploadLogsRaw] =
    await Promise.all([
      getPortalSettings(),
      getBudgetOnlyYears(),
      getBudgetVsActualYears(),
      getActualOnlyYears(),
      getDataUploadLogs(),
    ]);

  const portalSettings = settings as PortalSettings | null;
  const uploadLogs = (uploadLogsRaw ?? []) as DataUploadLogRow[];

  const budgetLogs = uploadLogs.filter(
    (log) => log.table_name === "budgets" || log.table_name === "actuals"
  );
  const lastUploadAt =
    budgetLogs.length > 0
      ? budgetLogs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )[0]?.created_at
      : null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const budgetYears = (budgetYearsRaw ?? []).slice().sort((a, b) => b - a);
  const bvaYears = (bvaYearsRaw ?? []).slice().sort((a, b) => b - a);
  const actualYears = new Set(actualYearsRaw ?? []);

  // Determine which tab and year
  const viewParam = pickFirst(sp?.view);
  const activeTab = viewParam === "bva" && bvaYears.length > 0 ? "bva" : "adopted";
  const yearsForTab = activeTab === "bva" ? bvaYears : budgetYears;

  const yearParam = pickFirst(sp?.year);
  const parsedYear = yearParam ? Number(yearParam) : NaN;
  const selectedYear =
    Number.isFinite(parsedYear) && yearsForTab.includes(parsedYear)
      ? parsedYear
      : yearsForTab.length > 0
      ? yearsForTab[0]
      : undefined;

  let deptBudgetActuals: BudgetActualsYearDeptRow[] = [];
  let fundSummary: BudgetActualsYearFundRow[] = [];
  let fundDeptSummary: BudgetActualsYearFundDeptRow[] = [];
  let amendedComparison: AdoptedVsAmendedRow[] = [];

  if (selectedYear != null) {
    const [deptRows, fundRows, fundDeptRows, amendedRows] = await Promise.all([
      getBudgetActualsSummaryForYear(selectedYear),
      getBudgetActualsByFundForYear(selectedYear),
      getBudgetActualsByFundDeptForYear(selectedYear),
      getAdoptedVsAmendedForYear(selectedYear),
    ]);

    deptBudgetActuals = (deptRows ?? []) as BudgetActualsYearDeptRow[];
    fundSummary = (fundRows ?? []) as BudgetActualsYearFundRow[];
    fundDeptSummary = (fundDeptRows ?? []) as BudgetActualsYearFundDeptRow[];
    // Only show amended comparison if any row actually has amended data
    const rawAmended = (amendedRows ?? []) as AdoptedVsAmendedRow[];
    const hasAmended = rawAmended.some((r) => Number(r.amended_amount || 0) > 0);
    amendedComparison = hasAmended ? rawAmended : [];
  }

  // Parse population from portal settings
  const populationRaw = portalSettings?.stat_population;
  let population: number | null = null;
  if (populationRaw) {
    const parsed = Number(populationRaw.replace(/[^0-9]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) {
      population = parsed;
    }
  }

  const accentColor =
    portalSettings?.accent_color || portalSettings?.primary_color || undefined;

  const hasActualsForSelectedYear =
    selectedYear != null && actualYears.has(selectedYear);

  const enableTransactions = portalSettings?.enable_transactions === true;

  return (
    <>
      <div className="mb-3 flex items-center justify-end">
        <DataFreshness lastUploadAt={lastUploadAt} />
      </div>
      <BudgetPageClient
        budgetYears={budgetYears}
        bvaYears={bvaYears}
        deptBudgetActuals={deptBudgetActuals}
        fundSummary={fundSummary}
        fundDeptSummary={fundDeptSummary}
        population={population}
        accentColor={accentColor}
        hasActualsForSelectedYear={hasActualsForSelectedYear}
        enableTransactions={enableTransactions}
        amendedComparison={amendedComparison}
      />
    </>
  );
}

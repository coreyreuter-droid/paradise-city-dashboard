// app/[citySlug]/budget/page.tsx
import type { Metadata } from "next";
import BudgetPageClient from "@/components/Budget/BudgetPageClient";
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


export async function generateMetadata(): Promise<Metadata> {
  const ps = await getPortalSettings();
  const city = ps?.city_name?.trim() || "Our City";
  return {
    title: `Budget – ${city} Financial Transparency`,
    description: `Explore ${city}'s adopted and amended budgets by department, fund, and fiscal year.`,
  };
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
      <div className="mb-3 flex items-center justify-between gap-3">
        {portalSettings?.budget_document_url ? (
          <a
            href={portalSettings.budget_document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Full budget document
          </a>
        ) : <div />}
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

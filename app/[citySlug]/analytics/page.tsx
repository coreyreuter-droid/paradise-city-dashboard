// app/[citySlug]/analytics/page.tsx
import CitywideDashboardClient from "@/components/City/CitywideDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getPortalSettings,
  getPortalFiscalYears,
  getBudgetActualsSummaryForYear,
  getBudgetActualsSummaryAllYears,
  getBudgetActualsYearTotals,
  getRevenuesForYear,
  getVendorSummariesForYear,
} from "@/lib/queries";
import type { RevenueRow } from "@/lib/types";
import type { VendorYearSummary, BudgetActualsYearDeptRow } from "@/lib/queries";
import { notFound } from "next/navigation";

type SearchParamsShape = { year?: string };

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getFiscalYearNoteFromSettings(settings: Record<string, unknown> | null): string | null {
  if (!settings) return null;

  const anySettings = settings as any;
  const explicitLabel = (anySettings?.fiscal_year_label as string | null | undefined) ?? null;
  if (explicitLabel && explicitLabel.trim().length > 0) return explicitLabel.trim();

  const rawStartMonth = anySettings?.fiscal_year_start_month;
  const rawStartDay = anySettings?.fiscal_year_start_day;

  const parsedMonth = Number(rawStartMonth);
  const parsedDay = Number(rawStartDay);

  const startMonth =
    Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : 7;
  const startDay =
    Number.isFinite(parsedDay) && parsedDay >= 1 && parsedDay <= 31 ? parsedDay : 1;

  const startMonthName = MONTH_NAMES[(startMonth - 1 + MONTH_NAMES.length) % MONTH_NAMES.length];
  const endMonthIndex = (startMonth - 2 + MONTH_NAMES.length) % MONTH_NAMES.length;
  const endMonthName = MONTH_NAMES[endMonthIndex];

  return `Fiscal year runs from ${startMonthName} ${startDay.toString()} to ${endMonthName} ${startDay.toString()} of the following year.`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  params: { citySlug: string };
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
}) {
  const sp = await searchParams;

  const portalSettings = await getPortalSettings();
  if (!portalSettings) notFound();

  if (portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const enableTransactions = portalSettings.enable_transactions === true;
  const enableVendors = enableTransactions && portalSettings.enable_vendors === true;
  const enableRevenues = portalSettings.enable_revenues === true;

  const fiscalYearNote = getFiscalYearNoteFromSettings(
    portalSettings as unknown as Record<string, unknown> | null
  );

  const [years, yoyTotals, deptAllYears] = await Promise.all([
    getPortalFiscalYears(),
    getBudgetActualsYearTotals(),
    getBudgetActualsSummaryAllYears(),
  ]);

  const paramYear = sp?.year;
  const parsedYear = paramYear ? Number(paramYear) : NaN;

  const selectedYear =
    Number.isFinite(parsedYear) && years.includes(parsedYear)
      ? parsedYear
      : years.length > 0
      ? years[0]
      : null;

  let deptBudgetActuals: BudgetActualsYearDeptRow[] = [];
  let vendorSummaries: VendorYearSummary[] = [];
  let revenueSummary: { year: number; total: number } | null = null;

  if (selectedYear != null) {
    const [deptRows, vendorRows, revenuesRaw] = await Promise.all([
      getBudgetActualsSummaryForYear(selectedYear),
      enableVendors ? getVendorSummariesForYear(selectedYear) : Promise.resolve([]),
      enableRevenues ? getRevenuesForYear(selectedYear) : Promise.resolve([]),
    ]);

    deptBudgetActuals = (deptRows ?? []) as BudgetActualsYearDeptRow[];
    vendorSummaries = (vendorRows ?? []) as VendorYearSummary[];

    const revenues = (revenuesRaw ?? []) as RevenueRow[];
    if (enableRevenues && revenues.length > 0) {
      const total = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);
      revenueSummary = { year: selectedYear, total };
    }
  }

  return (
    <CitywideDashboardClient
      years={years}
      selectedYear={selectedYear}
      deptBudgetActuals={deptBudgetActuals}
      deptAllYears={deptAllYears}
      yoyTotals={yoyTotals}
      vendorSummaries={vendorSummaries}
      enableTransactions={enableTransactions}
      enableVendors={enableVendors}
      enableRevenues={enableRevenues}
      revenueSummary={revenueSummary}
      fiscalYearNote={fiscalYearNote}
    />
  );
}

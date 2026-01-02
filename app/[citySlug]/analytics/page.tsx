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
import { getFiscalYearLabel } from "@/lib/fiscalYear";
import { notFound } from "next/navigation";

type SearchParamsShape = { year?: string };

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

  const fiscalYearNote = getFiscalYearLabel(portalSettings);

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

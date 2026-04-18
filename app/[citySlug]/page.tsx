// app/[citySlug]/page.tsx
import LandingClient from "@/components/City/LandingClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getPortalSettings,
  getPortalFiscalYears,
  getBudgetActualsSummaryForYear,
} from "@/lib/queries";
import type { PortalSettings, BudgetActualsYearDeptRow } from "@/lib/queries";

export const revalidate = 0;

export default async function CityLandingPage() {
  const [settings, portalYears] = await Promise.all([
    getPortalSettings(),
    getPortalFiscalYears(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  // Get the most recent fiscal year and calculate totals
  const years = (portalYears ?? []).slice().sort((a, b) => b - a);
  const latestYear = years[0] ?? null;

  let totalBudget: number | null = null;
  let totalActuals: number | null = null;
  let departmentCount = 0;

  if (latestYear !== null) {
    const deptRows = await getBudgetActualsSummaryForYear(latestYear);
    const rows = (deptRows ?? []) as BudgetActualsYearDeptRow[];
    totalBudget = rows.reduce((sum, d) => sum + (d.budget_amount || 0), 0);
    const actSum = rows.reduce((sum, d) => sum + (d.actual_amount || 0), 0);
    totalActuals = actSum > 0 ? actSum : null;
    departmentCount = rows.length;
  }

  // Parse population
  const populationRaw = portalSettings?.stat_population;
  let population: number | null = null;
  if (populationRaw) {
    const parsed = Number(String(populationRaw).replace(/[^0-9]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) population = parsed;
  }

  return (
    <LandingClient
      portalSettings={portalSettings}
      totalBudget={totalBudget}
      totalActuals={totalActuals}
      departmentCount={departmentCount}
      population={population}
      fiscalYear={latestYear}
    />
  );
}

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

  // Get the most recent fiscal year and calculate total budget
  const years = (portalYears ?? []).slice().sort((a, b) => b - a);
  const latestYear = years[0] ?? null;

  let totalBudget: number | null = null;

  if (latestYear !== null) {
    const deptRows = await getBudgetActualsSummaryForYear(latestYear);
    const rows = (deptRows ?? []) as BudgetActualsYearDeptRow[];
    totalBudget = rows.reduce((sum, d) => sum + (d.budget_amount || 0), 0);
  }

  return (
    <LandingClient
      portalSettings={portalSettings}
      totalBudget={totalBudget}
    />
  );
}
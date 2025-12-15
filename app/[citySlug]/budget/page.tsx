// app/[citySlug]/budget/page.tsx
import BudgetClient from "@/components/Budget/BudgetClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getPortalFiscalYears,
  getBudgetActualsSummaryForYear,
  getPortalSettings,
} from "@/lib/queries";
import type { PortalSettings, BudgetActualsYearDeptRow } from "@/lib/queries";

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

  const [yearsRaw, settings] = await Promise.all([
    getPortalFiscalYears(),
    getPortalSettings(),
  ]);

  const portalSettings = settings as PortalSettings | null;

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

  return <BudgetClient years={years} deptBudgetActuals={deptBudgetActuals} />;
}

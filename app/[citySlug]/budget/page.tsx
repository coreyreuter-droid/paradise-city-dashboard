// app/[citySlug]/budget/page.tsx
import BudgetClient from "@/components/Budget/BudgetClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getAvailableFiscalYears,
  getBudgetsForYear,
  getActualsForYear,
  getPortalSettings,
} from "@/lib/queries";
import type { BudgetRow, ActualRow } from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";

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
    getAvailableFiscalYears(),
    getPortalSettings(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const years = (yearsRaw ?? [])
    .map((y) => Number(y))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);

  const yearParam = pickFirst(sp?.year);
  const parsedYear = yearParam ? Number(yearParam) : NaN;

  const selectedYear =
    Number.isFinite(parsedYear) && years.includes(parsedYear)
      ? parsedYear
      : years.length > 0
      ? years[0]
      : undefined;

  let budgets: BudgetRow[] = [];
  let actuals: ActualRow[] = [];

  if (selectedYear != null) {
    const [budgetsRaw, actualsRaw] = await Promise.all([
      getBudgetsForYear(selectedYear),
      getActualsForYear(selectedYear),
    ]);

    budgets = (budgetsRaw ?? []) as BudgetRow[];
    actuals = (actualsRaw ?? []) as ActualRow[];
  }

  return <BudgetClient years={years} budgets={budgets} actuals={actuals} />;
}

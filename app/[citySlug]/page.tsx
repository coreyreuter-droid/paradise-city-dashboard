// app/[citySlug]/page.tsx

import ParadiseHomeClient from "@/components/City/ParadiseHomeClient";
import {
  getAllBudgets,
  getAllActuals,
  getPortalSettings,
  getAvailableFiscalYears,
  getTransactionsForYear,
} from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";

export const revalidate = 0;

// Helper to normalize year values
function toYear(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

export default async function CityHomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
  params: { citySlug: string };
}) {
  const resolvedSearchParams = await searchParams;

  // 1) Fetch budgets, actuals, portal settings, and available fiscal years
  const [budgetsRaw, actualsRaw, settings, availableYearsFromBudgets] =
    await Promise.all([
      getAllBudgets(),
      getAllActuals(),
      getPortalSettings(),
      getAvailableFiscalYears(),
    ]);

  const budgets = (budgetsRaw ?? []) as BudgetRow[];
  const actuals = (actualsRaw ?? []) as ActualRow[];

  // 2) Build the unified list of fiscal years (budgets + actuals + explicit list)
  const yearSet = new Set<number>();

  (availableYearsFromBudgets ?? []).forEach((y) => {
    if (Number.isFinite(y)) yearSet.add(y);
  });

  budgets.forEach((b) => {
    const y = toYear((b as any).fiscal_year);
    if (y !== null) yearSet.add(y);
  });

  actuals.forEach((a) => {
    const y = toYear((a as any).fiscal_year);
    if (y !== null) yearSet.add(y);
  });

  const years = Array.from(yearSet).sort((a, b) => b - a); // newest first

  // 3) Determine selected fiscal year from query param (or default to latest)
  let selectedYear: number | undefined = undefined;

  if (years.length > 0) {
    const rawParam = resolvedSearchParams?.year;
    const param =
      typeof rawParam === "string"
        ? rawParam
        : Array.isArray(rawParam) && rawParam.length > 0
        ? rawParam[0]
        : undefined;

    const parsed = param ? Number(param) : NaN;

    if (Number.isFinite(parsed) && years.includes(parsed)) {
      selectedYear = parsed;
    } else {
      selectedYear = years[0];
    }
  }

  // 4) Fetch ONLY the transactions for the selected year (not all years)
  let transactions: TransactionRow[] = [];

  if (selectedYear !== undefined) {
    transactions =
      ((await getTransactionsForYear(selectedYear)) ?? []) as TransactionRow[];
  }

  return (
    <ParadiseHomeClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
      availableYears={years}
      portalSettings={settings}
    />
  );
}

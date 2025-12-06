// app/[citySlug]/overview/page.tsx

import ParadiseHomeClient from "@/components/City/HomeClient";
import {
  getAllBudgets,
  getAllActuals,
  getPortalSettings,
  getAvailableFiscalYears,
  getTransactionsForYear,
  getRevenuesForYear,
} from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
  RevenueRow,
} from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";

export const revalidate = 0;

// Helper to normalize year values
function toYear(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

export default async function CityOverviewPage({
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

  const portalSettings = settings as PortalSettings | null;

  // Gate overview if not published
  if (portalSettings && portalSettings.is_published === false) {
    const cityName = portalSettings.city_name || "Your City";

    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {cityName} overview is not yet published
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          City staff are preparing financial data for this portal. Once
          it&apos;s ready, the budget and spending overview will be
          available here.
        </p>
      </div>
    );
  }

  const budgets = (budgetsRaw ?? []) as BudgetRow[];
  const actuals = (actualsRaw ?? []) as ActualRow[];

  // 2) Build unified list of fiscal years (budgets + actuals + explicit list)
  const yearSet = new Set<number>();

  (availableYearsFromBudgets ?? []).forEach((y) => {
    if (Number.isFinite(y)) yearSet.add(Number(y));
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

  // 4) Fetch ONLY the transactions + revenues for the selected year
  let transactions: TransactionRow[] = [];
  let revenueTotal: number | null = null;

  if (selectedYear !== undefined) {
    const [transactionsRaw, revenuesRaw] = await Promise.all([
      getTransactionsForYear(selectedYear),
      getRevenuesForYear(selectedYear),
    ]);

    transactions =
      ((transactionsRaw ?? []) as TransactionRow[]) ?? [];

    const revenues = (revenuesRaw ?? []) as RevenueRow[];
    revenueTotal = revenues.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );
  }

  return (
    <ParadiseHomeClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
      availableYears={years}
      portalSettings={portalSettings}
      revenueTotal={revenueTotal}
    />
  );
}

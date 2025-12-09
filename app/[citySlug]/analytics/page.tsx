// app/[citySlug]/analytics/page.tsx
import CitywideDashboardClient from "@/components/City/CitywideDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getAllBudgets,
  getAllActuals,
  getTransactionsForYear,
  getPortalSettings,
  getRevenuesForYear,
} from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
  RevenueRow,
} from "@/lib/types";
import { notFound } from "next/navigation";

type SearchParamsShape = {
  year?: string;
};

function normalizeFiscalYearFromRow(row: {
  fiscal_year?: number | string | null;
}): number | null {
  const raw = row?.fiscal_year;
  if (raw == null) return null;

  const n = Number(raw);
  if (!Number.isFinite(n)) return null;

  return n;
}

/**
 * Given budgets and searchParams.year, choose a selected year + the sorted list of available years.
 */
function pickSelectedYear(
  budgets: BudgetRow[],
  searchParams: SearchParamsShape
): { years: number[]; selectedYear: number | null } {
  const yearsSet = new Set<number>();

  budgets.forEach((row) => {
    const y = normalizeFiscalYearFromRow(row);
    if (y != null) {
      yearsSet.add(y);
    }
  });

  const years = Array.from(yearsSet).sort((a, b) => b - a);

  if (years.length === 0) {
    return { years: [], selectedYear: null };
  }

  const paramYear = searchParams.year;
  if (!paramYear) {
    return { years, selectedYear: years[0] };
  }

  const parsedYear = Number(paramYear);
  if (!Number.isFinite(parsedYear)) {
    return { years, selectedYear: years[0] };
  }

  const selectedYear =
    Number.isFinite(parsedYear) && years.includes(parsedYear)
      ? parsedYear
      : years[0];

  return { years, selectedYear };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Build the public-facing fiscal-year note from portal_settings.
 * Respects:
 * - explicit fiscal_year_label, OR
 * - numeric fiscal_year_start_month / fiscal_year_start_day with sane defaults.
 */
function getFiscalYearNoteFromSettings(
  settings: Record<string, unknown> | null
): string | null {
  if (!settings) return null;

  const anySettings = settings as any;

  const explicitLabel = (anySettings?.fiscal_year_label as
    | string
    | null
    | undefined) ?? null;

  if (explicitLabel && explicitLabel.trim().length > 0) {
    return explicitLabel.trim();
  }

  const rawStartMonth = anySettings?.fiscal_year_start_month;
  const rawStartDay = anySettings?.fiscal_year_start_day;

  const parsedMonth = Number(rawStartMonth);
  const parsedDay = Number(rawStartDay);

  const startMonth =
    Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : 7; // Default to July (common pattern)
  const startDay =
    Number.isFinite(parsedDay) && parsedDay >= 1 && parsedDay <= 31
      ? parsedDay
      : 1; // Default to the first of the month

  const startMonthName =
    MONTH_NAMES[(startMonth - 1 + MONTH_NAMES.length) % MONTH_NAMES.length];

  const endMonthIndex =
    (startMonth - 2 + MONTH_NAMES.length) % MONTH_NAMES.length;
  const endMonthName = MONTH_NAMES[endMonthIndex];

  return `Fiscal year runs from ${startMonthName} ${startDay.toString()} to ${endMonthName} ${startDay.toString()} of the following year.`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  params: { citySlug: string };
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
}) {
  const resolvedSearchParams = await searchParams;

  const portalSettings = await getPortalSettings();

  if (!portalSettings) {
    notFound();
  }

  // Use is_published flag and pass settings into UnpublishedMessage
  if (portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const enableTransactions =
    (portalSettings as any)?.enable_transactions === true;
  const enableVendors =
    enableTransactions && (portalSettings as any)?.enable_vendors === true;
  const enableRevenues =
    (portalSettings as any)?.enable_revenues === true;

  const fiscalYearNote = getFiscalYearNoteFromSettings(
    portalSettings as unknown as Record<string, unknown> | null
  );

  // 1) Load budgets + actuals in parallel (these are needed for multi-year charts)
  const [budgetsRaw, actualsRaw] = await Promise.all([
    getAllBudgets(),
    getAllActuals(),
  ]);

  const budgets: BudgetRow[] = budgetsRaw ?? [];
  const actuals: ActualRow[] = actualsRaw ?? [];

  // 2) Decide which year is selected based on budgets + URL params
  const { years, selectedYear } = pickSelectedYear(
    budgets,
    resolvedSearchParams
  );

  // 3) Only load transactions for the selected year (not all years)
  let transactions: TransactionRow[] = [];

  if (enableTransactions && selectedYear != null) {
    transactions = (await getTransactionsForYear(selectedYear)) ?? [];
  }

  // 4) Revenue summary still uses selectedYear
  let revenueSummary:
    | {
        year: number;
        total: number;
      }
    | null = null;

  if (enableRevenues && selectedYear != null) {
    const revenues: RevenueRow[] =
      ((await getRevenuesForYear(selectedYear)) as RevenueRow[]) ?? [];

    if (revenues.length > 0) {
      const total = revenues.reduce(
        (sum, row) => sum + (row.amount || 0),
        0
      );
      revenueSummary = {
        year: selectedYear,
        total,
      };
    } else {
      revenueSummary = null;
    }
  }

  return (
    <CitywideDashboardClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
      enableTransactions={enableTransactions}
      enableVendors={enableVendors}
      enableRevenues={enableRevenues}
      revenueSummary={revenueSummary}
      fiscalYearNote={fiscalYearNote}
    />
  );
}

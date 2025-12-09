// app/[citySlug]/analytics/page.tsx
import CitywideDashboardClient from "@/components/City/CitywideDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getAllBudgets,
  getAllActuals,
  getAllTransactions,
  getPortalSettings,
  getRevenuesForYear,
} from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
  RevenueRow,
} from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";
import { notFound } from "next/navigation";

export const revalidate = 0; // always hit Supabase; change if you want caching

type SearchParamsShape = {
  year?: string | string[];
};

type RevenueSummary = {
  year: number;
  total: number;
};

function pickFirst(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

const MONTH_NAMES = [
  "",
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
function getFiscalYearPublicLabelFromSettings(
  settings: PortalSettings | null
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
      : 1;
  const startDay =
    Number.isFinite(parsedDay) && parsedDay >= 1 && parsedDay <= 31
      ? parsedDay
      : 1;

  // Calendar year shortcut
  if (startMonth === 1 && startDay === 1) {
    return "Fiscal year aligns with the calendar year (January 1 – December 31).";
  }

const startMonthName = MONTH_NAMES[startMonth] || "January";

// End month is the month before the start month in the following year.
// For example, start July 1 -> end June 30.
const endMonthIndex = ((startMonth + 10) % 12) + 1;
const endMonthName = MONTH_NAMES[endMonthIndex] || "December";

// Use the last day of the end month (non-leap year is fine for this message).
const LAST_DAY_OF_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const endDay = LAST_DAY_OF_MONTH[endMonthIndex] ?? 30;

return `Fiscal year runs ${startMonthName} ${startDay} – ${endMonthName} ${endDay}.`;

}

/**
 * Derive available fiscal years from the budgets data and the URL ?year= param.
 * This mirrors the logic used on other pages: newest year is default if no
 * valid year param is provided.
 */
function getSelectedFiscalYear(
  budgets: BudgetRow[],
  searchParams: SearchParamsShape
): { years: number[]; selectedYear: number | null } {
  const years = Array.from(
    new Set(
      budgets
        .map((b) => Number(b.fiscal_year))
        .filter((y) => Number.isFinite(y))
    )
  ).sort((a, b) => b - a); // newest first

  if (years.length === 0) {
    return { years: [], selectedYear: null };
  }

  const yearParam = pickFirst(searchParams.year);
  const parsedYear = yearParam ? Number(yearParam) : NaN;

  const selectedYear =
    Number.isFinite(parsedYear) && years.includes(parsedYear)
      ? parsedYear
      : years[0];

  return { years, selectedYear };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  params: { citySlug: string };
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
}) {
  const resolvedSearchParams = await searchParams;

  // Load portal settings first to determine gating + whether revenues are enabled.
  const settings = await getPortalSettings();
  const portalSettings = settings as PortalSettings | null;

  // If the portal itself is not published, show the unpublished message.
  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  // Strict module gating: Analytics depends on Actuals.
  const enableActuals =
    portalSettings?.enable_actuals === null ||
    portalSettings?.enable_actuals === undefined
      ? true
      : !!portalSettings.enable_actuals;

  if (portalSettings && !enableActuals) {
    // Gov does not publish Actuals → Analytics does not exist.
    notFound();
  }

  const enableTransactions =
    portalSettings?.enable_transactions === true;

  const enableVendors =
    enableTransactions && portalSettings?.enable_vendors === true;

  const enableRevenues =
    portalSettings?.enable_revenues === true;

  // Compute public-facing fiscal year note
  const fiscalYearNote = getFiscalYearPublicLabelFromSettings(
    portalSettings
  );

  // Load budgets/actuals/transactions in parallel.
  const [budgetsRaw, actualsRaw, transactionsRaw] =
    await Promise.all([
      getAllBudgets(),
      getAllActuals(),
      getAllTransactions(),
    ]);

  const budgets: BudgetRow[] = budgetsRaw ?? [];
  const actuals: ActualRow[] = actualsRaw ?? [];
  const transactions: TransactionRow[] = transactionsRaw ?? [];

  // Work out which fiscal year is selected based on budgets + ?year= param.
  // This keeps Analytics in sync with the year selector and avoids hard-coding 2020.
  const { selectedYear } = getSelectedFiscalYear(
    budgets,
    resolvedSearchParams
  );

  // Optional: compute a revenue summary for the *selected* fiscal year only.
  // If there's no revenue data for that year, we leave the summary null instead
  // of silently falling back to some older year like 2020.
  let revenueSummary: RevenueSummary | null = null;

  if (enableRevenues && selectedYear != null) {
    const revenues: RevenueRow[] =
      (await getRevenuesForYear(selectedYear)) ?? [];

    if (revenues.length > 0) {
      const total = revenues.reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
      );
      revenueSummary = {
        year: selectedYear,
        total,
      };
    } else {
      // No revenues for the selected year → no summary card.
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

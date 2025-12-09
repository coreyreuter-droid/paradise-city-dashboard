import { notFound } from "next/navigation";
import DepartmentsDashboardClient from "@/components/City/DepartmentsDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getAvailableFiscalYears,
  getBudgetsForYear,
  getActualsForYear,
  getTransactionsForYear,
  getPortalSettings,
} from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";

export const revalidate = 0;

type SearchParamsShape = {
  year?: string | string[];
};

type PageProps = {
  params: { citySlug: string };
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
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

export default async function DepartmentsPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;

  const [availableYearsRaw, settings] = await Promise.all([
    getAvailableFiscalYears(),
    getPortalSettings(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const fiscalYearNote =
    getFiscalYearPublicLabelFromSettings(portalSettings);

  // Strict actuals gating for Departments
  const enableActuals =
    portalSettings?.enable_actuals === null ||
    portalSettings?.enable_actuals === undefined
      ? true
      : !!portalSettings.enable_actuals;

  if (portalSettings && !enableActuals) {
    notFound();
  }

  const enableTransactions =
    portalSettings?.enable_transactions === true;

  const years = (availableYearsRaw ?? [])
    .map((y) => Number(y))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);

  const yearParam = pickFirst(resolvedSearchParams.year);
  const parsedYear = yearParam ? Number(yearParam) : NaN;

  const selectedYear =
    Number.isFinite(parsedYear) && years.includes(parsedYear)
      ? parsedYear
      : years.length > 0
      ? years[0]
      : undefined;

  let budgets: BudgetRow[] = [];
  let actuals: ActualRow[] = [];
  let transactions: TransactionRow[] = [];

  if (selectedYear != null) {
    const [budgetsRaw, actualsRaw, transactionsRaw] =
      await Promise.all([
        getBudgetsForYear(selectedYear),
        getActualsForYear(selectedYear),
        getTransactionsForYear(selectedYear),
      ]);

    budgets = (budgetsRaw ?? []) as BudgetRow[];
    actuals = (actualsRaw ?? []) as ActualRow[];
    transactions = (transactionsRaw ?? []) as TransactionRow[];
  }

  return (
    <DepartmentsDashboardClient
      budgets={budgets}
      actuals={actuals}
      transactions={transactions}
      years={years}
      enableTransactions={enableTransactions}
      fiscalYearNote={fiscalYearNote ?? undefined}
    />
  );
}

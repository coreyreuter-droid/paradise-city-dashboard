// app/[citySlug]/transactions/page.tsx
import TransactionsDashboardClient from "@/components/City/TransactionsDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getTransactionYears,
  getTransactionDepartmentsForYear,
  getTransactionsPage,
  getPortalSettings,
} from "@/lib/queries";
import type { TransactionRow } from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";
import { notFound } from "next/navigation";

export const revalidate = 0;

const PAGE_SIZE = 50;

type SearchParamsShape = {
  year?: string;
  department?: string;
  q?: string;
  page?: string;
};

type PageProps = {
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

function pickFirst(value: string | string[] | undefined) {
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

export default async function TransactionsPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;

  const [yearsRaw, settings] = await Promise.all([
    getTransactionYears(),
    getPortalSettings(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const fiscalYearNote =
    getFiscalYearPublicLabelFromSettings(portalSettings);

  const enableTransactions = portalSettings?.enable_transactions === true;

  if (portalSettings && !enableTransactions) {
    notFound();
  }

  const enableVendors =
    enableTransactions && portalSettings?.enable_vendors === true;

  const years = (yearsRaw ?? []).slice().sort((a, b) => b - a);

  let selectedYear: number | null = null;
  if (years.length > 0) {
    const yearParam = pickFirst(resolvedSearchParams.year);
    const parsedYear = yearParam ? Number(yearParam) : NaN;
    selectedYear =
      Number.isFinite(parsedYear) && years.includes(parsedYear)
        ? parsedYear
        : years[0];
  }

  const pageParam = pickFirst(resolvedSearchParams.page);
  const parsedPage = pageParam ? Number(pageParam) : NaN;
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const department =
    pickFirst(resolvedSearchParams.department) ?? "all";

  const rawVendorQuery = pickFirst(resolvedSearchParams.q) ?? null;
  const vendorQuery = enableVendors ? rawVendorQuery : null;

  let departments: string[] = [];
  let transactions: TransactionRow[] = [];
  let totalCount = 0;

  if (selectedYear != null) {
    departments = await getTransactionDepartmentsForYear(selectedYear);

const pageResult = await getTransactionsPage({
  fiscalYear: selectedYear,
  department: department === "all" ? undefined : department,
  vendorQuery: vendorQuery ?? undefined,
  page,
  pageSize: PAGE_SIZE,
});


    transactions = pageResult.rows ?? [];
    totalCount = pageResult.totalCount;
  }

  return (
    <TransactionsDashboardClient
      transactions={transactions}
      years={years}
      selectedYear={selectedYear}
      totalCount={totalCount}
      page={page}
      pageSize={PAGE_SIZE}
      departments={departments}
      departmentFilter={department}
      vendorQuery={vendorQuery}
      enableVendors={enableVendors}
      fiscalYearNote={fiscalYearNote ?? undefined}
    />
  );
}

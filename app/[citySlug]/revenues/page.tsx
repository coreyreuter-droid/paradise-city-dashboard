// app/[citySlug]/revenues/page.tsx
import RevenuesDashboardClient from "@/components/City/RevenuesDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getRevenueYears,
  getRevenuesForYear,
  getPortalSettings,
} from "@/lib/queries";
import type { RevenueRow } from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";
import { notFound } from "next/navigation";

export const revalidate = 0;

type SearchParamsShape = {
  year?: string;
  q?: string;
};

type PageProps = {
  params: { citySlug: string };
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

function pickFirst(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

type YearTotal = {
  year: number;
  total: number;
};

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

export default async function RevenuesPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;

  const [yearsRaw, settings] = await Promise.all([
    getRevenueYears(),
    getPortalSettings(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const fiscalYearNote =
    getFiscalYearPublicLabelFromSettings(portalSettings);

  // Strict module gate: Revenues require enable_revenues = true.
  const enableRevenues = portalSettings?.enable_revenues === true;
  if (portalSettings && !enableRevenues) {
    notFound();
  }

  const years = (yearsRaw ?? []).slice().sort((a, b) => b - a);

  let revenuesByYear: RevenueRow[][] = [];
  if (years.length > 0) {
    const all = await Promise.all(
      years.map(async (year) => {
        const rows = (await getRevenuesForYear(year)) ?? [];
        return rows as RevenueRow[];
      })
    );
    revenuesByYear = all;
  }

  let selectedYear: number | null = null;
  if (years.length > 0) {
    const yearParam = pickFirst(resolvedSearchParams.year);
    const parsedYear = yearParam ? Number(yearParam) : NaN;
    selectedYear =
      Number.isFinite(parsedYear) && years.includes(parsedYear)
        ? parsedYear
        : years[0];
  }

  let revenues: RevenueRow[] = [];
  if (selectedYear != null && years.length > 0) {
    const index = years.indexOf(selectedYear);
    const bucketIndex = index >= 0 ? index : 0;
    revenues = revenuesByYear[bucketIndex] ?? [];
  }

  const yearTotals: YearTotal[] = years.map((year, idx) => {
    const rows = revenuesByYear[idx] ?? [];
    const total = rows.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0
    );
    return { year, total };
  });

  const sourceQuery = pickFirst(resolvedSearchParams.q) ?? null;

  return (
    <RevenuesDashboardClient
      years={years}
      selectedYear={selectedYear}
      revenues={revenues}
      sourceQuery={sourceQuery}
      yearTotals={yearTotals}
      fiscalYearNote={fiscalYearNote ?? undefined}
    />
  );
}

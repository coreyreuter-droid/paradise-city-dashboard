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
import { getFiscalYearLabel } from "@/lib/fiscalYear";
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

  const fiscalYearNote = getFiscalYearLabel(portalSettings);

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

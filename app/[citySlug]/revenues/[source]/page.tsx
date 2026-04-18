// app/[citySlug]/revenues/[source]/page.tsx

import { notFound } from "next/navigation";
import RevenueSourceDetailClient from "@/components/City/RevenueSourceDetailClient";
import {
  getPortalSettings,
  getRevenueSourceSummaryByYear,
  getRevenuesForSourceYear,
  getRevenueCategories,
} from "@/lib/queries";
import type { RevenueRow } from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";

export const revalidate = 60;

type SearchParamsShape = {
  year?: string | string[];
};

type ParamsShape = {
  citySlug: string;
  source: string;
};

type PageProps = {
  params: ParamsShape | Promise<ParamsShape>;
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

function pickFirst(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0) return v[0];
  return undefined;
}

export default async function RevenueSourceDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const sp = await searchParams;

  const sourceSlug = decodeURIComponent(resolvedParams.source);
  
  const [settingsRaw, allCategories] = await Promise.all([
    getPortalSettings(),
    getRevenueCategories(),
  ]);

  const settings = settingsRaw as PortalSettings | null;
  // Check if revenues module is enabled
  const enableRevenues = settings?.enable_revenues === true;
  if (settings && !enableRevenues) {
    notFound();
  }

  // Find the matching category (case-insensitive match from slug)
  const sourceName = allCategories.find(
    (cat) => cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") === sourceSlug.toLowerCase()
  ) ?? allCategories.find(
    (cat) => cat.toLowerCase() === sourceSlug.toLowerCase().replace(/-/g, " ")
  ) ?? sourceSlug;

  // Get summary by year for this source
  const summaryByYear = await getRevenueSourceSummaryByYear(sourceName);
  
  if (summaryByYear.length === 0) {
    notFound();
  }

  const availableYears = summaryByYear.map((s) => s.fiscal_year).sort((a, b) => b - a);

  const yearParam = pickFirst(sp?.year);
  const parsedYear = yearParam ? Number(yearParam) : NaN;

  const selectedYear =
    Number.isFinite(parsedYear) && availableYears.includes(parsedYear)
      ? parsedYear
      : availableYears[0];

  // Get detailed revenues for selected year
  const revenuesRaw = await getRevenuesForSourceYear(sourceName, selectedYear);
  const revenues = (revenuesRaw ?? []) as RevenueRow[];

  // Get fiscal year start month (defaults to 1 = January)
  const fiscalYearStartMonth = settings?.fiscal_year_start_month ?? 1;

  return (
    <RevenueSourceDetailClient
      sourceName={sourceName}
      revenues={revenues}
      availableYears={availableYears}
      summaryByYear={summaryByYear}
      selectedYear={selectedYear}
      fiscalYearStartMonth={fiscalYearStartMonth}
    />
  );
}

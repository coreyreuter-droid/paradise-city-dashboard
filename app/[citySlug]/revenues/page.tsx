// app/[citySlug]/revenues/page.tsx
import RevenuesDashboardClient from "@/components/City/RevenuesDashboardClient";
import {
  getRevenueYears,
  getRevenuesForYear,
} from "@/lib/queries";
import type { RevenueRow } from "@/lib/types";

export const revalidate = 0;

type SearchParamsShape = {
  year?: string;
  q?: string;
};

type PageProps = {
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

export default async function RevenuesPage(props: PageProps) {
  const searchParams = await props.searchParams;

  // 1) Years available from revenues table
  const years = await getRevenueYears();
  const defaultYear = years[0] ?? null;

  // 2) Selected year from URL or fall back to latest
  const yearParam = searchParams.year
    ? Number(searchParams.year)
    : undefined;

  const selectedYear =
    yearParam && years.includes(yearParam)
      ? yearParam
      : defaultYear;

  // 3) Source query from URL
  const sourceQuery = searchParams.q ?? "";

  // 4) Fetch all revenue records for the selected year
  let revenues: RevenueRow[] = [];
  if (selectedYear != null) {
    revenues = await getRevenuesForYear(selectedYear);
  }

  return (
    <RevenuesDashboardClient
      years={years}
      selectedYear={selectedYear}
      revenues={revenues}
      sourceQuery={sourceQuery}
    />
  );
}

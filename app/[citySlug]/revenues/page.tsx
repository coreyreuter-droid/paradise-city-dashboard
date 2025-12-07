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

export default async function RevenuesPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;

  const [yearsRaw, settings] = await Promise.all([
    getRevenueYears(),
    getPortalSettings(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  // Publish gate: if the portal is not published, show the unpublished message.
  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  // Strict module gate: Revenues require enable_revenues = true.
  const enableRevenues = portalSettings?.enable_revenues === true;

  if (portalSettings && !enableRevenues) {
    // Revenues module does not exist for this city.
    notFound();
  }

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

  const sourceQuery = pickFirst(resolvedSearchParams.q) ?? null;

  let revenues: RevenueRow[] = [];
  if (selectedYear != null) {
    revenues = (await getRevenuesForYear(selectedYear)) ?? [];
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

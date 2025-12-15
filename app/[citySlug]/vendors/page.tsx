// app/[citySlug]/vendors/page.tsx
import { notFound } from "next/navigation";
import VendorsDashboardClient from "@/components/City/VendorsDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getPortalFiscalYears,
  getPortalSettings,
  getVendorSummariesForYear,
} from "@/lib/queries";
import type { PortalSettings, VendorYearSummary } from "@/lib/queries";

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

export default async function VendorsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  const [yearsRaw, settings] = await Promise.all([
    getPortalFiscalYears(),
    getPortalSettings(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  // Strict feature gating: vendors require transactions + vendors flag
  const enableTransactions = portalSettings?.enable_transactions === true;
  const enableVendors = enableTransactions && portalSettings?.enable_vendors === true;

  if (portalSettings && !enableVendors) {
    notFound();
  }

  const years = (yearsRaw ?? []).slice().sort((a, b) => b - a);

  let selectedYear: number | null = null;
  if (years.length > 0) {
    const yearParam = pickFirst(resolvedSearchParams.year);
    const parsedYear = yearParam ? Number(yearParam) : NaN;
    selectedYear =
      Number.isFinite(parsedYear) && years.includes(parsedYear) ? parsedYear : years[0];
  }

  const vendorQuery = pickFirst(resolvedSearchParams.q) ?? null;

  let vendorSummaries: VendorYearSummary[] = [];
  if (selectedYear != null) {
    vendorSummaries = await getVendorSummariesForYear(selectedYear, {
      search: vendorQuery,
    });
  }

  return (
    <VendorsDashboardClient
      years={years}
      selectedYear={selectedYear}
      vendorSummaries={vendorSummaries}
      vendorQuery={vendorQuery}
    />
  );
}

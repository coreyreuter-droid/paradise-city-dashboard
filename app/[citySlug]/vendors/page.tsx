// app/[citySlug]/vendors/page.tsx
import { notFound } from "next/navigation";
import VendorsDashboardClient from "@/components/City/VendorsDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import DataFreshness from "@/components/DataFreshness";
import {
  getPortalFiscalYears,
  getPortalSettings,
  getVendorSummariesForYear,
  getDataUploadLogs,
} from "@/lib/queries";
import type { PortalSettings, VendorYearSummary, DataUploadLogRow } from "@/lib/queries";

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

  const [yearsRaw, settings, uploadLogsRaw] = await Promise.all([
    getPortalFiscalYears(),
    getPortalSettings(),
    getDataUploadLogs(),
  ]);

  const portalSettings = settings as PortalSettings | null;
  const uploadLogs = (uploadLogsRaw ?? []) as DataUploadLogRow[];

  // Get most recent transactions upload (vendors come from transactions)
  const txLogs = uploadLogs.filter((log) => log.table_name === "transactions");
  const lastUploadAt = txLogs.length > 0
    ? txLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
    : null;

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
    <>
      <div className="mb-3 flex items-center justify-end">
        <DataFreshness lastUploadAt={lastUploadAt} />
      </div>
      <VendorsDashboardClient
        years={years}
        selectedYear={selectedYear}
        vendorSummaries={vendorSummaries}
        vendorQuery={vendorQuery}
      />
    </>
  );
}

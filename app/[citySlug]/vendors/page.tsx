// app/[citySlug]/vendors/page.tsx
import VendorsDashboardClient from "@/components/City/VendorsDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getTransactionYears,
  getTransactionsForYear,
  getPortalSettings,
} from "@/lib/queries";
import type { TransactionRow } from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";

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

export default async function VendorsPage({
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

  const vendorQuery = pickFirst(resolvedSearchParams.q) ?? null;

  let transactions: TransactionRow[] = [];
  if (selectedYear != null) {
    transactions = (await getTransactionsForYear(selectedYear)) ?? [];
  }

  return (
    <VendorsDashboardClient
      years={years}
      selectedYear={selectedYear}
      transactions={transactions}
      vendorQuery={vendorQuery}
    />
  );
}

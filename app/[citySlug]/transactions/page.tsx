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

export default async function TransactionsPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;

  const [yearsRaw, settings] = await Promise.all([
    getTransactionYears(),
    getPortalSettings(),
  ]);

  const portalSettings = settings as PortalSettings | null;

  // Publish gate: if the portal is not published, show the unpublished message.
  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  // Strict module gate: Transactions require enable_transactions = true.
  const enableTransactions = portalSettings?.enable_transactions === true;

  if (portalSettings && !enableTransactions) {
    // Transactions module does not exist for this city.
    notFound();
  }

  // Vendor flag depends on transactions being enabled.
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
      department,
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
    />
  );
}

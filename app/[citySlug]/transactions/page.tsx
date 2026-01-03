// app/[citySlug]/transactions/page.tsx
import TransactionsDashboardClient from "@/components/City/TransactionsDashboardClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import DataFreshness from "@/components/DataFreshness";
import {
  getTransactionYears,
  getTransactionDepartmentsForYear,
  getTransactionsPage,
  getPortalSettings,
  getDataUploadLogs,
} from "@/lib/queries";
import type { TransactionRow } from "@/lib/types";
import type { PortalSettings, DataUploadLogRow } from "@/lib/queries";
import { getFiscalYearLabel } from "@/lib/fiscalYear";
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

  const [yearsRaw, settings, uploadLogsRaw] = await Promise.all([
    getTransactionYears(),
    getPortalSettings(),
    getDataUploadLogs(),
  ]);

  const portalSettings = settings as PortalSettings | null;
  const uploadLogs = (uploadLogsRaw ?? []) as DataUploadLogRow[];

  // Get most recent transactions upload
  const txLogs = uploadLogs.filter((log) => log.table_name === "transactions");
  const lastUploadAt = txLogs.length > 0
    ? txLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
    : null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const fiscalYearNote = getFiscalYearLabel(portalSettings);

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
    <>
      <div className="mb-3 flex items-center justify-end">
        <DataFreshness lastUploadAt={lastUploadAt} />
      </div>
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
    </>
  );
}

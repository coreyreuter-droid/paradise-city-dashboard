// app/paradise/transactions/page.tsx
import TransactionsDashboardClient from "@/components/City/TransactionsDashboardClient";
import {
  getTransactionYears,
  getTransactionDepartmentsForYear,
  getTransactionsPage,
} from "@/lib/queries";
import type { TransactionRow } from "@/lib/types";

export const revalidate = 0;

const PAGE_SIZE = 50;

// Next 16 can pass searchParams as a Promise, so allow both.
type SearchParamsShape = {
  year?: string;
  department?: string;
  q?: string;
  page?: string;
};

type PageProps = {
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

export default async function TransactionsPage(props: PageProps) {
  // Support both direct object and Promise
  const searchParams = await props.searchParams;

  // 1) Years available in data
  const years = await getTransactionYears();
  const defaultYear = years[0];

  // 2) Selected year from URL or fall back to latest
  const yearParam = searchParams.year
    ? Number(searchParams.year)
    : undefined;

  const selectedYear =
    yearParam && years.includes(yearParam)
      ? yearParam
      : defaultYear;

  // 3) Department filter - "all" or specific value
  const departmentParam = searchParams.department ?? "all";
  const department =
    departmentParam && departmentParam !== "all"
      ? departmentParam
      : "all";

  // 4) Vendor/description query
  const vendorQuery = searchParams.q ?? "";

  // 5) Page (1-based)
  const pageParam = searchParams.page
    ? Number(searchParams.page)
    : 1;
  const page =
    Number.isFinite(pageParam) && pageParam > 0
      ? pageParam
      : 1;

  // 6) Departments list for selected year
  const departments =
    selectedYear != null
      ? await getTransactionDepartmentsForYear(selectedYear)
      : [];

  // 7) Paged transactions from Supabase
  const { rows, totalCount } = await getTransactionsPage({
    fiscalYear: selectedYear,
    department: department === "all" ? undefined : department,
    vendorQuery,
    page,
    pageSize: PAGE_SIZE,
  });

  const transactions: TransactionRow[] = rows ?? [];

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
    />
  );
}

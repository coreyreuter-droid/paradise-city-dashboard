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

type PageProps = {
  searchParams: {
    year?: string;
    department?: string;
    q?: string;
    page?: string;
  };
};

export default async function TransactionsPage({
  searchParams,
}: PageProps) {
  // Years available
  const years = await getTransactionYears();
  const defaultYear = years[0];

  // Parse year
  const yearParam = searchParams.year
    ? Number(searchParams.year)
    : undefined;
  const selectedYear =
    yearParam && years.includes(yearParam)
      ? yearParam
      : defaultYear;

  // Parse department filter
  const department =
    searchParams.department && searchParams.department !== "all"
      ? searchParams.department
      : "all";

  // Vendor / description query
  const vendorQuery = searchParams.q ?? "";

  // Page (1-based)
  const pageParam = searchParams.page
    ? Number(searchParams.page)
    : 1;
  const page =
    Number.isFinite(pageParam) && pageParam > 0
      ? pageParam
      : 1;

  // Departments list for the dropdown (for the selected year)
  const departments =
    selectedYear != null
      ? await getTransactionDepartmentsForYear(selectedYear)
      : [];

  // Paged transactions
  const { rows, totalCount } = await getTransactionsPage({
    fiscalYear: selectedYear,
    department:
      department === "all" ? undefined : department,
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

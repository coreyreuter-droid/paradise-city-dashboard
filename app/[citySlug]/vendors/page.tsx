// app/[citySlug]/vendors/page.tsx
import VendorsDashboardClient from "@/components/City/VendorsDashboardClient";
import {
  getTransactionYears,
  getTransactionsForYear,
} from "@/lib/queries";
import type { TransactionRow } from "@/lib/types";

export const revalidate = 0;

// Next 16 can pass searchParams as a Promise, so allow both.
type SearchParamsShape = {
  year?: string;
  q?: string;
};

type PageProps = {
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

export default async function VendorsPage(props: PageProps) {
  const searchParams = await props.searchParams;

  // 1) Years available in data
  const years = await getTransactionYears();
  const defaultYear = years[0] ?? null;

  // 2) Selected year from URL or fall back to latest
  const yearParam = searchParams.year
    ? Number(searchParams.year)
    : undefined;

  const selectedYear =
    yearParam && years.includes(yearParam)
      ? yearParam
      : defaultYear;

  // 3) Vendor query from URL
  const vendorQuery = searchParams.q ?? "";

  // 4) Fetch all transactions for the selected year
  let transactions: TransactionRow[] = [];
  if (selectedYear != null) {
    transactions = await getTransactionsForYear(selectedYear);
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

// components/City/TransactionsDashboardClient.tsx
"use client";

import { FormEvent, useMemo, useState, ChangeEvent } from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import type { TransactionRow } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
import DataTable, {
  DataTableColumn,
} from "../DataTable";
import { cityHref } from "@/lib/cityRouting";

type Props = {
  transactions: TransactionRow[];
  years: number[];
  selectedYear: number | null;
  totalCount: number;
  page: number;
  pageSize: number;
  departments: string[];
  departmentFilter: string | null;
  vendorQuery: string | null;
};

function buildSearchUrl(
  pathname: string,
  currentParams: URLSearchParams,
  updates: {
    year?: string | null;
    department?: string | null;
    q?: string | null;
    page?: string | null;
  }
): string {
  const params = new URLSearchParams(currentParams.toString());

  if (updates.year !== undefined) {
    if (updates.year === null) params.delete("year");
    else params.set("year", updates.year);
  }

  if (updates.department !== undefined) {
    if (!updates.department || updates.department === "all") {
      params.delete("department");
    } else {
      params.set("department", updates.department);
    }
  }

  if (updates.q !== undefined) {
    const trimmed = updates.q?.trim() ?? "";
    if (trimmed.length === 0) params.delete("q");
    else params.set("q", trimmed);
  }

  if (updates.page !== undefined) {
    if (!updates.page || updates.page === "1") {
      params.delete("page");
    } else {
      params.set("page", updates.page);
    }
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function csvSafe(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildPageCsv(rows: TransactionRow[]): string {
  const header = [
    "Date",
    "Fiscal year",
    "Fund code",
    "Fund name",
    "Department",
    "Account code",
    "Account name",
    "Vendor",
    "Description",
    "Amount",
  ];

  const body = rows.map((t) => [
    csvSafe(t.date),
    csvSafe(t.fiscal_year),
    csvSafe(t.fund_code),
    csvSafe(t.fund_name),
    csvSafe(t.department_name),
    csvSafe(t.account_code),
    csvSafe(t.account_name),
    csvSafe(t.vendor),
    csvSafe(t.description),
    csvSafe(t.amount),
  ]);

  return [header.join(","), ...body.map((r) => r.join(","))].join("\n");
}

export default function TransactionsDashboardClient({
  transactions,
  years,
  selectedYear,
  totalCount,
  page,
  pageSize,
  departments,
  departmentFilter,
  vendorQuery,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vendorInput, setVendorInput] = useState<string>(
    vendorQuery ?? ""
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const effectiveDeptFilter =
    departmentFilter && departmentFilter.length > 0
      ? departmentFilter
      : "all";

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (selectedYear != null) {
      filters.push(`Year ${selectedYear}`);
    }
    if (effectiveDeptFilter && effectiveDeptFilter !== "all") {
      filters.push(`Department: ${effectiveDeptFilter}`);
    }
    if (vendorQuery && vendorQuery.trim().length > 0) {
      filters.push(`Vendor contains “${vendorQuery.trim()}”`);
    }
    return filters;
  }, [selectedYear, effectiveDeptFilter, vendorQuery]);

  // /api/transactions/export?year=...&department=...&q=...
  const exportAllHref = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedYear != null) {
      params.set("year", String(selectedYear));
    }
    if (effectiveDeptFilter && effectiveDeptFilter !== "all") {
      params.set("department", effectiveDeptFilter);
    }
    if (vendorQuery && vendorQuery.trim().length > 0) {
      params.set("q", vendorQuery.trim());
    }
    const qs = params.toString();
    return qs
      ? `/api/transactions/export?${qs}`
      : `/api/transactions/export`;
  }, [selectedYear, effectiveDeptFilter, vendorQuery]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const url = buildSearchUrl(pathname, searchParams, {
      q: vendorInput,
      page: "1",
    });
    router.push(url);
  };

  const handleClearFilters = () => {
    const url = buildSearchUrl(pathname, searchParams, {
      year: null,
      department: null,
      q: null,
      page: "1",
    });
    router.push(url);
  };

  const handleDepartmentChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const url = buildSearchUrl(pathname, searchParams, {
      department: value,
      page: "1",
    });
    router.push(url);
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, newPage));
    const url = buildSearchUrl(pathname, searchParams, {
      page: String(clamped),
    });
    router.push(url);
  };

  const handleDownloadPageCsv = () => {
    if (transactions.length === 0) return;
    const csv = buildPageCsv(transactions);
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_page_${page}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns: DataTableColumn<TransactionRow>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        sortable: true,
        sortAccessor: (row) => row.date,
        headerClassName: "w-28",
        cellClassName: "whitespace-nowrap font-mono text-xs",
        cell: (row) => formatDate(row.date),
      },
      {
        key: "department",
        header: "Department",
        sortable: true,
        sortAccessor: (row) =>
          (row.department_name || "").toLowerCase(),
        cellClassName: "whitespace-nowrap",
        cell: (row) =>
          row.department_name ? (
            <Link
              className="text-sky-700 hover:underline"
              href={`${cityHref(
                `/departments/${encodeURIComponent(row.department_name)}`
              )}${selectedYear ? `?year=${selectedYear}` : ""}`}
            >
              {row.department_name}
            </Link>
          ) : (
            <span className="italic text-slate-400">
              Unspecified
            </span>
          ),
      },
      {
        key: "account",
        header: "Account",
        sortable: true,
        sortAccessor: (row) =>
          (row.account_name || "").toLowerCase(),
        cellClassName: "whitespace-nowrap",
        cell: (row) =>
          row.account_name ? (
            <span>{row.account_name}</span>
          ) : (
            <span className="italic text-slate-400">
              Unspecified
            </span>
          ),
      },
      {
        key: "vendor",
        header: "Vendor",
        sortable: true,
        sortAccessor: (row) =>
          (row.vendor || "").toLowerCase(),
        cellClassName: "whitespace-nowrap",
        cell: (row) =>
          row.vendor ? (
            <span>{row.vendor}</span>
          ) : (
            <span className="italic text-slate-400">
              Unspecified
            </span>
          ),
      },
      {
        key: "description",
        header: "Description",
        sortable: true,
        sortAccessor: (row) =>
          (row.description || "").toLowerCase(),
        cellClassName: "max-w-[320px]",
        cell: (row) =>
          row.description ? (
            <span>{row.description}</span>
          ) : (
            <span className="italic text-slate-400">
              Unspecified
            </span>
          ),
      },
      {
        key: "amount",
        header: "Amount",
        sortable: true,
        sortAccessor: (row) => row.amount,
        headerClassName: "text-right",
        cellClassName: "whitespace-nowrap text-right font-mono",
        cell: (row) => formatCurrency(row.amount),
      },
    ],
    [selectedYear]
  );

  const yearLabel =
    selectedYear ?? (years.length > 0 ? years[0] : undefined);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          eyebrow="Transactions"
          title="Spending Detail"
          description="Search, filter, and export individual transactions for the selected fiscal year."
          rightSlot={
            years.length > 0 ? (
              <FiscalYearSelect
                options={years}
                label="Fiscal year"
              />
            ) : null
          }
        />

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 px-1 text-xs text-slate-500"
        >
          <ol className="flex items-center gap-1">
            <li>
      <Link
        href={cityHref("/overview")}
        className="hover:text-slate-800"
      >
        Home
      </Link>

            </li>
            <li aria-hidden="true" className="text-slate-400">
              ›
            </li>
            <li aria-current="page">
              <span className="font-medium text-slate-700">
                Transactions
              </span>
            </li>
          </ol>
        </nav>

        <div className="space-y-6">
          {/* Filters + summary */}
          <CardContainer>
            <section
              aria-label="Transaction filters"
              className="space-y-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Filters
                  </h2>
                  <p className="text-xs text-slate-500">
                    Narrow the list of transactions by department and
                    vendor. Fiscal year is controlled in the header.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  {/* Department select */}
                  <div className="w-full min-w-[180px] sm:w-56">
                    <label
                      htmlFor="department-filter"
                      className="mb-1 block text-xs font-medium text-slate-700"
                    >
                      Department
                    </label>
                    <select
                      id="department-filter"
                      value={effectiveDeptFilter}
                      onChange={handleDepartmentChange}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="all">All departments</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vendor search */}
                  <form
                    onSubmit={handleSearchSubmit}
                    className="flex w-full min-w-[220px] flex-col gap-1 sm:w-64"
                    aria-label="Vendor search"
                  >
                    <label
                      htmlFor="vendor-search"
                      className="text-xs font-medium text-slate-700"
                    >
                      Vendor contains
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="vendor-search"
                        type="search"
                        value={vendorInput}
                        onChange={(e) =>
                          setVendorInput(e.target.value)
                        }
                        className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        placeholder="e.g. Utilities Inc"
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-sky-600 bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1"
                      >
                        Apply
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Active filters summary */}
              <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {activeFilters.length === 0 ? (
                    <span>
                      No filters applied. Showing transactions for{" "}
                      {yearLabel ?? "all available years"}.
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        Active filters:
                      </span>
                      {activeFilters.map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="self-start rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1"
                >
                  Clear all filters
                </button>
              </div>
            </section>
          </CardContainer>

          {/* Table + export + pagination */}
          <CardContainer>
            <section
              aria-label="Transactions list"
              className="space-y-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Transactions
                  </h2>
                  <p className="text-xs text-slate-500">
                    {totalCount.toLocaleString("en-US")} transaction
                    {totalCount === 1 ? "" : "s"} found. Page {page} of{" "}
                    {totalPages}. Use the export options to download
                    data as CSV.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPageCsv}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1"
                  >
                    Download this page (CSV)
                  </button>
                  <a
                    href={exportAllHref}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1"
                  >
                    Download all results
                  </a>
                </div>
              </div>

              {transactions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No transactions available for the selected filters.
                </p>
              ) : (
                <DataTable<TransactionRow>
                  data={transactions}
                  columns={columns}
                  initialSortKey="date"
                  initialSortDirection="desc"
                  getRowKey={(row, index) =>
                    `${row.date}-${row.vendor ?? ""}-${row.amount}-${index}`
                  }
                  showPagination={false}
                />
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-3 flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600 sm:flex-row">
                  <div>
                    Showing{" "}
                    <span className="font-semibold">
                      {transactions.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold">
                      {totalCount.toLocaleString("en-US")}
                    </span>{" "}
                    transactions on this page.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => hasPrev && handlePageChange(page - 1)}
                      disabled={!hasPrev}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span>
                      Page{" "}
                      <span className="font-semibold">{page}</span> of{" "}
                      <span className="font-semibold">
                        {totalPages}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => hasNext && handlePageChange(page + 1)}
                      disabled={!hasNext}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>
          </CardContainer>
        </div>
      </div>
    </div>
  );
}

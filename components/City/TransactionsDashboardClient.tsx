// components/City/TransactionsDashboardClient.tsx
"use client";

import { useState, FormEvent } from "react";
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

type Props = {
  transactions: TransactionRow[];
  years: number[];
  page: number;
  pageSize: number;
  totalCount: number;
  departments: string[];
  selectedYear?: number;
  departmentFilter?: string;
  vendorQuery?: string;
};

export default function TransactionsDashboardClient({
  transactions,
  years,
  page,
  pageSize,
  totalCount,
  departments,
  selectedYear,
  departmentFilter,
  vendorQuery,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [vendorInput, setVendorInput] =
    useState<string>(vendorQuery ?? "");

  const totalPages =
    totalCount === 0
      ? 1
      : Math.max(1, Math.ceil(totalCount / pageSize));

  const buildUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    Object.entries(updates).forEach(
      ([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
    );

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const handleYearChange = (year: number | undefined) => {
    const url = buildUrl({
      year: year ? String(year) : null,
      page: "1",
    });
    router.push(url);
  };

  const handleDepartmentChange = (
    value: string
  ) => {
    const url = buildUrl({
      department:
        value === "all" ? null : value,
      page: "1",
    });
    router.push(url);
  };

  const handleVendorQuerySubmit = (
    e: FormEvent
  ) => {
    e.preventDefault();
    const value = vendorInput.trim();
    const url = buildUrl({
      vendor: value.length ? value : null,
      page: "1",
    });
    router.push(url);
  };

  const handleClearFilters = () => {
    const url = buildUrl({
      year: null,
      department: null,
      vendor: null,
      page: "1",
    });
    router.push(url);
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(
      1,
      Math.min(totalPages, newPage)
    );
    const url = buildUrl({
      page: String(clamped),
    });
    router.push(url);
  };

  const columns: DataTableColumn<TransactionRow>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortAccessor: (row) => row.date,
      cell: (row) => formatDate(row.date),
      headerClassName: "w-28",
      cellClassName:
        "whitespace-nowrap font-mono text-xs",
    },
    {
      key: "vendor",
      header: "Vendor",
      sortable: true,
      sortAccessor: (row) =>
        (row.vendor || "").toLowerCase(),
      cell: (row) =>
        row.vendor || (
          <span className="italic text-slate-400">
            Unspecified
          </span>
        ),
      headerClassName: "min-w-[160px]",
      cellClassName: "whitespace-nowrap",
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      sortAccessor: (row) =>
        (row.department_name || "").toLowerCase(),
      cell: (row) =>
        row.department_name ? (
          <Link
            className="text-sky-700 hover:underline"
            href={`/paradise/departments/${encodeURIComponent(
              row.department_name
            )}${
              selectedYear
                ? `?year=${selectedYear}`
                : ""
            }`}
          >
            {row.department_name}
          </Link>
        ) : (
          <span className="italic text-slate-400">
            Unspecified
          </span>
        ),
      headerClassName: "min-w-[200px]",
    },
    {
      key: "account",
      header: "Account",
      sortable: true,
      sortAccessor: (row) =>
        `${row.account_code || ""} ${
          row.account_name || ""
        }`.toLowerCase(),
      cell: (row) => (
        <div>
          <div className="font-mono text-xs text-slate-600">
            {row.account_code || "—"}
          </div>
          <div className="text-xs">
            {row.account_name || (
              <span className="italic text-slate-400">
                Unspecified
              </span>
            )}
          </div>
        </div>
      ),
      headerClassName: "min-w-[200px]",
    },
    {
      key: "description",
      header: "Description",
      sortable: true,
      sortAccessor: (row) =>
        (row.description || "").toLowerCase(),
      cell: (row) =>
        row.description || (
          <span className="italic text-slate-400">
            No description
          </span>
        ),
      headerClassName: "min-w-[240px]",
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      sortAccessor: (row) => row.amount,
      cell: (row) => (
        <div className="text-right font-mono">
          {formatCurrency(row.amount)}
        </div>
      ),
      headerClassName: "w-32 text-right",
      cellClassName: "text-right",
    },
  ];

  const hasYearFilter = !!selectedYear;
  const hasDepartmentFilter =
    departmentFilter && departmentFilter !== "all";
  const hasVendorFilter =
    vendorQuery && vendorQuery.trim().length > 0;
  const hasAnyFilter =
    hasYearFilter ||
    hasDepartmentFilter ||
    hasVendorFilter;

  const handleExportCsv = () => {
    if (!transactions.length) return;

    const safe = (value: unknown) =>
      value === null ||
      value === undefined
        ? ""
        : String(value);

    const header = [
      "date",
      "fiscal_year",
      "fund_code",
      "fund_name",
      "department_code",
      "department_name",
      "account_code",
      "account_name",
      "vendor",
      "description",
      "amount",
    ];

    const rows = transactions.map((t) => [
      safe(t.date),
      safe(t.fiscal_year),
      safe(t.fund_code),
      safe(t.fund_name),
      safe(t.department_code),
      safe(t.department_name),
      safe(t.account_code),
      safe(t.account_name),
      safe(t.vendor),
      safe(t.description),
      safe(t.amount),
    ]);

    const csvContent = [
      header.join(","),
      ...rows.map((r) =>
        r
          .map((cell) => {
            const str = String(cell);
            if (str.includes(",") || str.includes('"')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "transactions-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          eyebrow="Spending explorer"
          title="Transactions"
          description="Explore individual transactions with filters by year, department, and vendor."
          rightSlot={
            years.length > 0 ? (
              <FiscalYearSelect
                options={years}
                label="Fiscal year"
              />
            ) : null
          }
        />

        {/* BREADCRUMB: Overview › Transactions */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-1 text-[11px] text-slate-500 px-1"
        >
          <Link
            href="/paradise"
            className="hover:text-slate-800"
          >
            Overview
          </Link>
          <span className="text-slate-400">
            ›
          </span>
          <span className="font-medium text-slate-700">
            Transactions
          </span>
        </nav>

        <CardContainer>
          {/* Filters */}
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {/* Department */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Department
                </label>
                <select
                  value={
                    departmentFilter ?? "all"
                  }
                  onChange={(e) =>
                    handleDepartmentChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="all">
                    All departments
                  </option>
                  {departments.map((dept) => (
                    <option
                      key={dept}
                      value={dept}
                    >
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendor search */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Vendor
                </label>
                <form
                  onSubmit={
                    handleVendorQuerySubmit
                  }
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={vendorInput}
                    onChange={(e) =>
                      setVendorInput(
                        e.target.value
                      )
                    }
                    placeholder="Search by vendor name"
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="submit"
                    className="whitespace-nowrap rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                  >
                    Apply
                  </button>
                </form>
                {hasVendorFilter && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    Showing vendors matching{" "}
                    <span className="font-mono">
                      “{vendorQuery}”
                    </span>
                    .
                  </div>
                )}
              </div>
            </div>

            {/* Active filters + clear */}
            {hasAnyFilter && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Active filters:
                  </span>
                  {hasYearFilter && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5">
                      Year:{" "}
                      <span className="font-mono">
                        {selectedYear}
                      </span>
                    </span>
                  )}
                  {hasDepartmentFilter && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5">
                      Department:{" "}
                      <span className="font-mono">
                        {departmentFilter}
                      </span>
                    </span>
                  )}
                  {hasVendorFilter && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5">
                      Vendor:{" "}
                      <span className="font-mono">
                        “{vendorQuery}”
                      </span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </CardContainer>

        {/* Table */}
        <CardContainer>
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-600">
                {totalCount > 0 ? (
                  <>
                    Showing{" "}
                    <span className="font-semibold">
                      {transactions.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold">
                      {totalCount}
                    </span>{" "}
                    transaction
                    {totalCount === 1
                      ? ""
                      : "s"}
                    {hasAnyFilter ? (
                      <>
                        {" "}
                        matching filters.
                      </>
                    ) : (
                      " for the selected year."
                    )}
                  </>
                ) : (
                  "No transactions found for the selected filters."
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={
                    transactions.length === 0
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
                >
                  Download this page as CSV
                </button>
                <a
                  href={buildUrl({
                    export: "csv",
                  })}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
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
              <>
                <DataTable<TransactionRow>
                  data={transactions}
                  columns={columns}
                  initialSortKey="date"
                  initialSortDirection="desc"
                  getRowKey={(row, idx) =>
                    `${row.date}-${row.vendor}-${idx}`
                  }
                />

                {/* Pagination */}
                <div className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    Page{" "}
                    <span className="font-semibold">
                      {page}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold">
                      {totalPages}
                    </span>
                    .
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() =>
                        handlePageChange(page - 1)
                      }
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={
                        page >= totalPages
                      }
                      onClick={() =>
                        handlePageChange(page + 1)
                      }
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContainer>
      </div>
    </div>
  );
}

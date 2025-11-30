"use client";

import { useMemo, useState, FormEvent } from "react";
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
  selectedYear?: number;
  totalCount: number;
  page: number;
  pageSize: number;
  departments: string[];
  departmentFilter: string; // "all" or dept name
  vendorQuery: string;
};

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [vendorInput, setVendorInput] =
    useState<string>(vendorQuery ?? "");

  const totalPages =
    totalCount === 0
      ? 1
      : Math.max(1, Math.ceil(totalCount / pageSize));

  const currentYearLabel =
    selectedYear ?? (years.length > 0 ? years[0] : undefined);

  // Helper to push updated query params
  const updateQuery = (patch: {
    [key: string]: string | undefined;
  }) => {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    Object.entries(patch).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === "" ||
        value === "all"
      ) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleDepartmentChange = (deptValue: string) => {
    updateQuery({
      department: deptValue,
      page: "1",
    });
  };

  const handleVendorSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateQuery({
      q: vendorInput.trim() || undefined,
      page: "1",
    });
  };

  const handlePageChange = (nextPage: number) => {
    const safe = Math.min(
      Math.max(1, nextPage),
      totalPages
    );
    updateQuery({ page: String(safe) });
  };

  const clearFilters = () => {
    updateQuery({
      year: undefined,
      department: undefined,
      q: undefined,
      page: "1",
    });
    setVendorInput("");
  };

  const columns: DataTableColumn<TransactionRow>[] =
    useMemo(
      () => [
        {
          key: "date",
          header: "Date",
          sortable: true,
          sortAccessor: (row) => row.date,
          cell: (row) => (
            <span className="whitespace-nowrap font-mono text-xs text-slate-700">
              {formatDate(row.date)}
            </span>
          ),
          headerClassName: "w-32",
        },
        {
          key: "department_name",
          header: "Department",
          sortable: true,
          sortAccessor: (row) => row.department_name || "",
          cell: (row) => (
            <span>
              {row.department_name || "Unspecified"}
            </span>
          ),
        },
        {
          key: "vendor",
          header: "Vendor",
          sortable: true,
          sortAccessor: (row) => row.vendor || "",
          cell: (row) => (
            <span className="whitespace-nowrap">
              {row.vendor || "Unspecified"}
            </span>
          ),
        },
        {
          key: "description",
          header: "Description",
          sortable: true,
          sortAccessor: (row) => row.description || "",
          cell: (row) => (
            <span className="block max-w-xl text-slate-700">
              {row.description || "—"}
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
      ],
      []
    );

  const hasYearFilter = !!selectedYear;
  const hasDepartmentFilter =
    departmentFilter && departmentFilter !== "all";
  const hasVendorFilter =
    vendorQuery && vendorQuery.trim().length > 0;
  const hasAnyFilter =
    hasYearFilter || hasDepartmentFilter || hasVendorFilter;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          title="Transactions"
          description="Explore individual transactions with filters by year, department, and vendor."
        />

        <CardContainer>
          {/* Filters */}
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {/* Year */}
              <div>
                {years.length > 0 && (
                  <FiscalYearSelect
                    options={years}
                    label="Fiscal year"
                  />
                )}
              </div>

              {/* Department */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Department
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) =>
                    handleDepartmentChange(e.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="all">
                    All departments
                  </option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendor / description search */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Vendor or description
                </label>
                <form
                  onSubmit={handleVendorSubmit}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={vendorInput}
                    onChange={(e) =>
                      setVendorInput(e.target.value)
                    }
                    placeholder="Search vendor or description…"
                    className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
                  >
                    Apply
                  </button>
                </form>
              </div>
            </div>

            {/* Active filter pills */}
            {hasAnyFilter && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold uppercase tracking-wide text-slate-500">
                  Active filters:
                </span>
                {hasYearFilter && currentYearLabel && (
                  <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-1 font-medium text-sky-700 ring-1 ring-inset ring-sky-100">
                    Year: {currentYearLabel}
                  </span>
                )}
                {hasDepartmentFilter && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
                    Department: {departmentFilter}
                  </span>
                )}
                {hasVendorFilter && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-700 ring-1 ring-inset ring-amber-100">
                    Search: “{vendorQuery}”
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center rounded-full border border-slate-300 px-2 py-1 font-medium text-slate-600 hover:bg-slate-50"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Table + pagination */}
          <div className="mt-6">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">
                No transactions found for the selected
                filters.
              </p>
            ) : (
              <>
                <DataTable<TransactionRow>
                  data={transactions}
                  columns={columns}
                  pageSize={transactions.length}
                  initialSortKey="date"
                  initialSortDirection="desc"
                  getRowKey={(row, idx) =>
                    `${row.date}-${row.vendor}-${idx}`
                  }
                  showPagination={false}
                />

                {/* Server-side pagination controls */}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                  <div>
                    Showing{" "}
                    <span className="font-semibold">
                      {transactions.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold">
                      {totalCount.toLocaleString("en-US")}
                    </span>{" "}
                    transactions.
                  </div>
                  <div className="flex items-center gap-2">
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
                    <span>
                      Page{" "}
                      <span className="font-semibold">
                        {page}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold">
                        {totalPages}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
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
    </main>
  );
}

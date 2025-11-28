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
  selectedYear, // currently not used directly; year is driven off searchParams + FiscalYearSelect
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
      : Math.ceil(totalCount / pageSize);

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

    // Reset page when filters change unless explicitly set
    if (!("page" in patch)) {
      params.delete("page");
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleDepartmentChange = (
    deptValue: string
  ) => {
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

  const columns: DataTableColumn<TransactionRow>[] =
    useMemo(
      () => [
        {
          key: "date",
          header: "Date",
          sortable: true,
          sortAccessor: (row) => row.date,
          cellClassName: "whitespace-nowrap",
          cell: (row) => formatDate(row.date),
        },
        {
          key: "fiscal_year",
          header: "Fiscal year",
          sortable: true,
          sortAccessor: (row) => row.fiscal_year,
          cellClassName: "whitespace-nowrap",
          cell: (row) => row.fiscal_year,
        },
        {
          key: "department",
          header: "Department",
          sortable: true,
          sortAccessor: (row) =>
            (row.department_name ||
              "Unspecified"
            ).trim(),
          cellClassName: "whitespace-nowrap",
          cell: (row) =>
            row.department_name || "Unspecified",
        },
        {
          key: "vendor",
          header: "Vendor",
          sortable: true,
          sortAccessor: (row) =>
            (row.vendor || "Unspecified").toLowerCase(),
          cellClassName: "whitespace-nowrap",
          cell: (row) =>
            row.vendor || "Unspecified",
        },
        {
          key: "description",
          header: "Description",
          sortable: true,
          sortAccessor: (row) =>
            (row.description || "").toLowerCase(),
          cell: (row) => row.description || "",
        },
        {
          key: "amount",
          header: "Amount",
          sortable: true,
          sortAccessor: (row) =>
            Number(row.amount || 0),
          headerClassName: "text-right",
          cellClassName: "text-right font-mono",
          cell: (row) =>
            formatCurrency(
              Number(row.amount || 0)
            ),
        },
      ],
      []
    );

  const pageTotal = transactions.reduce(
    (sum, t) => sum + Number(t.amount || 0),
    0
  );
  const pageAvg =
    transactions.length === 0
      ? 0
      : pageTotal / transactions.length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          title="Transactions"
          description="Explore individual transactions with filters by year, department, and vendor."
        />

        {/* Filters */}
        <div className="mb-4 grid gap-3 md:grid-cols-3">
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
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) =>
                handleDepartmentChange(
                  e.target.value
                )
              }
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
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
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                className="whitespace-nowrap rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Search
              </button>
            </form>
            {vendorQuery && (
              <p className="mt-1 text-[11px] text-slate-500">
                Active filter: “{vendorQuery}”
              </p>
            )}
          </div>
        </div>

        {/* Metrics (this page) */}
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Transactions (this page)
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {transactions.length.toLocaleString(
                "en-US"
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Total in dataset:{" "}
              {totalCount.toLocaleString("en-US")}
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Total amount (this page)
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(pageTotal)}
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Average transaction (this page)
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(pageAvg)}
            </div>
          </CardContainer>
        </div>

        {/* Table */}
        <CardContainer>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No transactions match the current filters.
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
              <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                <div>
                  Showing{" "}
                  <span className="font-mono">
                    {totalCount === 0
                      ? 0
                      : (page - 1) * pageSize + 1}
                  </span>{" "}
                  –{" "}
                  <span className="font-mono">
                    {Math.min(
                      page * pageSize,
                      totalCount
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-mono">
                    {totalCount.toLocaleString(
                      "en-US"
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() =>
                      handlePageChange(page - 1)
                    }
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span>
                    Page{" "}
                    <span className="font-mono">
                      {page}
                    </span>{" "}
                    /{" "}
                    <span className="font-mono">
                      {totalPages}
                    </span>
                  </span>
                  <button
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
        </CardContainer>
      </div>
    </main>
  );
}

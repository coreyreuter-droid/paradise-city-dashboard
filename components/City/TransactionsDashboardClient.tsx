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
    selectedYear ?? (years.length > 0 ? years[0] : "–");

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

    // If caller didn’t explicitly set page, reset it
    if (!("page" in patch)) {
      params.delete("page");
    }

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

  const columns: DataTableColumn<TransactionRow>[] =
    useMemo(
      () => [
        {
          key: "date",
          header: "Date",
          sortable: true,
          sortAccessor: (row) =>
            new Date(row.date).getTime(),
          cell: (row) => (
            <span className="whitespace-nowrap">
              {formatDate(row.date)}
            </span>
          ),
        },
        {
          key: "department",
          header: "Department",
          sortable: true,
          sortAccessor: (row) =>
            row.department_name || "",
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
          sortable: false,
          cell: (row) => (
            <span className="block max-w-xl truncate">
              {row.description || ""}
            </span>
          ),
        },
        {
          key: "amount",
          header: "Amount",
          sortable: true,
          sortAccessor: (row) => row.amount,
          headerClassName: "text-right",
          cellClassName: "text-right font-mono",
          cell: (row) =>
            formatCurrency(Number(row.amount || 0)),
        },
      ],
      []
    );

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
                handleDepartmentChange(e.target.value)
              }
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
                placeholder="Search text…"
                className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                className="rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-4 text-xs text-slate-600">
          <span className="font-semibold">
            {totalCount.toLocaleString("en-US")}
          </span>{" "}
          transactions in{" "}
          <span className="font-semibold">
            {currentYearLabel}
          </span>
          {departmentFilter !== "all" && (
            <>
              {" "}
              for{" "}
              <span className="font-semibold">
                {departmentFilter}
              </span>
            </>
          )}
          {vendorQuery && (
            <>
              {" "}
              matching{" "}
              <span className="font-semibold">
                “{vendorQuery}”
              </span>
            </>
          )}
        </div>

        {/* Table + server-side pagination */}
        <CardContainer>
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
              <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
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
        </CardContainer>
      </div>
    </main>
  );
}

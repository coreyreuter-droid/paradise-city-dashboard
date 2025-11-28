// components/City/TransactionsDashboardClient.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { TransactionRow } from "@/lib/types";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";

type Props = {
  transactions: TransactionRow[];
};

const PAGE_SIZE = 50;

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export default function TransactionsDashboardClient({ transactions }: Props) {
  const searchParams = useSearchParams();

  // All fiscal years present in transactions
  const years = useMemo(() => {
    const set = new Set<number>();
    transactions.forEach((t) => set.add(t.fiscal_year));
    return Array.from(set).sort((a, b) => b - a);
  }, [transactions]);

  // Selected fiscal year derived from URL (?year=) or default latest
  const selectedYear = useMemo(() => {
    if (years.length === 0) return undefined;
    const param = searchParams.get("year");
    const parsed = param ? Number(param) : NaN;
    if (Number.isFinite(parsed) && years.includes(parsed)) return parsed;
    return years[0];
  }, [searchParams, years]);

  // Department + vendor filters
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [vendorQuery, setVendorQuery] = useState<string>("");

  // Pagination
  const [page, setPage] = useState<number>(1);

  // Unique departments (for dropdown) based on all transactions
  const departments = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      const dept = (t.department_name || "Unspecified").trim();
      if (dept) set.add(dept);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedDept, vendorQuery]);

  // Apply filters
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedYear && t.fiscal_year !== selectedYear) return false;

      if (selectedDept !== "all") {
        const dept = (t.department_name || "Unspecified").trim();
        if (dept !== selectedDept) return false;
      }

      if (vendorQuery.trim().length > 0) {
        const q = vendorQuery.toLowerCase();
        const vendor = (t.vendor || "").toLowerCase();
        const desc = (t.description || "").toLowerCase();
        if (!vendor.includes(q) && !desc.includes(q)) return false;
      }

      return true;
    });
  }, [transactions, selectedYear, selectedDept, vendorQuery]);

  const totalCount = filtered.length;
  const totalPages =
    totalCount === 0 ? 1 : Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Aggregates for metrics
  const totalAmount = filtered.reduce(
    (sum, t) => sum + Number(t.amount || 0),
    0
  );

  const avgAmount =
    filtered.length === 0 ? 0 : totalAmount / filtered.length;

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
              // FiscalYearSelect manages the ?year= param internally
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
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All departments</option>
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
            <input
              type="text"
              value={vendorQuery}
              onChange={(e) => setVendorQuery(e.target.value)}
              placeholder="Search vendor or description…"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Metrics */}
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Transactions (filtered)
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {totalCount.toLocaleString("en-US")}
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Total amount
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(totalAmount)}
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Average transaction
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(avgAmount)}
            </div>
          </CardContainer>
        </div>

        {/* Table */}
        <CardContainer>
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">
              No transactions match the current filters.
            </p>
          ) : (
            <>
              <div className="max-h-[520px] overflow-auto text-sm">
                <table className="min-w-full text-left">
                  <thead className="border-b bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Fiscal year</th>
                      <th className="px-3 py-2">Department</th>
                      <th className="px-3 py-2">Vendor</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paged.map((tx, idx) => (
                      <tr key={`${tx.date}-${tx.vendor}-${idx}`}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {tx.fiscal_year}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {tx.department_name || "Unspecified"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {tx.vendor || "Unspecified"}
                        </td>
                        <td className="px-3 py-2">
                          {tx.description || ""}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(Number(tx.amount || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                <div>
                  Showing{" "}
                  <span className="font-mono">
                    {filtered.length === 0
                      ? 0
                      : (currentPage - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  –{" "}
                  <span className="font-mono">
                    {Math.min(
                      currentPage * PAGE_SIZE,
                      filtered.length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-mono">
                    {filtered.length.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setPage((p) => Math.max(1, p - 1))
                    }
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span>
                    Page{" "}
                    <span className="font-mono">
                      {currentPage}
                    </span>{" "}
                    /{" "}
                    <span className="font-mono">
                      {totalPages}
                    </span>
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setPage((p) =>
                        Math.min(totalPages, p + 1)
                      )
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

// components/City/DepartmentDetailClient.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
import DataTable, {
  DataTableColumn,
} from "../DataTable";

type Props = {
  departmentName?: string;
  budgets: BudgetRow[];
  actuals: ActualRow[];
  transactions: TransactionRow[];
};

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const formatAxisCurrency = (value: number) => {
  if (value === 0) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
};

const formatPercent = (value: number) =>
  `${value.toFixed(1).replace(/-0\.0/, "0.0")}%`;

const normalizeName = (name: string | null | undefined) =>
  (name ?? "").trim().toLowerCase();

type DeptVendorSummary = {
  name: string;
  total: number;
  txCount: number;
  percent: number;
};

type DeptCategorySummary = {
  category: string;
  total: number;
  percent: number;
};

export default function DepartmentDetailClient({
  departmentName,
  budgets,
  actuals,
  transactions,
}: Props) {
  const searchParams = useSearchParams();
  const [activeVendor, setActiveVendor] = useState<string | null>(null);

  // Robust display name: prop → query → first dept in data → fallback label
  const displayName = useMemo(() => {
    if (departmentName && departmentName.trim().length > 0) {
      return departmentName;
    }

    const fromQuery =
      searchParams.get("department") || searchParams.get("dept");
    if (fromQuery && fromQuery.trim().length > 0) {
      return fromQuery;
    }

    const fromBudgets =
      budgets.find((b) => b.department_name)?.department_name;
    if (fromBudgets && fromBudgets.trim().length > 0) {
      return fromBudgets;
    }

    const fromActuals =
      actuals.find((a) => a.department_name)?.department_name;
    if (fromActuals && fromActuals.trim().length > 0) {
      return fromActuals;
    }

    const fromTx =
      transactions.find((t) => t.department_name)?.department_name;
    if (fromTx && fromTx.trim().length > 0) {
      return fromTx;
    }

    return "Department detail";
  }, [departmentName, searchParams, budgets, actuals, transactions]);

  const normalizedDisplay = useMemo(
    () => normalizeName(displayName),
    [displayName]
  );

  // Filter all data by normalized department name
  const deptBudgets = useMemo(
    () =>
      budgets.filter(
        (b) => normalizeName(b.department_name) === normalizedDisplay
      ),
    [budgets, normalizedDisplay]
  );

  const deptActuals = useMemo(
    () =>
      actuals.filter(
        (a) => normalizeName(a.department_name) === normalizedDisplay
      ),
    [actuals, normalizedDisplay]
  );

  // All transactions for this department (across all years)
  const deptTx = useMemo(
    () =>
      transactions.filter(
        (t) => normalizeName(t.department_name) === normalizedDisplay
      ),
    [transactions, normalizedDisplay]
  );

  // Include transaction years in the year list
  const deptYears = useMemo(() => {
    const set = new Set<number>();
    deptBudgets.forEach((b) => set.add(b.fiscal_year));
    deptActuals.forEach((a) => set.add(a.fiscal_year));
    deptTx.forEach((t) => set.add(t.fiscal_year));
    return Array.from(set).sort((a, b) => b - a);
  }, [deptBudgets, deptActuals, deptTx]);

  const selectedYear = useMemo(() => {
    if (deptYears.length === 0) return undefined;
    const param = searchParams.get("year");
    const parsed = param ? Number(param) : NaN;
    if (Number.isFinite(parsed) && deptYears.includes(parsed)) return parsed;
    return deptYears[0];
  }, [searchParams, deptYears]);

  const multiYearSeries = useMemo(() => {
    const byYear = new Map<
      number,
      { year: number; budget: number; actuals: number }
    >();

    deptBudgets.forEach((b) => {
      const year = b.fiscal_year;
      const entry =
        byYear.get(year) || { year, budget: 0, actuals: 0 };
      entry.budget += Number(b.amount || 0);
      byYear.set(year, entry);
    });

    deptActuals.forEach((a) => {
      const year = a.fiscal_year;
      const entry =
        byYear.get(year) || { year, budget: 0, actuals: 0 };
      entry.actuals += Number(a.amount || 0);
      byYear.set(year, entry);
    });

    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [deptBudgets, deptActuals]);

  const selectedYearTotals = useMemo(() => {
    if (!selectedYear) {
      return {
        budget: 0,
        actuals: 0,
        variance: 0,
        percentSpent: 0,
      };
    }

    const totalBudget = deptBudgets
      .filter((b) => b.fiscal_year === selectedYear)
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const totalActuals = deptActuals
      .filter((a) => a.fiscal_year === selectedYear)
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const variance = totalActuals - totalBudget;
    const percentSpent =
      totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;

    return {
      budget: totalBudget,
      actuals: totalActuals,
      variance,
      percentSpent,
    };
  }, [deptBudgets, deptActuals, selectedYear]);

  // Transactions for this department in the selected year
  const deptTxForYear = useMemo(
    () =>
      selectedYear
        ? deptTx
            .filter((t) => t.fiscal_year === selectedYear)
            .sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
        : [],
    [deptTx, selectedYear]
  );

  // Aggregated vendor rollup for this department + year (from transactions)
  const deptVendorSummaries: DeptVendorSummary[] = useMemo(() => {
    if (deptTxForYear.length === 0) return [];

    const byVendor = new Map<string, { total: number; count: number }>();

    deptTxForYear.forEach((tx) => {
      const name =
        tx.vendor && tx.vendor.trim().length > 0
          ? tx.vendor
          : "Unspecified";
      const amt = Number(tx.amount || 0);
      const existing = byVendor.get(name) || { total: 0, count: 0 };
      existing.total += amt;
      existing.count += 1;
      byVendor.set(name, existing);
    });

    const totalDeptSpend = Array.from(byVendor.values()).reduce(
      (sum, v) => sum + v.total,
      0
    );

    return Array.from(byVendor.entries())
      .map(([name, agg]) => ({
        name,
        total: agg.total,
        txCount: agg.count,
        percent:
          totalDeptSpend > 0 ? (agg.total / totalDeptSpend) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [deptTxForYear]);

  // Aggregated category rollup for this department + year (from actuals.category)
  const deptCategorySummaries: DeptCategorySummary[] = useMemo(() => {
    if (!selectedYear) return [];

    const actualsForYear = deptActuals.filter(
      (a) => a.fiscal_year === selectedYear
    );
    if (actualsForYear.length === 0) return [];

    const byCategory = new Map<string, number>();

    actualsForYear.forEach((row) => {
      const cat =
        row.category && row.category.trim().length > 0
          ? row.category
          : "Unspecified";
      const amt = Number(row.amount || 0);
      byCategory.set(cat, (byCategory.get(cat) || 0) + amt);
    });

    const total = Array.from(byCategory.values()).reduce(
      (sum, v) => sum + v,
      0
    );

    return Array.from(byCategory.entries())
      .map(([category, totalAmt]) => ({
        category,
        total: totalAmt,
        percent: total > 0 ? (totalAmt / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [deptActuals, selectedYear]);

  // Active vendor transactions (for slideout)
  const activeVendorTx = useMemo(() => {
    if (!activeVendor) return [];
    return deptTxForYear.filter(
      (t) =>
        (t.vendor && t.vendor.trim().length > 0
          ? t.vendor
          : "Unspecified") === activeVendor
    );
  }, [activeVendor, deptTxForYear]);

  const transactionColumns: DataTableColumn<TransactionRow>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        sortable: true,
        sortAccessor: (row) => row.date,
        cellClassName: "whitespace-nowrap",
        cell: (row) => row.date,
      },
      {
        key: "vendor",
        header: "Vendor",
        sortable: true,
        sortAccessor: (row) =>
          (row.vendor || "Unspecified").toLowerCase(),
        cellClassName: "whitespace-nowrap",
        cell: (row) => {
          const name = row.vendor || "Unspecified";
          return (
            <button
              type="button"
              onClick={() => setActiveVendor(name)}
              className="whitespace-nowrap text-sky-700 hover:underline"
            >
              {name}
            </button>
          );
        },
      },
      {
        key: "description",
        header: "Description",
        sortable: true,
        sortAccessor: (row) =>
          (row.description || "").toLowerCase(),
        cellClassName: "",
        cell: (row) => row.description || "",
      },
      {
        key: "amount",
        header: "Amount",
        sortable: true,
        sortAccessor: (row) => Number(row.amount || 0),
        headerClassName: "text-right",
        cellClassName:
          "text-right font-mono whitespace-nowrap",
        cell: (row) =>
          formatCurrency(Number(row.amount || 0)),
      },
    ],
    []
  );

  const vendorTotal = useMemo(
    () =>
      activeVendorTx.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0
      ),
    [activeVendorTx]
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          eyebrow="Department overview"
          title={displayName}
          description="Multi-year trends and detailed transactions for this department."
          rightSlot={
            deptYears.length > 0 ? (
              <FiscalYearSelect
                options={deptYears}
                label="Fiscal year"
              />
            ) : null
          }
        />

        {/* BREADCRUMB: Overview › Departments › [Department] */}
        <div className="mb-4 flex items-center gap-1 text-[11px] text-slate-500 px-1">
          <Link
            href="/paradise"
            className="hover:text-slate-800"
          >
            Overview
          </Link>
          <span className="text-slate-400">›</span>
          <Link
            href="/paradise/departments"
            className="hover:text-slate-800"
          >
            Departments
          </Link>
          <span className="text-slate-400">›</span>
          <span className="font-medium text-slate-700">
            {displayName}
          </span>
        </div>

        {/* Metrics */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <CardContainer>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Total Budget ({selectedYear ?? "–"})
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(selectedYearTotals.budget)}
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Total Actuals ({selectedYear ?? "–"})
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(selectedYearTotals.actuals)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {formatPercent(selectedYearTotals.percentSpent)} of budget
              spent
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Variance ({selectedYear ?? "–"})
            </div>
            <div
              className={`mt-1 text-2xl font-bold ${
                selectedYearTotals.variance > 0
                  ? "text-emerald-700"
                  : selectedYearTotals.variance < 0
                  ? "text-red-700"
                  : "text-slate-900"
              }`}
            >
              {formatCurrency(selectedYearTotals.variance)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Positive = under budget; negative = over budget.
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Transactions ({selectedYear ?? "–"})
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {deptTxForYear.length.toLocaleString("en-US")}
            </div>
          </CardContainer>
        </div>

        {/* Multi-year chart */}
        <div className="mb-6">
          <CardContainer>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Multi-year budget vs actuals
                </h2>
                <p className="text-xs text-slate-500">
                  Trend of adopted budget compared to actual spending for
                  this department.
                </p>
              </div>
            </div>

            {multiYearSeries.length === 0 ? (
              <p className="text-sm text-slate-500">
                No budget/actuals data available for this department.
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={multiYearSeries.map((d) => ({
                      year: d.year,
                      Budget: d.budget,
                      Actuals: d.actuals,
                    }))}
                    margin={{
                      top: 10,
                      right: 16,
                      left: 0,
                      bottom: 20,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="year"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                    />
                    <YAxis
                      tickFormatter={formatAxisCurrency}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      width={80}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      labelFormatter={(label) =>
                        `Fiscal year ${label}`
                      }
                      formatter={(value: any, name) =>
                        typeof value === "number"
                          ? [formatCurrency(value), name]
                          : [value, name]
                      }
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Budget"
                      dot={false}
                      strokeWidth={2}
                      stroke="#3b82f6"
                    />
                    <Line
                      type="monotone"
                      dataKey="Actuals"
                      dot={false}
                      strokeWidth={2}
                      stroke="#111827"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContainer>
        </div>

        {/* Transactions + Category + Vendor rollup */}
        <CardContainer>
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Transactions ({selectedYear ?? "–"})
              </h2>
              <p className="text-xs text-slate-500">
                Category and vendor breakdowns, plus detailed transactions
                for this department in the selected fiscal year.
              </p>
            </div>
          </div>

          {/* Top categories for this department & year (from actuals) */}
          {deptCategorySummaries.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Top spending categories (actuals) — {selectedYear ?? "–"}
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm">
                {deptCategorySummaries.map((c) => (
                  <li key={c.category}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate pr-2">{c.category}</span>
                      <span className="whitespace-nowrap font-mono">
                        {formatCurrency(c.total)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-slate-700"
                          style={{
                            width: `${Math.max(
                              2,
                              Math.min(c.percent, 100)
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="w-12 text-right text-[11px] text-slate-500">
                        {formatPercent(c.percent)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top vendors for this department & year */}
          {deptVendorSummaries.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Top vendors for this department ({selectedYear ?? "–"})
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm">
                {deptVendorSummaries.map((v) => (
                  <li key={v.name}>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveVendor(v.name)}
                        className="truncate pr-2 text-left text-sky-700 hover:underline"
                      >
                        {v.name}
                      </button>
                      <span className="whitespace-nowrap font-mono">
                        {formatCurrency(v.total)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-sky-500"
                          style={{
                            width: `${Math.max(
                              2,
                              Math.min(v.percent, 100)
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="w-12 text-right text-[11px] text-slate-500">
                        {formatPercent(v.percent)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {v.txCount.toLocaleString("en-US")} transaction
                      {v.txCount === 1 ? "" : "s"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {deptTxForYear.length === 0 ? (
            <p className="text-sm text-slate-500">
              No transactions found for this year.
            </p>
          ) : (
            <div className="max-h-[480px] overflow-auto text-sm">
              <DataTable<TransactionRow>
                data={deptTxForYear}
                columns={transactionColumns}
                pageSize={50}
                initialSortKey="date"
                initialSortDirection="desc"
                getRowKey={(row, idx) =>
                  `${row.date}-${row.vendor}-${idx}`
                }
                showPagination={deptTxForYear.length > 50}
              />
            </div>
          )}
        </CardContainer>
      </div>

      {/* Vendor slideout */}
      {activeVendor && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Vendor detail
                </p>
                <h2 className="text-sm font-semibold text-slate-900">
                  {activeVendor}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {displayName} • Fiscal year {selectedYear ?? "–"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveVendor(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              >
                Close
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-3 overflow-auto px-4 py-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Total spent with this vendor
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {formatCurrency(vendorTotal)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {activeVendorTx.length.toLocaleString("en-US")}{" "}
                  transaction{activeVendorTx.length === 1 ? "" : "s"} for
                  this department in {selectedYear ?? "–"}.
                </div>
              </div>

              {activeVendorTx.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No transactions found for this vendor in the selected
                  year.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Transactions with {activeVendor}
                  </p>
                  <div className="max-h-[360px] overflow-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                          <th className="px-2 py-2 font-semibold text-slate-700">
                            Date
                          </th>
                          <th className="px-2 py-2 font-semibold text-slate-700">
                            Description
                          </th>
                          <th className="px-2 py-2 text-right font-semibold text-slate-700">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeVendorTx.map((tx, idx) => (
                          <tr
                            key={`${tx.date}-${tx.amount}-${idx}`}
                            className="border-b border-slate-100 align-top"
                          >
                            <td className="whitespace-nowrap px-2 py-2 font-mono">
                              {tx.date}
                            </td>
                            <td className="px-2 py-2">
                              {tx.description || "—"}
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              {formatCurrency(
                                Number(tx.amount || 0)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

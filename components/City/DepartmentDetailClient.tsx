// components/City/DepartmentDetailClient.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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

export default function DepartmentDetailClient({
  departmentName,
  budgets,
  actuals,
  transactions,
}: Props) {
  const searchParams = useSearchParams();

  // Robust display name: prop → query → first dept in data → fallback label
  const displayName = useMemo(() => {
    if (departmentName && departmentName.trim().length > 0) {
      return departmentName;
    }

    const fromQuery =
      searchParams.get("department") ||
      searchParams.get("dept");
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
      transactions.find((t) => t.department_name)
        ?.department_name;
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
        (b) =>
          normalizeName(b.department_name) ===
          normalizedDisplay
      ),
    [budgets, normalizedDisplay]
  );

  const deptActuals = useMemo(
    () =>
      actuals.filter(
        (a) =>
          normalizeName(a.department_name) ===
          normalizedDisplay
      ),
    [actuals, normalizedDisplay]
  );

  // 🔑 NEW: all transactions for this department (across all years)
  const deptTx = useMemo(
    () =>
      transactions.filter(
        (t) =>
          normalizeName(t.department_name) ===
          normalizedDisplay
      ),
    [transactions, normalizedDisplay]
  );

  // 🔑 UPDATED: include transaction years in the year list
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
    if (Number.isFinite(parsed) && deptYears.includes(parsed))
      return parsed;
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

    return Array.from(byYear.values()).sort(
      (a, b) => a.year - b.year
    );
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
      .reduce(
        (sum, b) => sum + Number(b.amount || 0),
        0
      );

    const totalActuals = deptActuals
      .filter((a) => a.fiscal_year === selectedYear)
      .reduce(
        (sum, a) => sum + Number(a.amount || 0),
        0
      );

    const variance = totalActuals - totalBudget;
    const percentSpent =
      totalBudget === 0
        ? 0
        : (totalActuals / totalBudget) * 100;

    return {
      budget: totalBudget,
      actuals: totalActuals,
      variance,
      percentSpent,
    };
  }, [deptBudgets, deptActuals, selectedYear]);

  // 🔑 UPDATED: filter from deptTx, not entire transactions
  const deptTxForYear = useMemo(
    () =>
      selectedYear
        ? deptTx
            .filter((t) => t.fiscal_year === selectedYear)
            .sort(
              (a, b) =>
                new Date(b.date).getTime() -
                new Date(a.date).getTime()
            )
        : [],
    [deptTx, selectedYear]
  );

  const transactionColumns: DataTableColumn<TransactionRow>[] =
    useMemo(
      () => [
        {
          key: "date",
          header: "Date",
          sortable: true,
          sortAccessor: (row) => row.date,
          cellClassName: "whitespace-nowrap",
          cell: (row) => row.date, // keep raw string to avoid hydration issues
        },
        {
          key: "vendor",
          header: "Vendor",
          sortable: true,
          sortAccessor: (row) =>
            (row.vendor || "Unspecified").toLowerCase(),
          cellClassName: "whitespace-nowrap",
          cell: (row) => row.vendor || "Unspecified",
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

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          title={displayName}
          description="Multi-year trends and detailed transactions for this department."
        />

        {deptYears.length > 0 && (
          <div className="mb-4">
            {/* FiscalYearSelect handles ?year= via router internally */}
            <FiscalYearSelect
              options={deptYears}
              label="Fiscal year"
            />
          </div>
        )}

        {/* Metrics */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Total Budget ({selectedYear ?? "–"})
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(selectedYearTotals.budget)}
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
              Total Actuals ({selectedYear ?? "–"})
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(selectedYearTotals.actuals)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {formatPercent(
                selectedYearTotals.percentSpent
              )}{" "}
              of budget spent
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
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
              {formatCurrency(
                selectedYearTotals.variance
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Positive = under budget; negative = over
              budget.
            </div>
          </CardContainer>

          <CardContainer>
            <div className="text-xs font-semibold uppercase text-slate-500">
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
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              Multi-year budget vs actuals
            </h2>
            {multiYearSeries.length === 0 ? (
              <p className="text-sm text-slate-500">
                No budget/actuals data available for this
                department.
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={multiYearSeries.map((d) => ({
                      year: d.year,
                      Budget: d.budget,
                      Actuals: d.actuals,
                    }))}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 20,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis dataKey="year" />
                    <YAxis
                      tickFormatter={formatAxisCurrency}
                      tick={{ fontSize: 12 }}
                      width={90}
                    />
                    <Tooltip
                      formatter={(value: any) =>
                        typeof value === "number"
                          ? formatCurrency(value)
                          : value
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="Budget"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Actuals"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContainer>
        </div>

        {/* Transactions table */}
        <CardContainer>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            Transactions ({selectedYear ?? "–"})
          </h2>
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
                showPagination={
                  deptTxForYear.length > 50
                }
              />
            </div>
          )}
        </CardContainer>
      </div>
    </main>
  );
}

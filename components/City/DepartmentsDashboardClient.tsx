// components/City/DepartmentsDashboardClient.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { formatCurrency, formatPercent } from "@/lib/format";

type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  variance: number;
  percentSpent: number;
  txCount: number;
};

type Props = {
  budgets: BudgetRow[];
  actuals: ActualRow[];
  transactions: TransactionRow[];
};

function fy(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function DepartmentsDashboardClient({
  budgets,
  actuals,
  transactions,
}: Props) {
  const searchParams = useSearchParams();

  // Collect available fiscal years from all three sources
  const years = useMemo(() => {
    const set = new Set<number>();

    budgets.forEach((b) => {
      const y = fy(b.fiscal_year);
      if (y !== null) set.add(y);
    });

    actuals.forEach((a) => {
      const y = fy(a.fiscal_year);
      if (y !== null) set.add(y);
    });

    transactions.forEach((t) => {
      const y = fy(t.fiscal_year);
      if (y !== null) set.add(y);
    });

    return Array.from(set).sort((a, b) => b - a);
  }, [budgets, actuals, transactions]);

  const selectedYear = useMemo(() => {
    if (!years.length) return null;

    const param = searchParams.get("year");
    if (!param) return years[0];

    const parsed = Number(param);
    if (!Number.isFinite(parsed)) return years[0];

    if (years.includes(parsed)) return parsed;
    return years[0];
  }, [searchParams, years]);

  const yearLabel = selectedYear ?? (years.length > 0 ? years[0] : undefined);

  // Filter rows to selected year
  const budgetsForYear = useMemo(
    () =>
      selectedYear == null
        ? []
        : budgets.filter((b) => fy(b.fiscal_year) === selectedYear),
    [budgets, selectedYear]
  );

  const actualsForYear = useMemo(
    () =>
      selectedYear == null
        ? []
        : actuals.filter((a) => fy(a.fiscal_year) === selectedYear),
    [actuals, selectedYear]
  );

  const txForYear = useMemo(
    () =>
      selectedYear == null
        ? []
        : transactions.filter(
            (t) => fy(t.fiscal_year) === selectedYear
          ),
    [transactions, selectedYear]
  );

  // Aggregate per-department metrics
  const summaries: DepartmentSummary[] = useMemo(() => {
    if (selectedYear == null) return [];

    const budgetByDept = new Map<string, number>();
    const actualsByDept = new Map<string, number>();
    const txCountByDept = new Map<string, number>();

    budgetsForYear.forEach((row) => {
      const dept = row.department_name || "Unspecified";
      const amt = Number(row.amount || 0);
      budgetByDept.set(
        dept,
        (budgetByDept.get(dept) || 0) + amt
      );
    });

    actualsForYear.forEach((row) => {
      const dept = row.department_name || "Unspecified";
      const amt = Number(row.amount || 0);
      actualsByDept.set(
        dept,
        (actualsByDept.get(dept) || 0) + amt
      );
    });

    txForYear.forEach((tx) => {
      const dept = tx.department_name || "Unspecified";
      txCountByDept.set(
        dept,
        (txCountByDept.get(dept) || 0) + 1
      );
    });

    const allDepts = Array.from(
      new Set([
        ...budgetByDept.keys(),
        ...actualsByDept.keys(),
        ...txCountByDept.keys(),
      ])
    );

    const rows: DepartmentSummary[] = allDepts.map(
      (dept) => {
        const budget = budgetByDept.get(dept) || 0;
        const actuals = actualsByDept.get(dept) || 0;
        const variance = actuals - budget;
        const percentSpent =
          budget === 0 ? 0 : Math.min((actuals / budget) * 100, 999);
        const txCount = txCountByDept.get(dept) || 0;

        return {
          department_name: dept,
          budget,
          actuals,
          variance,
          percentSpent,
          txCount,
        };
      }
    );

    // Sort by budget DESC
    rows.sort((a, b) => b.budget - a.budget);

    return rows;
  }, [budgetsForYear, actualsForYear, txForYear, selectedYear]);

  const deptCount = summaries.length;
  const totalBudget = summaries.reduce(
    (sum, d) => sum + d.budget,
    0
  );
  const totalActuals = summaries.reduce(
    (sum, d) => sum + d.actuals,
    0
  );
  const variance = totalActuals - totalBudget;
  const execPct =
    totalBudget === 0
      ? 0
      : Math.min((totalActuals / totalBudget) * 100, 999);
  const totalTx = summaries.reduce(
    (sum, d) => sum + d.txCount,
    0
  );

  const yearParam =
    selectedYear != null ? `?year=${selectedYear}` : "";

  const columns: DataTableColumn<DepartmentSummary>[] = useMemo(
    () => [
      {
        key: "department",
        header: "Department",
        sortable: true,
        sortAccessor: (row) =>
          (row.department_name || "Unspecified").toLowerCase(),
        cellClassName: "whitespace-nowrap",
        cell: (dept: DepartmentSummary) => (
          <Link
            href={`/paradise/departments/${encodeURIComponent(
              dept.department_name || "Unspecified"
            )}${yearParam}`}
            className="font-medium text-sky-700 hover:underline"
          >
            {dept.department_name || "Unspecified"}
          </Link>
        ),
      },
      {
        key: "budget",
        header: "Budget",
        sortable: true,
        sortAccessor: (row) => row.budget,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (dept: DepartmentSummary) =>
          formatCurrency(dept.budget),
      },
      {
        key: "actuals",
        header: "Actuals",
        sortable: true,
        sortAccessor: (row) => row.actuals,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (dept: DepartmentSummary) =>
          formatCurrency(dept.actuals),
      },
      {
        key: "percentSpent",
        header: "% spent",
        sortable: true,
        sortAccessor: (row) => row.percentSpent,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (dept: DepartmentSummary) =>
          formatPercent(dept.percentSpent / 100),
      },
      {
        key: "variance",
        header: "Variance",
        sortable: true,
        sortAccessor: (row) => row.variance,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (dept: DepartmentSummary) => {
          const v = dept.variance;
          const color =
            v < 0
              ? "text-red-700"
              : v > 0
              ? "text-emerald-700"
              : "text-slate-700";
          return (
            <span className={color}>
              {formatCurrency(v)}
            </span>
          );
        },
      },
      {
        key: "txCount",
        header: "Transactions",
        sortable: true,
        sortAccessor: (row) => row.txCount,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (dept: DepartmentSummary) =>
          dept.txCount.toLocaleString("en-US"),
      },
    ],
    [yearParam]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          eyebrow="Departments"
          title="Department overview"
          description="See how each department’s budget, actual spending, and transaction volume compare for the selected fiscal year."
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
          className="mb-4 flex items-center gap-1 px-1 text-[11px] text-slate-500"
        >
          <ol className="flex items-center gap-1">
            <li>
              <Link
                href="/paradise"
                className="hover:text-slate-800"
              >
                Overview
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">
              ›
            </li>
            <li aria-current="page">
              <span className="font-medium text-slate-700">
                Departments
              </span>
            </li>
          </ol>
        </nav>

        <div className="space-y-6">
          {/* KPI strip */}
          <CardContainer>
            <section
              aria-label="Department summary statistics"
              className="space-y-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div className="text-xs text-slate-500">
                  {yearLabel ? (
                    <>
                      Showing{" "}
                      <span className="font-semibold">
                        {deptCount}
                      </span>{" "}
                      departments for fiscal year{" "}
                      <span className="font-semibold">
                        {yearLabel}
                      </span>
                      .
                    </>
                  ) : (
                    "No fiscal years available yet."
                  )}
                </div>
              </div>

              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Departments
                  </div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {deptCount.toLocaleString("en-US")}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    With budget, spending, or transactions in{" "}
                    {yearLabel ?? "–"}.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Total budget
                  </div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrency(totalBudget)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Sum of department-level adopted budgets.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Total actuals
                  </div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrency(totalActuals)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    All recorded spending for these departments.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Variance (actuals - budget)
                  </div>
                  <div
                    className={
                      "mt-1 text-2xl font-bold " +
                      (variance < 0
                        ? "text-emerald-700"
                        : variance > 0
                        ? "text-red-700"
                        : "text-slate-900")
                    }
                  >
                    {formatCurrency(variance)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Negative means departments are under budget overall.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    % of budget spent
                  </div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {formatPercent(execPct / 100)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Based on total actuals versus total budget.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Transactions
                  </div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {totalTx.toLocaleString("en-US")}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Posted for {yearLabel ?? "–"}.
                  </div>
                </div>
              </section>
            </section>
          </CardContainer>

          {/* Table */}
          <CardContainer>
            {summaries.length === 0 ? (
              <p className="text-sm text-slate-500">
                No department data available for the selected year.
              </p>
            ) : (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Departments detail
                </h2>
                <p className="text-xs text-slate-500">
                  This table shows each department’s budget, actual
                  spending, variance, percentage of budget spent, and
                  the number of transactions recorded for the selected
                  fiscal year.
                </p>
                <DataTable<DepartmentSummary>
                  data={summaries}
                  columns={columns}
                  initialSortKey="budget"
                  initialSortDirection="desc"
                  getRowKey={(row) =>
                    row.department_name || "Unspecified"
                  }
                />
              </div>
            )}
          </CardContainer>
        </div>
      </div>
    </div>
  );
}

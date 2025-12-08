// components/Budget/BudgetClient.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import type { BudgetRow, ActualRow } from "../../lib/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import DataTable, { DataTableColumn } from "../DataTable";
import FiscalYearSelect from "../FiscalYearSelect";
import BudgetByDepartmentChart from "@/components/Analytics/BudgetByDepartmentChart";
import { cityHref } from "@/lib/cityRouting";

export type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number;
};

type Props = {
  budgets: BudgetRow[];
  actuals: ActualRow[];
};

// Helper to safely numeric-cast fiscal_year
function fy(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function BudgetClient({ budgets, actuals }: Props) {
  const searchParams = useSearchParams();

  // All years present in either budgets or actuals, newest first
  const years = useMemo(() => {
    const set = new Set<number>();

    budgets.forEach((b) => {
      const v = fy(b.fiscal_year);
      if (v !== null) set.add(v);
    });

    actuals.forEach((a) => {
      const v = fy(a.fiscal_year);
      if (v !== null) set.add(v);
    });

    return Array.from(set).sort((a, b) => b - a);
  }, [budgets, actuals]);

  // Years that actually have any actuals data
  const yearsWithActuals = useMemo(() => {
    const set = new Set<number>();

    actuals.forEach((a) => {
      const v = fy(a.fiscal_year);
      if (v !== null) set.add(v);
    });

    return set;
  }, [actuals]);

  const yearParam = searchParams.get("year");
  const selectedYear = (() => {
    if (!years.length) return null;

    const paramVal = fy(yearParam ?? undefined);
    if (paramVal !== null && years.includes(paramVal)) {
      return paramVal;
    }

    // Default to most recent year
    return years[0];
  })();

  const yearLabel = selectedYear ? String(selectedYear) : null;

  // Slice down to the selected year
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

  const hasAnyActualsForSelectedYear =
    selectedYear != null &&
    yearsWithActuals.has(selectedYear) &&
    actualsForYear.length > 0;

  // Aggregate by department
  const departments: DepartmentSummary[] = useMemo(() => {
    if (!budgetsForYear.length && !actualsForYear.length) return [];

    const byDept = new Map<string, DepartmentSummary>();

    // Start with budget amounts
    for (const b of budgetsForYear) {
      const name = b.department_name || "Unspecified";
      const existing = byDept.get(name) || {
        department_name: name,
        budget: 0,
        actuals: 0,
        percentSpent: 0,
      };

      existing.budget += b.amount || 0;
      byDept.set(name, existing);
    }

    // Add actuals
    for (const a of actualsForYear) {
      const name = a.department_name || "Unspecified";
      const existing = byDept.get(name) || {
        department_name: name,
        budget: 0,
        actuals: 0,
        percentSpent: 0,
      };

      existing.actuals += a.amount || 0;
      byDept.set(name, existing);
    }

    // Compute percent spent
    const result: DepartmentSummary[] = [];

    for (const value of byDept.values()) {
      const { budget, actuals } = value;
      const percentSpent =
        budget > 0 ? Math.min((actuals / budget) * 100, 999) : 0;
      result.push({
        ...value,
        percentSpent,
      });
    }

    // Sort by budget descending by default
    result.sort((a, b) => b.budget - a.budget);
    return result;
  }, [budgetsForYear, actualsForYear]);

  // City-level aggregates
  const totals = useMemo(() => {
    let budget = 0;
    let actualsSum = 0;

    for (const d of departments) {
      budget += d.budget;
      actualsSum += d.actuals;
    }

    const variance = budget - actualsSum;
    const execPct =
      budget > 0 ? Math.min((actualsSum / budget) * 100, 999) : 0;

    return {
      budget,
      actuals: actualsSum,
      variance,
      execPct,
    };
  }, [departments]);

  const deptCount = departments.length;
  const chartYear = selectedYear ?? (years.length ? years[0] : 0);

  const columns: DataTableColumn<DepartmentSummary>[] = useMemo(
    () => [
      {
        key: "department_name",
        header: "Department",
        align: "left",
        cell: (row: DepartmentSummary) => {
          const name = row.department_name || "Unspecified";
          return (
            <Link
              href={`${cityHref(
                `/departments/${encodeURIComponent(name)}`
              )}?year=${chartYear}`}
              className="text-sm font-medium text-slate-800 hover:underline"
            >
              {name}
            </Link>
          );
        },
      },
      {
        key: "budget",
        header: "Budget",
        align: "right",
        cell: (row: DepartmentSummary) => (
          <span>{formatCurrency(row.budget)}</span>
        ),
      },
      {
        key: "actuals",
        header: "Actuals",
        align: "right",
        cell: (row: DepartmentSummary) => (
          <span>{formatCurrency(row.actuals)}</span>
        ),
      },
      {
        key: "percentSpent",
        header: "% spent",
        align: "right",
        cell: (row: DepartmentSummary) => (
          <span>{formatPercent(row.percentSpent, 1)}</span>
        ),
      },
      {
        key: "variance",
        header: "Variance",
        align: "right",
        cell: (row: DepartmentSummary) => {
          const v = row.budget - row.actuals;
          const color =
            v > 0
              ? " text-emerald-700"
              : v < 0
              ? " text-red-700"
              : " text-slate-700";
          return <span className={color}>{formatCurrency(v)}</span>;
        },
      },
    ],
    [chartYear]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          eyebrow="Budget overview"
          title="Budget vs Actuals"
          description="Compare adopted budgets and actual spending across departments for the selected fiscal year."
          rightSlot={
            years.length > 0 ? (
              <FiscalYearSelect options={years} label="Fiscal year" />
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
                Budget
              </span>
            </li>
          </ol>
        </nav>

        <div className="space-y-6">
          {/* Filters + KPIs */}
          <CardContainer>
            <div className="space-y-6">
              {/* Summary line */}
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
                      {!hasAnyActualsForSelectedYear &&
                        " Actuals have not been uploaded for this year yet."}
                    </>
                  ) : (
                    "No budget years available yet."
                  )}
                </div>
              </div>

              {/* KPI tiles */}
              <section
                aria-label="Budget execution summary"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total budget
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {formatCurrency(totals.budget)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Sum of department-level adopted budgets.
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total actuals
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {formatCurrency(totals.actuals)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    All spending recorded against these departments.
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Variance (budget - actuals)
                  </div>
                  <div
                    className={
                      "mt-1 text-lg font-semibold" +
                      (totals.variance > 0
                        ? " text-emerald-700"
                        : totals.variance < 0
                        ? " text-red-700"
                        : " text-slate-900")
                    }
                  >
                    {formatCurrency(totals.variance)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Positive means the spend is currently under budget.
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    % of budget spent
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {formatPercent(totals.execPct, 1)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Share of adopted budget that has been spent this
                    year.
                  </div>
                </div>
              </section>
            </div>
          </CardContainer>

          {/* Charts + table */}
          <CardContainer>
            {departments.length === 0 ? (
              <p className="text-sm text-slate-500">
                No budget or actuals data available for this year.
              </p>
            ) : (
              <div className="space-y-6">
                {/* Two-column explanatory band at the top */}
                <section
                  aria-label="How to read the budget by department chart"
                  className="grid items-start gap-4 md:grid-cols-2"
                >
                  <div className="space-y-4">
                    {/* Overall execution panel */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Overall budget execution
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">
                        {formatPercent(totals.execPct)}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {formatCurrency(totals.actuals)} of{" "}
                        {formatCurrency(totals.budget)} spent across all
                        departments.
                      </p>
                      <div
                        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{
                            width: `${Math.min(totals.execPct, 100)}%`,
                          }}
                        />
                      </div>
                    </div>


                  </div>

                  {/* Side description / story */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Department spending highlights
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Departments are sorted by size of adopted budget.
                      Large green bars show major services that are
                      currently under budget; red bars flag areas where
                      spending is running ahead of plan.
                    </p>
                  </div>
                </section>

                {/* Full-width chart + accessible inner table */}
                <BudgetByDepartmentChart
                  year={chartYear}
                  departments={departments}
                  showTable={false}
                />

                {/* Detailed interactive table */}
                <DataTable<DepartmentSummary>
                  data={departments}
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

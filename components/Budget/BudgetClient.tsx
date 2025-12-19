"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import { formatCurrency, formatPercent } from "@/lib/format";
import DataTable, { DataTableColumn } from "../DataTable";
import FiscalYearSelect from "../FiscalYearSelect";
import BudgetByDepartmentChart from "@/components/Analytics/BudgetByDepartmentChart";
import { cityHref } from "@/lib/cityRouting";
import type { BudgetActualsYearDeptRow } from "@/lib/queries";
import { CITY_CONFIG } from "@/lib/cityConfig";

export type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number;
};

type Props = {
  years: number[];
  deptBudgetActuals: BudgetActualsYearDeptRow[]; // selected-year scoped summary rows
};

export default function BudgetClient({ years, deptBudgetActuals }: Props) {
  const searchParams = useSearchParams();

  const selectedYear = useMemo(() => {
    if (!years.length) return null;

    const param = searchParams.get("year");
    const parsed = param ? Number(param) : NaN;

    if (Number.isFinite(parsed) && years.includes(parsed)) return parsed;
    return years[0];
  }, [searchParams, years]);

  const yearLabel = selectedYear ? String(selectedYear) : null;

  const departments: DepartmentSummary[] = useMemo(() => {
    if (!deptBudgetActuals || deptBudgetActuals.length === 0) return [];

    const result = deptBudgetActuals.map((r) => {
      const name = r.department_name || "Unspecified";
      const budget = Number(r.budget_amount ?? 0);
      const actuals = Number(r.actual_amount ?? 0);
      const percentSpent =
        budget > 0 ? Math.min((actuals / budget) * 100, 999) : 0;

      return { department_name: name, budget, actuals, percentSpent };
    });

    result.sort((a, b) => b.budget - a.budget);
    return result;
  }, [deptBudgetActuals]);

  const totals = useMemo(() => {
    const budget = departments.reduce((sum, d) => sum + d.budget, 0);
    const actualsSum = departments.reduce((sum, d) => sum + d.actuals, 0);
    const variance = budget - actualsSum;
    const execPct =
      budget > 0 ? Math.min((actualsSum / budget) * 100, 999) : 0;

    return { budget, actuals: actualsSum, variance, execPct };
  }, [departments]);

  const deptCount = departments.length;
  const chartYear = selectedYear ?? (years.length ? years[0] : 0);

  const hasAnyActualsForSelectedYear =
    departments.some((d) => d.actuals > 0) || false;

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

  const accentColor =
    CITY_CONFIG.accentColor || CITY_CONFIG.primaryColor || undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Budget overview"
        title="Budget vs Actuals"
        description="Compare adopted budgets and actual spending across departments for the selected fiscal year."
        rightSlot={
          years.length > 0 ? (
            <FiscalYearSelect options={years} label="Fiscal year" />
          ) : null
        }
        accentColor={accentColor}
      />

      <nav
        aria-label="Breadcrumb"
        className="px-1 text-xs text-slate-500"
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
            <span className="font-medium text-slate-700">Budget</span>
          </li>
        </ol>
      </nav>

      <div className="space-y-6">
        <CardContainer>
          <div className="space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div className="text-xs text-slate-500">
                {yearLabel ? (
                  <>
                    Showing{" "}
                    <span className="font-semibold">{deptCount}</span>{" "}
                    departments for fiscal year{" "}
                    <span className="font-semibold">{yearLabel}</span>.{" "}
                    {!hasAnyActualsForSelectedYear &&
                      "Actuals have not been uploaded for this year yet."}
                  </>
                ) : (
                  "No budget years available yet."
                )}
              </div>
            </div>

            <section
              aria-label="Budget execution summary"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
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

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
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

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
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

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  % of budget spent
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {formatPercent(totals.execPct, 1)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Share of adopted budget that has been spent this year.
                </div>
              </div>
            </section>
          </div>
        </CardContainer>

        <CardContainer>
          {departments.length === 0 ? (
            <p className="text-sm text-slate-500">
              No budget or actuals data available for this year.
            </p>
          ) : (
            <div className="space-y-6">
              <section
                aria-label="How to read the budget by department chart"
                className="grid items-start gap-4 md:grid-cols-2"
              >
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
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

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Department spending highlights
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Departments are sorted by size of adopted budget.
                    Large green bars show major services that are currently
                    under budget; red bars flag areas where spending is
                    running ahead of plan.
                  </p>
                </div>
              </section>

              <BudgetByDepartmentChart
                year={chartYear}
                departments={departments}
                showTable={false}
              />

              <DataTable<DepartmentSummary>
                data={departments}
                columns={columns}
                initialSortKey="budget"
                initialSortDirection="desc"
                getRowKey={(row) => row.department_name || "Unspecified"}
              />
            </div>
          )}
        </CardContainer>
      </div>
    </div>
  );
}

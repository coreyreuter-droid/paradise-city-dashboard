// components/Budget/BudgetClient.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import BudgetCharts from "./BudgetCharts";
import type { BudgetRow, ActualRow } from "../../lib/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import DataTable, { DataTableColumn } from "../DataTable";
import FiscalYearSelect from "../FiscalYearSelect";

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
    return Array.from(set).sort((a, b) => b - a);
  }, [actuals]);

  // Selected year comes from ?year=, falling back to latest year WITH actuals if possible
  const selectedYear = useMemo(() => {
    if (years.length === 0) return undefined;

    const param = searchParams.get("year");
    const parsed = param ? Number(param) : NaN;

    // If URL param is valid and in the list of years, respect it
    if (Number.isFinite(parsed) && years.includes(parsed)) {
      return parsed;
    }

    // Otherwise default to the latest year that has actuals, if any
    if (yearsWithActuals.length > 0) {
      return yearsWithActuals[0];
    }

    // Fallback: latest year overall
    return years[0];
  }, [searchParams, years, yearsWithActuals]);

  const departments = useMemo<DepartmentSummary[]>(() => {
    if (!selectedYear) return [];

    const budgetRows = budgets.filter(
      (b) => fy(b.fiscal_year) === selectedYear
    );
    const actualRows = actuals.filter(
      (a) => fy(a.fiscal_year) === selectedYear
    );

    // Aggregate budgets
    const budgetByDept = new Map<string, number>();
    budgetRows.forEach((row) => {
      const dept = row.department_name || "Unspecified";
      const amt = Number(row.amount || 0);
      budgetByDept.set(dept, (budgetByDept.get(dept) || 0) + amt);
    });

    // Aggregate actuals
    const actualsByDept = new Map<string, number>();
    actualRows.forEach((row) => {
      const dept = row.department_name || "Unspecified";
      const amt = Number(row.amount || 0);
      actualsByDept.set(dept, (actualsByDept.get(dept) || 0) + amt);
    });

    // Only show departments that exist in this year
    const rows: DepartmentSummary[] = Array.from(
      new Set([...budgetByDept.keys(), ...actualsByDept.keys()])
    ).map((dept) => {
      const budget = budgetByDept.get(dept) || 0;
      const actual = actualsByDept.get(dept) || 0;
      const percentSpent = budget > 0 ? (actual / budget) * 100 : 0;

      return {
        department_name: dept,
        budget,
        actuals: actual,
        percentSpent,
      };
    });

    // Largest budgets first by default
    rows.sort((a, b) => b.budget - a.budget);

    return rows;
  }, [budgets, actuals, selectedYear]);

  const totalBudget = departments.reduce((sum, d) => sum + d.budget, 0);
  const totalActuals = departments.reduce((sum, d) => sum + d.actuals, 0);
  const variance = totalActuals - totalBudget;
  const execPct = totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;

  const deptCount = departments.length;

  const yearLabel =
    selectedYear ?? (years.length > 0 ? years[0] : undefined);

  const yearParam = selectedYear ? `?year=${selectedYear}` : "";

  const columns: DataTableColumn<DepartmentSummary>[] = useMemo(
    () => [
      {
        key: "department",
        header: "Department",
        sortable: true,
        sortAccessor: (row) =>
          (row.department_name || "Unspecified").toLowerCase(),
        cellClassName: "whitespace-nowrap",
        cell: (row) => (
          <Link
            href={`/paradise/departments/${encodeURIComponent(
              row.department_name || "Unspecified"
            )}${yearParam}`}
            className="font-medium text-sky-700 hover:underline"
          >
            {row.department_name || "Unspecified"}
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
        cell: (row) => formatCurrency(row.budget),
      },
      {
        key: "actuals",
        header: "Actuals",
        sortable: true,
        sortAccessor: (row) => row.actuals,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (row) => formatCurrency(row.actuals),
      },
      {
        key: "percentSpent",
        header: "% Spent",
        sortable: true,
        sortAccessor: (row) => row.percentSpent,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (row) => formatPercent(row.percentSpent, 1),
      },
      {
        key: "variance",
        header: "Variance",
        sortable: true,
        sortAccessor: (row) => row.actuals - row.budget,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (row) => {
          const v = row.actuals - row.budget;
          const base = "text-right font-mono";
          const color =
            v > 0
              ? " text-emerald-700"
              : v < 0
              ? " text-red-700"
              : " text-slate-700";
          return <span className={base + color}>{formatCurrency(v)}</span>;
        },
      },
    ],
    [yearParam]
  );

  const chartYear = yearLabel ?? new Date().getFullYear();

  const hasAnyActualsForSelectedYear = departments.some((d) => d.actuals > 0);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          eyebrow="City budget overview"
          title="Budget vs Actuals"
          description="See how each department’s spending compares to its approved budget."
          rightSlot={
            years.length > 0 ? (
              <FiscalYearSelect options={years} label="Fiscal year" />
            ) : null
          }
        />
<div className="mb-4 flex items-center gap-1 text-[11px] text-slate-500 px-1">
  <Link href="/paradise" className="hover:text-slate-800">
    Overview
  </Link>
  <span className="text-slate-400">›</span>
  <span className="font-medium text-slate-700">
    Budget
  </span>
</div>

        {/* Filters + KPIs + charts */}
        <CardContainer>
          <div className="space-y-6">
            {/* Summary line */}
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div className="text-xs text-slate-500">
                {yearLabel ? (
                  <>
                    Showing{" "}
                    <span className="font-semibold">{deptCount}</span>{" "}
                    departments for fiscal year{" "}
                    <span className="font-semibold">{yearLabel}</span>.
                    {!hasAnyActualsForSelectedYear &&
                      " Actuals have not been uploaded for this year yet."}
                  </>
                ) : (
                  "No fiscal year selected."
                )}
              </div>
            </div>

            {/* KPI tiles */}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Departments
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {deptCount}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Total Budget
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {formatCurrency(totalBudget)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Total Actuals
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {formatCurrency(totalActuals)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatPercent(execPct, 1)} of budget spent
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Variance
                </div>
                <div
                  className={[
                    "mt-1 text-2xl font-bold",
                    variance > 0
                      ? "text-emerald-700"
                      : variance < 0
                      ? "text-red-700"
                      : "text-slate-900",
                  ].join(" ")}
                >
                  {formatCurrency(variance)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Actuals minus budget
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="mt-2">
              <BudgetCharts year={chartYear} departments={departments} />
            </div>
          </div>
        </CardContainer>

        {/* Table card */}
        <div className="mt-6">
          <CardContainer>
            {departments.length === 0 ? (
              <p className="text-sm text-slate-500">
                No budget or actuals data available for this year.
              </p>
            ) : (
              <DataTable<DepartmentSummary>
                data={departments}
                columns={columns}
                initialSortKey="budget"
                initialSortDirection="desc"
                getRowKey={(row) => row.department_name || "Unspecified"}
              />
            )}
          </CardContainer>
        </div>
      </div>
    </main>
  );
}

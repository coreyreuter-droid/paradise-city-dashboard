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

export default function BudgetClient({ budgets, actuals }: Props) {
  const searchParams = useSearchParams();

  // All years present in budget data, newest first
  const years = useMemo(
    () =>
      Array.from(new Set(budgets.map((b) => b.fiscal_year))).sort(
        (a, b) => b - a
      ),
    [budgets]
  );

  // Selected year comes from ?year=, falling back to latest year
  const selectedYear = useMemo(() => {
    if (years.length === 0) {
      return new Date().getFullYear();
    }

    const param = searchParams.get("year");
    const parsed = param ? Number(param) : NaN;

    if (Number.isFinite(parsed) && years.includes(parsed)) {
      return parsed;
    }

    return years[0];
  }, [searchParams, years]);

  // Filter to selected year
  const budgetRows = budgets.filter(
    (row) => row.fiscal_year === selectedYear
  );
  const actualRows = actuals.filter(
    (row) => row.fiscal_year === selectedYear
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
  const departments: DepartmentSummary[] = Array.from(
    new Set([...budgetByDept.keys(), ...actualsByDept.keys()])
  ).map((dept) => {
    const budget = budgetByDept.get(dept) || 0;
    const actual = actualsByDept.get(dept) || 0;
    const percentSpent =
      budget > 0 ? Math.round((actual / budget) * 100) : 0;

    return {
      department_name: dept,
      budget,
      actuals: actual,
      percentSpent,
    };
  });

  // Default sort by budget desc (DataTable also has its own sorting)
  departments.sort((a, b) => b.budget - a.budget);

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
            )}?year=${selectedYear}`}
            className="text-sky-700 hover:underline"
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
        cell: (row) => formatPercent(row.percentSpent, 0),
      },
    ],
    [selectedYear]
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <SectionHeader
          title="Budget vs Actuals"
          description={`Summary by department for fiscal year ${selectedYear}.`}
        />

        {/* Year selector hooked into ?year=, same UX as other pages */}
        {years.length > 0 && (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xs">
              <FiscalYearSelect
                options={years}
                label="Fiscal year"
              />
            </div>
            <span className="text-xs text-slate-500">
              Currently viewing: <strong>{selectedYear}</strong>
            </span>
          </div>
        )}

        {/* Charts block */}
        {departments.length > 0 && (
          <div className="mb-6">
            <BudgetCharts
              year={selectedYear}
              departments={departments}
            />
          </div>
        )}

        {/* Table card */}
        <CardContainer>
          {departments.length === 0 ? (
            <p className="text-slate-500">
              No budget / actuals data available for display.
            </p>
          ) : (
            <DataTable<DepartmentSummary>
              data={departments}
              columns={columns}
              initialSortKey="budget"
              initialSortDirection="desc"
              getRowKey={(row) =>
                row.department_name || "Unspecified"
              }
            />
          )}
        </CardContainer>
      </div>
    </main>
  );
}

// components/Budget/BudgetCharts.tsx
"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { formatCurrency, formatPercent } from "@/lib/format";

type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number;
};

type Props = {
  year: number;
  departments: DepartmentSummary[];
};

const formatAxisCurrency = (v: number) => {
  if (v === 0) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `$${(v / 1_000).toFixed(0)}k`;
  }
  return `$${v.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
};

const shortenLabel = (name: string, max = 26) => {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
};

export default function BudgetCharts({ year, departments }: Props) {
  const {
    totalBudget,
    totalActuals,
    variance,
    variancePct,
    execPct,
    chartData,
    chartHeight,
  } = useMemo(() => {
    const totalBudget = departments.reduce(
      (sum, d) => sum + d.budget,
      0
    );
    const totalActuals = departments.reduce(
      (sum, d) => sum + d.actuals,
      0
    );
    const variance = totalActuals - totalBudget;
    const variancePct =
      totalBudget === 0 ? 0 : (variance / totalBudget) * 100;

    const execPctRaw =
      totalBudget === 0
        ? 0
        : (totalActuals / totalBudget) * 100;
    const execPct = Math.max(0, Math.min(100, execPctRaw));

    // Sort by budget desc and show only top N in the chart
    const TOP_N = 10;
    const topDepartments = [...departments]
      .sort((a, b) => b.budget - a.budget)
      .slice(0, TOP_N);

    const chartData = topDepartments.map((d) => ({
      name: d.department_name || "Unspecified",
      Budget: Math.round(d.budget),
      Actual: Math.round(d.actuals),
      PercentSpent: d.percentSpent,
    }));

    // Height scales with number of rows, capped so it doesn't get ridiculous
    const base = 120;
    const perRow = 28;
    const rows = Math.max(chartData.length, 1);
    const chartHeight = Math.min(
      420,
      base + rows * perRow
    );

    return {
      totalBudget,
      totalActuals,
      variance,
      variancePct,
      execPct,
      chartData,
      chartHeight,
    };
  }, [departments]);

  if (departments.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No department budget data available for fiscal year {year}.
      </p>
    );
  }

  return (
    <section
      className="space-y-5"
      aria-labelledby="dept-spend-heading"
      aria-describedby="dept-spend-desc"
    >
      {/* Summary + execution bar */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3
            id="dept-spend-heading"
            className="text-sm font-semibold text-slate-900"
          >
            Spending by department
          </h3>
          <p
            id="dept-spend-desc"
            className="text-xs text-slate-500"
          >
            Fiscal year {year}. Each bar compares budgeted
            versus actual spending by department. A separate
            bar shows overall budget execution.
          </p>
        </div>

        <div className="text-right text-xs text-slate-600">
          <div className="font-semibold text-slate-800">
            {formatCurrency(totalActuals)} actuals /{" "}
            {formatCurrency(totalBudget)} budget
          </div>
          <div>
            {formatPercent(execPct, 1)} of budget spent
          </div>
        </div>
      </header>

      {/* Execution bar + variance text */}
      <div className="mt-1 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <span>Overall budget execution</span>
          <span className="font-medium text-slate-800">
            {formatPercent(execPct, 1)} of budget spent
            {totalBudget > 0 && (
              <>
                {" "}
                •{" "}
                {variance === 0
                  ? "On budget"
                  : variance > 0
                  ? `${formatCurrency(
                      Math.abs(variance)
                    )} over budget (${formatPercent(
                      variancePct,
                      1
                    )})`
                  : `${formatCurrency(
                      Math.abs(variance)
                    )} under budget (${formatPercent(
                      variancePct,
                      1
                    )})`}
              </>
            )}
          </span>
        </div>

        <div
          className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200"
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${execPct}%`,
              background:
                "linear-gradient(to right, #22c55e, #16a34a)",
            }}
          />
        </div>
      </div>

      {/* Chart + accessible table */}
      <div className="mt-3 space-y-3">
        <figure
          role="group"
          aria-labelledby="dept-spend-chart-heading"
          aria-describedby="dept-spend-chart-desc"
          className="space-y-3"
        >
          <h4
            id="dept-spend-chart-heading"
            className="text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            Top departments by budget
          </h4>
          <p id="dept-spend-chart-desc" className="sr-only">
            Horizontal bar chart showing, for up to ten
            departments, the budget and actual spending
            amounts. Actual bars are green when spending is
            at or below budget and red when spending exceeds
            budget.
          </p>

          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 24,
                  left: 8,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={formatAxisCurrency}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{
                    fontSize: 10,
                  }}
                  tickFormatter={(name: string) =>
                    shortenLabel(name)
                  }
                />
                <Tooltip
                  formatter={(value: number, name) => [
                    formatCurrency(value),
                    name,
                  ]}
                  labelFormatter={(label: any) =>
                    `Department: ${String(label)}`
                  }
                />

                {/* Budget: dark gray */}
                <Bar
                  dataKey="Budget"
                  barSize={8}
                  radius={[0, 0, 0, 0]}
                  fill="#4b5563"
                />

                {/* Actual: green if ≤ budget, red if > budget */}
                <Bar
                  dataKey="Actual"
                  barSize={8}
                  radius={[0, 0, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`budget-actual-cell-${index}`}
                      fill={
                        entry.Actual <= entry.Budget
                          ? "#10b981"
                          : "#FF746C"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Accessible tabular representation */}
          <div className="overflow-x-auto">
            <table className="mt-2 min-w-full border border-slate-200 text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left"
                  >
                    Department
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right"
                  >
                    Budget
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right"
                  >
                    Actual
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right"
                  >
                    % spent
                  </th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr
                    key={row.name}
                    className="border-t border-slate-200"
                  >
                    <th
                      scope="row"
                      className="px-3 py-2 text-left font-medium text-slate-800"
                    >
                      {row.name}
                    </th>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {formatCurrency(row.Budget)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {formatCurrency(row.Actual)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {formatPercent(row.PercentSpent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart key (kept as-is, but still helpful visually) */}
          <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-slate-600">
            <span className="font-semibold uppercase tracking-wide text-slate-500">
              Chart key:
            </span>

            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: "#4b5563" }}
              />
              <span>Budget</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 overflow-hidden rounded-sm">
                <span
                  className="inline-block h-full w-1/2 float-left"
                  style={{ backgroundColor: "#10b981" }}
                />
                <span
                  className="inline-block h-full w-1/2 float-left"
                  style={{ backgroundColor: "#FF746C" }}
                />
              </span>
              <span>Actual (green = under, red = over)</span>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}

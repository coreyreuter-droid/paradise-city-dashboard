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

export type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number;
};

type Props = {
  year: number;
  departments: DepartmentSummary[];
  layout?: "two-column" | "stacked";
};

const formatAxisCurrency = (v: number) => {
  if (v === 0) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `$${(v / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(v);
};

const shortenLabel = (name: string) => {
  if (name.length <= 20) return name;
  return name.slice(0, 17) + "…";
};

export default function BudgetCharts({
  year,
  departments,
  layout = "two-column",
}: Props) {
  const chartData = useMemo(
    () =>
      departments.map((d) => ({
        name: d.department_name || "Unspecified",
        Budget: d.budget,
        Actual: d.actuals,
        PercentSpent: d.percentSpent,
      })),
    [departments]
  );

  const totalBudget = useMemo(
    () => departments.reduce((sum, d) => sum + d.budget, 0),
    [departments]
  );

  const totalActuals = useMemo(
    () => departments.reduce((sum, d) => sum + d.actuals, 0),
    [departments]
  );

  const execPct = totalBudget
    ? Math.min((totalActuals / totalBudget) * 100, 999)
    : 0;

  const avgMonthlySpend = totalActuals / 12;

  // Height scales with number of departments, but leaves margin so
  // categories never visually touch each other.
  const chartHeight = Math.max(
    260,
    Math.min(640, departments.length * 40)
  );

  const summaryBlocks = (
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Overall budget execution
        </div>
        <div className="mt-1 text-2xl font-semibold text-slate-900">
          {formatPercent(execPct, 1)}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {formatCurrency(totalActuals)} of{" "}
          {formatCurrency(totalBudget)} spent across all departments.
        </div>

        <div className="mt-3">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200" >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(execPct, 100)}%`,
                background:
                  execPct <= 100
                    ? "linear-gradient(to right, #22c55e, #16a34a)"
                    : "linear-gradient(to right, #f97316, #b91c1c)",
              }}
              aria-hidden="true"
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Average monthly spending
        </div>
        <div className="mt-1 text-lg font-semibold text-slate-900">
          {formatCurrency(avgMonthlySpend)}
          <span className="ml-1 text-xs font-normal text-slate-500">
            per month
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Estimated by dividing total actual spending in fiscal year{" "}
          {year} by 12 months.
        </p>
      </div>
    </>
  );

  const figureBlock = (
    <figure
      role="group"
      aria-labelledby="dept-spend-chart-heading"
      aria-describedby="dept-spend-chart-desc"
      className="space-y-3"
    >
      <header>
        <h4
          id="dept-spend-chart-heading"
          className="text-xs font-semibold uppercase tracking-wide text-slate-600"
        >
          Department spending chart
        </h4>
        <p
          id="dept-spend-chart-desc"
          className="text-xs text-slate-500"
        >
        </p>
      </header>

      <div
        className="w-full min-w-0 overflow-hidden"
        style={{ height: chartHeight }}
      >
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
            barCategoryGap="100%"
          >
            
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={formatAxisCurrency}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 11 }}
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

            {/* Background budget bar */}
            <Bar
              dataKey="Budget"
              stackId="budget"
              radius={[4, 4, 4, 4]}
              barSize={8}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`budget-${index}`}
                  fill="#676f7b66"
                />
              ))}
            </Bar>

            {/* Foreground actuals bar */}
            <Bar
              dataKey="Actual"
              stackId="actual"
              radius={[4, 4, 4, 4]}
              barSize={8}
            >
              {chartData.map((entry, index) => {
                const pct = entry.PercentSpent;
                const under =
                  typeof pct === "number" && pct <= 100;
                const fill = under ? "#22c55e" : "#ef4444";
                return (
                  <Cell
                    key={`actual-${index}`}
                    fill={fill}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Simple color legend */}
      <div className="flex items-center gap-3 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-sm bg-slate-300" />
          <span>Budget</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-sm overflow-hidden">
            <span
              className="inline-block h-full w-1/2 float-left"
              style={{
                background:
                  "linear-gradient(to right, #22c55e, #16a34a)",
              }}
            />
            <span
              className="inline-block h-full w-1/2 float-left"
              style={{ backgroundColor: "#FF746C" }}
            />
          </span>
          <span>Actual (green = under, red = over)</span>
        </span>
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
          <tbody className="divide-y divide-slate-200">
            {chartData.map((row) => (
              <tr key={row.name}>
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
                  {formatPercent(row.PercentSpent, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );

  return (
    <section
      aria-labelledby="budget-by-department-heading"
      className="space-y-3"
    >


      {departments.length === 0 ? (
        <p className="text-sm text-slate-500">
          No budget or actuals data available for this year.
        </p>
      ) : layout === "two-column" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)]">
          {/* Left: progress + summary */}
          <div className="space-y-4">{summaryBlocks}</div>

          {/* Right: chart + table */}
          <div className="mt-1 space-y-3">{figureBlock}</div>
        </div>
      ) : (
        // Stacked layout – full width summary, then chart
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {summaryBlocks}</div>
          <div className="space-y-3">{figureBlock}</div>
        </div>
      )}
    </section>
  );
}

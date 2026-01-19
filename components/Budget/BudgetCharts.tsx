// components/Budget/BudgetCharts.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
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
import { formatCurrency, formatPercent, formatAxisCurrency } from "@/lib/format";

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
  viewAllHref?: string;
};

const shortenLabel = (name: string) => {
  if (name.length <= 24) return name;
  return name.slice(0, 22) + "…";
};

export default function BudgetCharts({
  year,
  departments,
  layout = "two-column",
  viewAllHref,
}: Props) {
  // WCAG 2.1 AA: Respect reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Initial state sync from browser media query
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Table shows top 8 by default, expandable to all
  const TABLE_TOP_N = 8;
  const [showAllTable, setShowAllTable] = useState(false);

  // Reset table to collapsed when departments change (e.g., year change)
  useEffect(() => {
    setShowAllTable(false);
  }, [departments]);

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

  // Table data - shows top 8 or all based on toggle
  const tableData = useMemo(() => {
    if (showAllTable || chartData.length <= TABLE_TOP_N) {
      return chartData;
    }
    return chartData.slice(0, TABLE_TOP_N);
  }, [chartData, showAllTable]);

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

  // Dynamic height: 36px per department, minimum 300px (matches Analytics)
  const chartHeight = Math.max(300, departments.length * 36);

  const summaryBlocks = (
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Overall budget execution
        </div>
        <div className="mt-1 text-2xl font-semibold text-slate-900">
          {formatPercent(execPct, 1)}
        </div>
        <div className="mt-1 text-xs text-slate-600">
          {formatCurrency(totalActuals)} of{" "}
          {formatCurrency(totalBudget)} spent across all departments.
        </div>

        <div className="mt-3">
          <div 
            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={Math.round(execPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Budget execution: ${Math.round(execPct)}% spent`}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(execPct, 100)}%`,
                background:
                  execPct <= 100
                    ? "linear-gradient(to right, #15803d, #16a34a)"
                    : "linear-gradient(to right, #f97316, #b91c1c)",
              }}
              aria-hidden="true"
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-600" aria-hidden="true">
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
        <p className="mt-1 text-xs text-slate-700">
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
          className="text-xs text-slate-600"
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
            margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
            barCategoryGap={16}
            barGap={2}
            barSize={10}
          >
            
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={formatAxisCurrency}
              tick={{ fontSize: 12, fill: "#334155" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={180}
              tick={{ fontSize: 11, fill: "#334155" }}
              tickFormatter={(name: string) =>
                shortenLabel(name)
              }
            />
            <Tooltip
              formatter={(value, name) => [
                formatCurrency(Number(value ?? 0)),
                String(name ?? ""),
              ]}
              labelFormatter={(label) => `Department: ${String(label)}`}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              labelStyle={{
                color: "#0f172a",
                fontWeight: 600,
                marginBottom: "4px",
              }}
              itemStyle={{
                color: "#334155",
              }}
            />

            {/* Background budget bar */}
            <Bar
              dataKey="Budget"
              stackId="budget"
              radius={[4, 4, 4, 4]}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`budget-${index}`}
                  fill="#757b84ff"
                />
              ))}
            </Bar>

            {/* Foreground actuals bar */}
            <Bar
              dataKey="Actual"
              stackId="actual"
              radius={[4, 4, 4, 4]}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => {
                const pct = entry.PercentSpent;
                const under =
                  typeof pct === "number" && pct <= 100;
                const fill = under ? "#16a34a" : "#dc2626";
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: "#757b84ff" }} />
          <span>Budget</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: "#16a34a" }} />
          <span>Actuals (at or below plan)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: "#dc2626" }} />
          <span>Actuals (above plan)</span>
        </div>
      </div>

      {/* Toggle buttons between chart and table */}
      {(chartData.length > TABLE_TOP_N || viewAllHref) && (
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-3">
          {chartData.length > TABLE_TOP_N && (
            <button
              type="button"
              onClick={() => setShowAllTable(!showAllTable)}
              aria-expanded={showAllTable}
              aria-controls="dept-table-region"
              className="text-xs font-semibold text-slate-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded"
            >
              {showAllTable ? `Show top ${TABLE_TOP_N}` : "Show all rows"}
            </button>
          )}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs font-semibold text-slate-800 underline-offset-2 hover:underline"
            >
              View departments page
            </Link>
          )}
        </div>
      )}

      {/* Accessible tabular representation */}
      <div className="overflow-x-auto" id="dept-table-region">
        <table className="mt-2 min-w-full border border-slate-200 text-xs">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
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
            {tableData.map((row) => (
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
        <p className="text-sm text-slate-600">
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
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
import type { DepartmentSummary } from "@/components/Budget/BudgetClient";

type Props = {
  year: number;
  departments: DepartmentSummary[];
  accentColor?: string; // kept for API compatibility, not strictly needed
  showTable?: boolean; // Controls rendering of the inner table
};

const formatAxisCurrencyShort = (v: number) => {
  if (v === 0) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${Math.round(v / 1_000_000)}M`;
  if (abs >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

const shortenLabel = (name: string) => {
  if (name.length <= 18) return name;
  return name.slice(0, 15) + "…";
};

export default function BudgetByDepartmentChart({
  year,
  departments,
  accentColor,
  showTable = true,
}: Props) {
  const data = useMemo(
    () => [...departments].sort((a, b) => b.budget - a.budget),
    [departments]
  );

  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No department budget data available for {year}.
      </p>
    );
  }

  return (
    <figure
      role="group"
      aria-labelledby="budget-by-dept-heading"
      aria-describedby="budget-by-dept-desc"
      className="space-y-4 w-full max-w-full min-w-0"
    >
      <p id="budget-by-dept-desc" className="sr-only">
        Horizontal bar chart and data table showing adopted budget and
        actual spending for each department in fiscal year {year},
        sorted from largest to smallest budget. Gray bars represent
        budget; green bars show actual spending when at or below budget
        and red bars show actual spending when above budget.
      </p>

      {/* Chart */}
      <div className="w-full min-w-0 h-[320px] sm:h-[380px] md:h-[420px] lg:h-[460px] overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
            barCategoryGap={16}
            barGap={2}
            barSize={10}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => formatAxisCurrencyShort(Number(v))}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <YAxis
              type="category"
              dataKey="department_name"
              tickFormatter={shortenLabel}
              width={140}
              tick={{ fontSize: 10, fill: "#475569" }}
            />
          <Tooltip
            formatter={(value: any, name?: string) => {
              const key = name ?? "";

              if (key === "Budget") {
                return [formatCurrency(Number(value)), "Budget"];
              }
              if (key === "Actuals") {
                return [formatCurrency(Number(value)), "Actuals"];
              }
              if (key === "% spent") {
                return [formatPercent(Number(value)), "% of budget spent"];
              }
              return value;
            }}
              labelFormatter={(label: any) =>
                `Department: ${String(label)}`
              }
            />
            {/* Background budget bar */}
            <Bar
              dataKey="budget"
              name="Budget"
              fill="#757b84ff"
              radius={[4, 4, 4, 4]}
            />
            {/* Foreground actuals bar with per-department color */}
            <Bar
              dataKey="actuals"
              name="Actuals"
              radius={[4, 4, 4, 4]}
            >
              {data.map((row, idx) => {
                const over = row.actuals > row.budget;
                const fill = over ? "#dc2626" : "#16a34a";
                return <Cell key={idx} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: "#757b84ff" }} />
          <span>Budget</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: "#16a34a" }} />
          <span>Actuals (at or under budget)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: "#dc2626" }} />
          <span>Actuals (over budget)</span>
        </div>
      </div>

      {/* Accessible tabular representation of the same data */}
      {showTable && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2 text-left">
                  Department
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Budget
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Actuals
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  % spent
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.department_name}
                  className="border-t border-slate-200"
                >
                  <th
                    scope="row"
                    className="px-3 py-2 text-left font-medium text-slate-800"
                  >
                    {row.department_name}
                  </th>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {formatCurrency(row.budget)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {formatCurrency(row.actuals)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {formatPercent(row.percentSpent, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
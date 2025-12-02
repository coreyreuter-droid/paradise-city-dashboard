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
  if (abs >= 1_000_000) return `$${Math.round(v / 1_000_000)}M`;
  if (abs >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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
    }));

    // Height scales with number of rows, capped so it doesn't get ridiculous
    const base = 120;
    const perRow = 28;
    const rows = Math.max(chartData.length, 3);
    const chartHeight = Math.min(420, base + rows * perRow);

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

  return (
    <div className="space-y-5">
      {/* Summary + execution bar */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Spending by department
            </h3>
            <p className="text-xs text-slate-500">
              Fiscal year {year}. Each bar compares budgeted
              versus actual spending.
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
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
            <span>Execution progress</span>
            <span className="font-mono">
              {formatPercent(execPct, 1)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${execPct}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            <span className="font-medium text-slate-800">
              {variance >= 0
                ? "Over budget:"
                : "Under budget:"}
            </span>{" "}
            <span>
              {formatCurrency(Math.abs(variance))} (
              {formatPercent(variancePct, 1)})
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Hover the bars below to see details by
            department.
          </div>
        </div>
      </section>

      {/* Bar chart */}
      <section className="rounded-lg border border-slate-200 bg-white px-3 py-3">
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

        {/* Clear chart key */}
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
      </section>
    </div>
  );
}

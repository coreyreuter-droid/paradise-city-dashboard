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

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

// Custom legend with split-color swatch for Actuals
const CustomLegend = () => {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-6 text-xs">
      {/* Budget */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ backgroundColor: "#4b5563" }} // slate-600
        />
        <span>Budget</span>
      </div>

      {/* Actual – half green, half red */}
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 overflow-hidden rounded-sm">
          <span
            className="inline-block h-full w-1/2 float-left"
            style={{ backgroundColor: "#10b981" }} // emerald-500
          />
          <span
            className="inline-block h-full w-1/2 float-left"
            style={{ backgroundColor: "#FF746C" }} // red-500
          />
        </span>
        <span>Actual (green = under, red = over)</span>
      </div>
    </div>
  );
};

export default function BudgetCharts({ year, departments }: Props) {
  const { totalBudget, totalActuals, variance, variancePct, execPct } =
    useMemo(() => {
      const totalBudget = departments.reduce((sum, d) => sum + d.budget, 0);
      const totalActuals = departments.reduce(
        (sum, d) => sum + d.actuals,
        0
      );
      const variance = totalActuals - totalBudget;
      const variancePct =
        totalBudget === 0 ? 0 : (variance / totalBudget) * 100;
      const execPctRaw =
        totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;
      const execPct = Math.max(0, Math.min(100, execPctRaw));

      return { totalBudget, totalActuals, variance, variancePct, execPct };
    }, [departments]);

  const chartData = useMemo(
    () =>
      departments.map((d) => ({
        name: d.department_name,
        Budget: Math.round(d.budget),
        Actual: Math.round(d.actuals),
      })),
    [departments]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Topline card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-3 flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fiscal Year {year}
            </h2>
            <p className="text-lg font-semibold text-slate-900">
              Budget vs Actuals Overview
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Total Budget: {formatCurrency(totalBudget)}</p>
            <p>Total Actuals: {formatCurrency(totalActuals)}</p>
          </div>
        </header>

        {/* Execution progress */}
        <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
          <span>Execution</span>
          <span>{execPct.toFixed(1)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${execPct}%` }}
          />
        </div>

        {/* Variance summary */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            <span className="font-medium text-slate-800">
              {variance >= 0 ? "Over Budget" : "Under Budget"}:
            </span>{" "}
            <span
              className={
                variance >= 0 ? "text-text-emerald-600" : "text-emerald-600"
              }
            >
              {formatCurrency(Math.abs(variance))} (
              {variancePct.toFixed(1)}%)
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Hover bars below to see details per department.
          </div>
        </div>
      </section>

      {/* Department bar chart */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-3 flex items-baseline justify-between gap-4">
          <p className="text-sm font-semibold text-slate-900">
            Departments – Budget vs Actuals
          </p>
          <p className="text-xs text-slate-500 max-w-sm text-right">
            Planned budget vs actual spending by department for {year}.
          </p>
        </header>

        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
              barGap={0}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickFormatter={(value) =>
                  value >= 1_000_000
                    ? `${(value / 1_000_000).toFixed(1)}M`
                    : `${(value / 1_000).toFixed(0)}k`
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fontSize: 11 }}
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
              <Bar dataKey="Actual" barSize={8} radius={[0, 0, 0, 0]}>
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

          {/* Custom legend under the chart */}
          <CustomLegend />
        </div>
      </section>
    </div>
  );
}

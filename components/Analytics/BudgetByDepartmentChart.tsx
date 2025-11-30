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
import { formatCurrency } from "@/lib/format";

export type DepartmentSummary = {
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

export default function BudgetByDepartmentChart({
  year, // kept for future use
  departments,
}: Props) {
  const { chartData, longestLabel } = useMemo(() => {
    const sorted = [...departments].sort((a, b) => b.budget - a.budget);

    const data = sorted.map((d) => ({
      name: d.department_name || "Unspecified",
      budget: Number(d.budget || 0),
      actual: Number(d.actuals || 0),
    }));

    const longestLabel = data.reduce(
      (max, d) => Math.max(max, d.name.length),
      0
    );

    return { chartData: data, longestLabel };
  }, [departments]);

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No budget/actuals data available for this year.
      </p>
    );
  }

  const height = Math.max(260, chartData.length * 28);
  const yAxisWidth =
    longestLabel > 22 ? 190 : longestLabel > 16 ? 160 : 130;

  return (
    <>
      <div className="mt-2 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 10,
              right: 28,
              left: 8,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />

            <XAxis
              type="number"
              tickFormatter={formatAxisCurrency}
              domain={[0, "auto"]}
            />

            <YAxis
              dataKey="name"
              type="category"
              width={yAxisWidth}
              tick={{ fontSize: 11 }}
            />

            <Tooltip
              formatter={(value: number, name) => [
                formatCurrency(value),
                name === "budget" ? "Budget" : "Actual",
              ]}
            />

            <Bar dataKey="budget" barSize={12} fill="#4b5563" />

            <Bar dataKey="actual" barSize={12}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.actual <= entry.budget ? "#10b981" : "#FF746C"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-6 text-xs text-slate-600">
        <span className="font-semibold uppercase tracking-wide text-slate-500">
          Chart key:
        </span>

        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-slate-600" />
          <span>Budget</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 overflow-hidden rounded-sm">
            <span className="inline-block h-full w-1/2 float-left bg-emerald-500" />
            <span className="inline-block h-full w-1/2 float-left bg-[#FF746C]" />
          </span>
          <span>Actual (green = under, red = over)</span>
        </div>
      </div>
    </>
  );
}

// components/Analytics/BudgetByDepartmentChart.tsx
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
  accentColor?: string;
};

const formatAxisCurrencyShort = (v: number) => {
  if (v === 0) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${Math.round(v / 1_000_000)}M`;
  if (abs >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

const shortenLabel = (name: string) => {
  if (name.length <= 26) return name;
  return name.slice(0, 23) + "…";
};

export default function BudgetByDepartmentChart({
  year,
  departments,
  accentColor = "#0f172a",
}: Props) {
  const data = useMemo(
    () =>
      [...departments].sort((a, b) => b.budget - a.budget),
    [departments]
  );

  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No department budget data available for {year}.
      </p>
    );
  }

  return (
    <figure
      role="group"
      aria-labelledby="budget-by-dept-heading"
      aria-describedby="budget-by-dept-desc"
      className="space-y-3"
    >
      <h3
        id="budget-by-dept-heading"
        className="text-sm font-semibold text-slate-900"
      >
        Budget by department – {year}
      </h3>
      <p id="budget-by-dept-desc" className="sr-only">
        Horizontal bar chart and data table showing total budget,
        actuals, and percent of budget spent for each department
        in fiscal year {year}, sorted from largest to smallest.
      </p>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 120, right: 16, top: 8, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
            />
            <XAxis
              type="number"
              tickFormatter={(v) =>
                formatAxisCurrencyShort(Number(v))
              }
            />
            <YAxis
              type="category"
              dataKey="department_name"
              tickFormatter={shortenLabel}
              width={160}
            />
            <Tooltip
              formatter={(value: any, name: string) => {
                if (name === "Budget") {
                  return [formatCurrency(Number(value)), "Budget"];
                }
                if (name === "Actuals") {
                  return [formatCurrency(Number(value)), "Actuals"];
                }
                if (name === "% spent") {
                  return [
                    formatPercent(Number(value)),
                    "% of budget spent",
                  ];
                }
                return value;
              }}
              labelFormatter={(label: any) =>
                `Department: ${String(label)}`
              }
            />
            <Bar dataKey="budget" name="Budget">
              {data.map((_, idx) => (
                <Cell key={idx} fill={accentColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible tabular representation of the same data */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 text-xs">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
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
                  {formatPercent(row.percentSpent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

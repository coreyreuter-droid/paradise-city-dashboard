// components/City/ParadiseHomeMultiYearChart.tsx
"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { BudgetRow, ActualRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type Props = {
  budgets: BudgetRow[];
  actuals: ActualRow[];
};

export default function ParadiseHomeMultiYearChart({
  budgets,
  actuals,
}: Props) {
  const yearSet = new Set<number>();

  budgets.forEach((b) => yearSet.add(b.fiscal_year));
  actuals.forEach((a) => yearSet.add(a.fiscal_year));

  const years = Array.from(yearSet).sort((a, b) => a - b);

  const data = years.map((year) => {
    const yearBudget = budgets
      .filter((b) => b.fiscal_year === year)
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const yearActuals = actuals
      .filter((a) => a.fiscal_year === year)
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);

    return {
      year,
      budget: yearBudget,
      actuals: yearActuals,
    };
  });

  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No multi-year data available yet.
      </p>
    );
  }

  return (
    <figure
      role="group"
      aria-labelledby="home-multi-year-heading"
      aria-describedby="home-multi-year-desc"
      className="space-y-3"
    >
      <h3
        id="home-multi-year-heading"
        className="text-sm font-semibold text-slate-900"
      >
        Multi-year budget vs actuals
      </h3>
      <p id="home-multi-year-desc" className="sr-only">
        Column chart and data table showing total annual budget and
        actual spending for each fiscal year.
      </p>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis
              tickFormatter={(v) =>
                formatCurrency(Number(v)).replace("$", "")
              }
            />
            <Tooltip
              formatter={(value: any) =>
                formatCurrency(Number(value))
              }
            />
            <Legend />
            {/* add color back in */}
            <Bar
              dataKey="actuals"
              name="Actuals"
              fill="#0f766e"
            />
            <Bar
              dataKey="budget"
              name="Budget"
              fill="#4b5563"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible tabular representation */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 text-xs">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th scope="col" className="px-3 py-2 text-left">
                Fiscal year
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Budget
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Actuals
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.year}
                className="border-t border-slate-200"
              >
                <th
                  scope="row"
                  className="px-3 py-2 text-left font-medium text-slate-800"
                >
                  {row.year}
                </th>
                <td className="px-3 py-2 text-right text-slate-700">
                  {formatCurrency(row.budget)}
                </td>
                <td className="px-3 py-2 text-right text-slate-700">
                  {formatCurrency(row.actuals)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

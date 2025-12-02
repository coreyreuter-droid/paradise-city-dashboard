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
  years: number[];
  budgets: BudgetRow[];
  actuals: ActualRow[];
};

function toYear(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const formatAxisCurrencyShort = (v: number) => {
  if (v === 0) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${Math.round(v / 1_000_000)}M`;
  if (abs >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export default function MultiYearBudgetActualsChart({
  years,
  budgets,
  actuals,
}: Props) {
  const sortedYears = [...years].sort((a, b) => a - b).slice(-5);

  const data = sortedYears.map((year) => {
    const budgetTotal = budgets
      .filter((b) => toYear(b.fiscal_year) === year)
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const actualTotal = actuals
      .filter((a) => toYear(a.fiscal_year) === year)
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);

    return {
      year,
      budget: budgetTotal,
      actuals: actualTotal,
    };
  });

  if (data.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No multi-year data available.
      </p>
    );
  }

  return (
    <div className="h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 40, bottom: 8 }}
          barCategoryGap={24}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatAxisCurrencyShort}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <Tooltip
            formatter={(value: any) =>
              formatCurrency(Number(value))
            }
          />
          <Legend />
          <Bar dataKey="actuals" name="Actuals" />
          <Bar dataKey="budget" name="Budget" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
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
import { formatCurrency } from "@/lib/format";

type YearTotalsRow = {
  year: number;
  Budget: number;
  Actuals: number;
  Variance: number;
};

type Props = {
  yearTotals: YearTotalsRow[];
};

export default function ParadiseHomeMultiYearChart({ yearTotals }: Props) {
  // WCAG 2.1 AA: Respect reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const data = (yearTotals ?? []).map((r) => ({
    year: r.year,
    budget: Number(r.Budget || 0),
    actuals: Number(r.Actuals || 0),
  }));

  if (data.length === 0) {
    return <p className="text-sm text-slate-600">No multi-year data available yet.</p>;
  }

  const yTickFormatter = (value: number) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    const abs = Math.abs(n);

    if (abs >= 1_000_000_000) return `${(abs / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(abs / 1_000).toFixed(1)}K`;

    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  };

  return (
    <figure
      role="group"
      aria-labelledby="home-multi-year-heading"
      aria-describedby="home-multi-year-desc"
      className="space-y-3"
    >
      <p id="home-multi-year-desc" className="sr-only">
        Column chart and data table showing total annual budget and actual spending for each fiscal year.
      </p>

      <div className="h-56 w-full min-w-0 overflow-hidden sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: "#e2e8f0" }} tick={{ fontSize: 11, fill: "#475569" }} />
            <YAxis tickFormatter={yTickFormatter} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} tick={{ fontSize: 11, fill: "#475569" }} />
            <Tooltip
              formatter={(value: any, name: any) => [
                formatCurrency(Number(value)),
                name === "budget" ? "Budget" : "Actuals",
              ]}
              labelFormatter={(label: any) => `Fiscal year ${label}`}
              wrapperClassName="text-xs"
              contentStyle={{
                borderRadius: 8,
                borderColor: "#e2e8f0",
                boxShadow: "0 8px 16px rgba(15,23,42,0.12)",
              }}
            />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="actuals"
              name="Actuals"
              fill="#0f766e"
              radius={[4, 4, 0, 0]}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="budget"
              name="Budget"
              fill="#4b5563"
              radius={[4, 4, 0, 0]}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th scope="col" className="px-3 py-2 text-left">Fiscal year</th>
              <th scope="col" className="px-3 py-2 text-right">Budget</th>
              <th scope="col" className="px-3 py-2 text-right">Actuals</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.year} className="border-t border-slate-200 even:bg-slate-50/40">
                <th scope="row" className="px-3 py-2 text-left font-medium text-slate-800">
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
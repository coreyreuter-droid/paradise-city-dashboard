"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
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

const BUDGET_COLOR = "#64748b";
const ACTUALS_COLOR = "#0f766e";

const FMT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});
function fmtAxis(v: number) {
  if (!Number.isFinite(v)) return "";
  return `$${FMT.format(v)}`;
}

export default function ParadiseHomeMultiYearChart({ yearTotals }: Props) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const data = useMemo(
    () =>
      (yearTotals ?? []).map((r) => ({
        year: String(r.year),
        budget: Number(r.Budget || 0),
        actuals: Number(r.Actuals || 0),
      })),
    [yearTotals]
  );

  // YoY change for actuals
  const yoyChange = useMemo(() => {
    if (data.length < 2) return null;
    const latest = data[data.length - 1].actuals;
    const prev = data[data.length - 2].actuals;
    if (prev === 0) return null;
    const pct = ((latest - prev) / prev) * 100;
    return { pct, up: pct >= 0 };
  }, [data]);

  if (data.length === 0) {
    return <p className="text-sm text-slate-600">No multi-year data available yet.</p>;
  }

  return (
    <figure
      role="group"
      aria-labelledby="home-multi-year-heading"
      aria-describedby="home-multi-year-desc"
      className="space-y-3"
    >
      <p id="home-multi-year-desc" className="sr-only">
        Column chart showing total annual budget and actual spending for each fiscal year.
      </p>

      {/* Custom legend + YoY */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[12px] text-slate-600">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: ACTUALS_COLOR }} aria-hidden="true" />
            Actual spending
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-slate-600">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: BUDGET_COLOR }} aria-hidden="true" />
            Adopted budget
          </span>
        </div>
        {yoyChange && (
          <span className={`text-[12px] font-medium ${yoyChange.up ? "text-amber-700" : "text-emerald-700"}`}>
            {yoyChange.up ? "↑" : "↓"} {Math.abs(yoyChange.pct).toFixed(1)}% from prior year
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#475569", fontWeight: 500 }}
            />
            <YAxis
              tickFormatter={fmtAxis}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
              width={52}
            />
            <RTooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === "actuals" ? "Actual spending" : "Adopted budget",
              ]}
              labelFormatter={(label) => `FY ${label}`}
              contentStyle={{
                backgroundColor: "#ffffff",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                fontSize: 13,
              }}
              labelStyle={{ color: "#0f172a", fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ color: "#334155", padding: "1px 0" }}
              cursor={{ fill: "#f1f5f9" }}
            />
            <Bar
              dataKey="actuals"
              name="actuals"
              fill={ACTUALS_COLOR}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={700}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="budget"
              name="budget"
              fill={BUDGET_COLOR}
              radius={[4, 4, 0, 0]}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={700}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Screen reader data table */}
      <table className="sr-only">
        <caption>Budget and spending by fiscal year</caption>
        <thead>
          <tr>
            <th scope="col">Fiscal year</th>
            <th scope="col">Budget</th>
            <th scope="col">Actuals</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.year}>
              <th scope="row">{row.year}</th>
              <td>{formatCurrency(row.budget)}</td>
              <td>{formatCurrency(row.actuals)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

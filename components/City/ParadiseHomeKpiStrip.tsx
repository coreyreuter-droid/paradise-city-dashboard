// components/City/ParadiseHomeKpiStrip.tsx
"use client";

import { formatCurrency, formatPercent } from "@/lib/format";

type Props = {
  totalBudget: number;
  totalActuals: number;
  variance: number;
  execPct: number;
  deptCount: number;
  txCount: number;
  topDepartment: string | null;
  accentColor?: string;
};

export default function KpiStrip({
  totalBudget,
  totalActuals,
  variance,
  execPct,
  deptCount,
  txCount,
  topDepartment,
  accentColor,
}: Props) {
  const labelStyle = accentColor
    ? { color: accentColor }
    : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div
          className="text-[10px] font-semibold uppercase"
          style={labelStyle}
        >
          Total Budget
        </div>
        <div className="mt-1 text-xl font-bold text-slate-900">
          {formatCurrency(totalBudget)}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div
          className="text-[10px] font-semibold uppercase"
          style={labelStyle}
        >
          Total Actuals
        </div>
        <div className="mt-1 text-xl font-bold text-slate-900">
          {formatCurrency(totalActuals)}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          {formatPercent(execPct, 1)} of budget spent
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div
          className="text-[10px] font-semibold uppercase"
          style={labelStyle}
        >
          Variance
        </div>
        <div
          className={[
            "mt-1 text-xl font-bold",
            variance > 0
              ? "text-emerald-700"
              : variance < 0
              ? "text-red-700"
              : "text-slate-900",
          ].join(" ")}
        >
          {formatCurrency(variance)}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Actuals minus budget
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div
          className="text-[10px] font-semibold uppercase"
          style={labelStyle}
        >
          Departments
        </div>
        <div className="mt-1 text-xl font-bold text-slate-900">
          {deptCount}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div
          className="text-[10px] font-semibold uppercase"
          style={labelStyle}
        >
          Transactions
        </div>
        <div className="mt-1 text-xl font-bold text-slate-900">
          {txCount.toLocaleString()}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div
          className="text-[10px] font-semibold uppercase"
          style={labelStyle}
        >
          Largest Department (by Budget)
        </div>
        <div className="mt-1 text-xs font-semibold text-slate-900 line-clamp-2">
          {topDepartment || "—"}
        </div>
      </div>
    </div>
  );
}

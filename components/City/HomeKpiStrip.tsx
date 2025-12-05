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

export default function ParadiseHomeKpiStrip({
  totalBudget,
  totalActuals,
  variance,
  execPct,
  deptCount,
  txCount,
  topDepartment,
  accentColor,
}: Props) {
  const labelStyle = accentColor ? { color: accentColor } : undefined;
  const varianceLabel =
    variance === 0
      ? "On budget"
      : variance > 0
      ? "Over budget"
      : "Under budget";

  return (
    <section
      aria-label="Key citywide financial metrics"
      className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
    >
      {/* Total budget */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
          style={labelStyle}
        >
          Adopted budget
        </div>
        <div className="mt-1 text-lg font-bold text-slate-900">
          {formatCurrency(totalBudget)}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Total adopted budget across all funds.
        </p>
      </div>

      {/* Total actuals */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
          style={labelStyle}
        >
          Actual spending
        </div>
        <div className="mt-1 text-lg font-bold text-slate-900">
          {formatCurrency(totalActuals)}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Total posted spending for the selected year.
        </p>
      </div>

      {/* Variance */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
          style={labelStyle}
        >
          Variance
        </div>
        <div
          className={`mt-1 text-lg font-bold ${
            variance < 0
              ? "text-emerald-700"
              : variance > 0
              ? "text-red-700"
              : "text-slate-900"
          }`}
        >
          {formatCurrency(Math.abs(variance))}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {varianceLabel} relative to the adopted budget.
        </p>
      </div>

      {/* Budget execution */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
          style={labelStyle}
        >
          Budget execution
        </div>
        <div className="mt-1 text-lg font-bold text-slate-900">
          {formatPercent(execPct, 1)}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Share of adopted budget that has been spent.
        </p>
      </div>

      {/* Departments */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
          style={labelStyle}
        >
          Departments
        </div>
        <div className="mt-1 text-lg font-bold text-slate-900">
          {deptCount.toLocaleString("en-US")}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          With budget or spending in the selected year.
        </p>
      </div>

      {/* Transactions + top department */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
          style={labelStyle}
        >
          Transactions
        </div>
        <div className="mt-1 text-lg font-bold text-slate-900">
          {txCount.toLocaleString("en-US")}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {topDepartment ? (
            <>
              Highest spending department:{" "}
              <span className="font-semibold">
                {topDepartment}
              </span>
              .
            </>
          ) : (
            "Highest spending department will appear here once data is available."
          )}
        </p>
      </div>
    </section>
  );
}

// components/City/HomeKpiStrip.tsx
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

export default function HomeKpiStrip({
  totalBudget,
  totalActuals,
  variance,
  execPct,
  deptCount,
  txCount,
  topDepartment,
  accentColor,
}: Props) {
  const execPctDisplay = `${Math.round(execPct * 100)}%`;
  const isUnderBudget = variance < 0;
  const isOverBudget = variance > 0;

  const varianceLabel = isUnderBudget
    ? "Under budget"
    : isOverBudget
    ? "Over budget"
    : "On budget";

  const varianceHelp =
    "Difference between adopted budget and posted spending for the selected year.";

  const accentStyle = accentColor
    ? { backgroundColor: accentColor }
    : undefined;
  const labelStyle = accentColor
    ? { color: accentColor }
    : undefined;

  return (
    <section
      aria-label="Key budget and spending indicators"
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Key indicators
        </h2>
        <p className="text-xs text-slate-500">
          Citywide totals and high-level metrics for the selected fiscal year.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Total budget */}
        <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
            style={labelStyle}
          >
            Adopted budget
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {totalBudget > 0 ? formatCurrency(totalBudget) : "—"}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            All funds adopted for the selected fiscal year.
          </p>
        </div>

        {/* Total actuals */}
        <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
            style={labelStyle}
          >
            Posted spending
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {totalActuals > 0 ? formatCurrency(totalActuals) : "—"}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Total expenses posted to date for the same year.
          </p>
        </div>

        {/* Variance */}
        <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
            style={labelStyle}
          >
            {varianceLabel}
          </div>
          <div
            className={`mt-1 text-lg font-bold ${
              isUnderBudget
                ? "text-emerald-700"
                : isOverBudget
                ? "text-red-700"
                : "text-slate-900"
            }`}
          >
            {totalBudget > 0 || totalActuals > 0
              ? formatCurrency(Math.abs(variance))
              : "—"}
          </div>
          <p className="mt-1 text-xs text-slate-500">{varianceHelp}</p>
        </div>

        {/* Execution + counts */}
        <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
              style={labelStyle}
            >
              Execution &amp; activity
            </div>
            {accentColor && (
              <span
                className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={accentStyle}
              >
                {execPctDisplay}
              </span>
            )}
          </div>

          {!accentColor && (
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {execPctDisplay} of budget spent
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-700">
            <div className="rounded-md bg-white/80 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Departments
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                {deptCount}
              </div>
            </div>
            <div className="rounded-md bg-white/80 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Transactions
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                {txCount.toLocaleString()}
              </div>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
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
      </div>
    </section>
  );
}

// components/City/HomeKpiStrip.tsx
"use client";

import { formatCurrency } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

type Props = {
  totalBudget: number;
  totalActuals: number;
  variance: number; // actuals - budget (not used here but kept for compatibility)
  execPct: number;  // 0–1 ratio
  deptCount: number;
  txCount: number;
  topDepartment: string | null;
  accentColor?: string;
  enableTransactions: boolean;
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
  enableTransactions,
}: Props) {
  const safeAccent =
    accentColor && accentColor.trim().length > 0 ? accentColor : undefined;

  const execPctClamped = Number.isFinite(execPct)
    ? Math.max(0, Math.min(execPct, 5))
    : 0;

  const execPctDisplay = `${(execPctClamped * 100).toFixed(1)}%`;

  const remaining = totalBudget - totalActuals;
  const isUnderBudget = remaining >= 0;

  return (
    <section
      aria-label="Key budget and spending indicators"
      className="space-y-3"
    >
      {/* Tiny brand hint only – not on the cards */}
      {safeAccent && (
        <div
          className="h-1 w-12 rounded-full"
          style={{ backgroundColor: safeAccent }}
          aria-hidden="true"
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Key indicators
        </h2>
        <p className="text-sm text-slate-600">
          A quick view of budget, posted spending, and activity for the selected
          fiscal year.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Adopted budget */}
        <div className="cursor-default rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Adopted budget
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {totalBudget > 0 ? (
              <AnimatedNumber value={totalBudget} formatFn={formatCurrency} />
            ) : (
              "—"
            )}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Sum of adopted budgets across all departments for this fiscal year.
          </p>
        </div>

        {/* Posted spending */}
        <div className="cursor-default rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Posted spending
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {totalActuals > 0 ? (
              <AnimatedNumber value={totalActuals} formatFn={formatCurrency} />
            ) : (
              "—"
            )}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Expenses recorded against this year to date.
          </p>
        </div>

        {/* Budget remaining / over */}
        <div className="cursor-default rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Budget remaining
          </p>
          <p
            className={[
              "mt-1 text-base font-semibold",
              isUnderBudget ? "text-emerald-700" : "text-red-700",
            ].join(" ")}
          >
            {totalBudget > 0 || totalActuals > 0 ? (
              <AnimatedNumber
                value={Math.abs(remaining)}
                formatFn={formatCurrency}
              />
            ) : (
              "—"
            )}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {isUnderBudget
              ? "Estimated capacity remaining this year."
              : "Spending is currently ahead of the adopted budget."}
          </p>
        </div>

        {/* Execution & activity */}
        <div className="cursor-default rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Execution &amp; activity
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            <AnimatedNumber
              value={execPctClamped * 100}
              formatFn={(v) => `${v.toFixed(1)}%`}
            />
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Departments:{" "}
            <span className="font-semibold">
              {deptCount > 0 ? deptCount : "—"}
            </span>
            {enableTransactions && (
              <>
                {" "}
                · Transactions:{" "}
                <span className="font-semibold">
                  {txCount.toLocaleString("en-US")}
                </span>
              </>
            )}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {topDepartment ? (
              <>
                Highest spending department:{" "}
                <span className="font-semibold">{topDepartment}</span>.
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

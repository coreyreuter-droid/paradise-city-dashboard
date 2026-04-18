// components/City/HomeKpiStrip.tsx
"use client";

import { formatCurrency } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import FinanceTooltip from "@/components/ui/FinanceTooltip";

type Props = {
  totalBudget: number;
  totalActuals: number;
  variance: number;
  execPct: number; // 0–1 ratio
  deptCount: number;
  txCount: number;
  topDepartment: string | null;
  accentColor?: string;
  enableTransactions: boolean;
  population?: number | null;
  priorYearBudget?: number | null;
  priorYearActuals?: number | null;
};

function YoyBadge({ current, prior }: { current: number; prior: number | null | undefined }) {
  if (!prior || prior === 0) return null;
  const delta = ((current - prior) / prior) * 100;
  const sign = delta > 0 ? "+" : "";
  const isUp = delta > 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
        isUp
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700"
      }`}
    >
      <svg viewBox="0 0 10 10" className={`h-2.5 w-2.5 ${isUp ? "" : "rotate-180"}`} fill="none" aria-hidden="true">
        <path d="M5 2L8.5 7H1.5L5 2Z" fill="currentColor" />
      </svg>
      {sign}{Math.abs(delta).toFixed(1)}% vs prior
    </span>
  );
}

const formatCompact = (v: number): string => {
  if (Math.abs(v) >= 1_000_000_000) return "$" + (v / 1_000_000_000).toFixed(1) + "B";
  if (Math.abs(v) >= 1_000_000) return "$" + (v / 1_000_000).toFixed(1) + "M";
  if (Math.abs(v) >= 1_000) return "$" + Math.round(v / 1_000).toLocaleString() + "K";
  return "$" + Math.round(v).toLocaleString();
};

export default function ParadiseHomeKpiStrip({
  totalBudget,
  totalActuals,
  variance: _variance,
  execPct,
  deptCount,
  txCount,
  topDepartment,
  accentColor,
  enableTransactions,
  population,
  priorYearBudget,
  priorYearActuals,
}: Props) {
  const safeAccent =
    accentColor && accentColor.trim().length > 0 ? accentColor : undefined;

  const execPctClamped = Number.isFinite(execPct)
    ? Math.max(0, Math.min(execPct, 5))
    : 0;

  const remaining = totalBudget - totalActuals;
  const isUnderBudget = remaining >= 0;

  return (
    <section
      aria-label="Key budget and spending indicators"
      className="space-y-3"
    >
      {/* Tiny brand hint */}
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
          Budget, spending, and activity for the selected fiscal year.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {/* Adopted budget */}
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <FinanceTooltip term="adopted budget">Adopted budget</FinanceTooltip>
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {totalBudget > 0 ? (
              <AnimatedNumber value={totalBudget} formatFn={formatCurrency} />
            ) : (
              "—"
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {population && population > 0 && totalBudget > 0 && (
              <span className="text-[11px] text-slate-500">
                {formatCompact(totalBudget / population)} per resident
              </span>
            )}
            <YoyBadge current={totalBudget} prior={priorYearBudget} />
          </div>
        </div>

        {/* Posted spending */}
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <FinanceTooltip term="actuals">Spent to date</FinanceTooltip>
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {totalActuals > 0 ? (
              <AnimatedNumber value={totalActuals} formatFn={formatCurrency} />
            ) : (
              "—"
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {population && population > 0 && totalActuals > 0 && (
              <span className="text-[11px] text-slate-500">
                {formatCompact(totalActuals / population)} per resident
              </span>
            )}
            <YoyBadge current={totalActuals} prior={priorYearActuals} />
          </div>
        </div>

        {/* Budget remaining */}
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <FinanceTooltip term="variance">
              {isUnderBudget ? "Budget remaining" : "Over budget"}
            </FinanceTooltip>
          </p>
          <p
            className={`mt-1 text-lg font-semibold ${
              isUnderBudget ? "text-emerald-700" : "text-red-700"
            }`}
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
          <p className="mt-1 text-[11px] text-slate-500">
            {isUnderBudget
              ? "Capacity remaining this year"
              : "Spending ahead of plan"}
          </p>
        </div>

        {/* Execution & activity */}
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <FinanceTooltip term="budget execution">Execution</FinanceTooltip>
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            <AnimatedNumber
              value={execPctClamped * 100}
              formatFn={(v) => `${v.toFixed(1)}%`}
            />
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            <span>
              <FinanceTooltip term="department">Depts</FinanceTooltip>:{" "}
              <span className="font-semibold text-slate-700">
                {deptCount || "—"}
              </span>
            </span>
            {enableTransactions && (
              <span>
                Txns:{" "}
                <span className="font-semibold text-slate-700">
                  {txCount.toLocaleString("en-US")}
                </span>
              </span>
            )}
          </div>
          {topDepartment && (
            <p className="mt-1 text-[11px] text-slate-500">
              Top spender:{" "}
              <span className="font-semibold text-slate-700">{topDepartment}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

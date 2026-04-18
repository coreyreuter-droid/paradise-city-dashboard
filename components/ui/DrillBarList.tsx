"use client";

import React from "react";
import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/format";

/* =============================================================================
   Types
============================================================================= */

export type DrillBarItem = {
  name: string;
  budget: number;
  actual: number;
  href?: string;
  onClick?: () => void;
};

type Props = {
  items: DrillBarItem[];
  /** Show actuals overlay bar */
  showActuals?: boolean;
  /** Show the summary table below bars */
  showTable?: boolean;
  /** Maximum number of items to show before "Show all" */
  maxVisible?: number;
  /** Aria label for the section */
  ariaLabel?: string;
};

/* =============================================================================
   Helpers
============================================================================= */

const formatCompact = (v: number): string => {
  if (Math.abs(v) >= 1_000_000_000) return "$" + (v / 1_000_000_000).toFixed(1) + "B";
  if (Math.abs(v) >= 1_000_000) return "$" + (v / 1_000_000).toFixed(1) + "M";
  if (Math.abs(v) >= 1_000) return "$" + Math.round(v / 1_000) + "K";
  return "$" + Math.round(v).toLocaleString();
};

/* =============================================================================
   Component
============================================================================= */

export default function DrillBarList({
  items,
  showActuals = true,
  showTable = false,
  maxVisible,
  ariaLabel = "Budget breakdown",
}: Props) {
  const [showAll, setShowAll] = React.useState(false);

  const maxBudget = items.reduce((m, r) => Math.max(m, r.budget), 0);
  const totalBudget = items.reduce((s, r) => s + r.budget, 0);
  const totalActuals = items.reduce((s, r) => s + r.actual, 0);

  const visibleItems =
    maxVisible && !showAll ? items.slice(0, maxVisible) : items;
  const hasMore = maxVisible ? items.length > maxVisible : false;

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-3 rounded-full bg-slate-300/60" />
          Budget
        </span>
        {showActuals && (
          <>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-3 rounded-full bg-emerald-500/70" />
              Actual (on track)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-3 rounded-full bg-red-400/70" />
              Actual (over budget)
            </span>
          </>
        )}
      </div>

      {/* Bars */}
      <div role="list" aria-label={ariaLabel} className="space-y-0.5">
        {visibleItems.map((item) => {
          const budgetPct =
            maxBudget > 0
              ? Math.min((item.budget / maxBudget) * 100, 100)
              : 0;
          const actualPct =
            maxBudget > 0
              ? Math.min((item.actual / maxBudget) * 100, 100)
              : 0;
          const overBudget = item.actual > item.budget && item.budget > 0;

          const inner = (
            <>
              <span className="min-w-0 flex-shrink-0 truncate text-sm font-medium text-slate-800 sm:w-40 sm:min-w-[10rem]">
                {item.name}
              </span>

              <span className="relative flex h-5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-slate-300/60 transition-all duration-500 ease-out"
                  style={{ width: `${budgetPct}%` }}
                />
                {showActuals && item.actual > 0 && (
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                      overBudget ? "bg-red-400/70" : "bg-emerald-500/70"
                    }`}
                    style={{ width: `${actualPct}%` }}
                  />
                )}
              </span>

              <span className="min-w-[4.5rem] text-right font-mono text-xs text-slate-600 sm:min-w-[5.5rem]">
                {formatCompact(item.budget)}
              </span>

              {(item.href || item.onClick) && (
                <span
                  className="text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500"
                  aria-hidden="true"
                >
                  ›
                </span>
              )}
            </>
          );

          if (item.href) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 transition-all duration-150 hover:bg-slate-50 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 sm:gap-3 sm:px-3"
                role="listitem"
              >
                {inner}
              </Link>
            );
          }

          if (item.onClick) {
            return (
              <button
                key={item.name}
                type="button"
                onClick={item.onClick}
                className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-all duration-150 hover:bg-slate-50 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 sm:gap-3 sm:px-3"
                role="listitem"
              >
                {inner}
              </button>
            );
          }

          return (
            <div
              key={item.name}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 sm:gap-3 sm:px-3"
              role="listitem"
            >
              {inner}
            </div>
          );
        })}
      </div>

      {/* Show all toggle */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 transition-colors"
        >
          {showAll
            ? `Show top ${maxVisible}`
            : `Show all ${items.length} items`}
        </button>
      )}

      {/* Summary table */}
      {showTable && items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-right">Budget</th>
                {showActuals && (
                  <>
                    <th className="px-3 py-2 text-right">Actual</th>
                    <th className="px-3 py-2 text-right">% spent</th>
                    <th className="px-3 py-2 text-right">Variance</th>
                  </>
                )}
                <th className="px-3 py-2 text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row) => {
                const pctSpent =
                  row.budget > 0
                    ? (row.actual / row.budget) * 100
                    : 0;
                const variance = row.budget - row.actual;
                const share =
                  totalBudget > 0
                    ? ((row.budget / totalBudget) * 100).toFixed(1) + "%"
                    : "—";

                return (
                  <tr key={row.name} className="transition-colors hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {row.name}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                      {formatCurrency(row.budget)}
                    </td>
                    {showActuals && (
                      <>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          {formatCurrency(row.actual)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {formatPercent(pctSpent, 1)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-mono ${
                            variance > 0
                              ? "text-emerald-700"
                              : variance < 0
                              ? "text-red-700"
                              : "text-slate-700"
                          }`}
                        >
                          {formatCurrency(variance)}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2 text-right text-slate-500">
                      {share}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td className="px-3 py-2 text-slate-900">Total</td>
                <td className="px-3 py-2 text-right font-mono text-slate-900">
                  {formatCurrency(totalBudget)}
                </td>
                {showActuals && (
                  <>
                    <td className="px-3 py-2 text-right font-mono text-slate-900">
                      {formatCurrency(totalActuals)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-900">
                      {totalBudget > 0
                        ? formatPercent(
                            (totalActuals / totalBudget) * 100,
                            1
                          )
                        : "—"}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono ${
                        totalBudget - totalActuals >= 0
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {formatCurrency(totalBudget - totalActuals)}
                    </td>
                  </>
                )}
                <td className="px-3 py-2 text-right text-slate-500">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

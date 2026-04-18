"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";
import DepartmentIcon from "@/components/ui/DepartmentIcon";
import type { BudgetActualsYearDeptRow, BudgetActualsYearFundRow, BudgetActualsYearFundDeptRow } from "@/lib/queries";

/* =============================================================================
   Types
============================================================================= */

type DrillLevel = "gov" | "department" | "fund" | "fund-dept";
type BreakdownMode = "department" | "fund";

type DrillState = {
  level: DrillLevel;
  departmentName: string | null;
  fundName: string | null;
  breakdownMode: BreakdownMode;
};

type BarRow = {
  name: string;
  budget: number;
  actual: number;
  pctSpent: number;
  drillKey: string;
};

type Props = {
  fiscalYear: number;
  /** Department-level rollup */
  deptSummary: BudgetActualsYearDeptRow[];
  /** Fund-level rollup */
  fundSummary: BudgetActualsYearFundRow[];
  /** Fund × Department rollup */
  fundDeptSummary: BudgetActualsYearFundDeptRow[];
  /** Population for per-capita */
  population?: number | null;
  /** Accent color from portal settings */
  accentColor?: string;
  /** Whether actuals data exists for this year */
  hasActuals?: boolean;
  /** Enable transaction links */
  enableTransactions?: boolean;
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

const pctChange = (current: number, prior: number): string | null => {
  if (prior === 0) return null;
  const delta = ((current - prior) / prior) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
};

/* =============================================================================
   Subcomponents
============================================================================= */

function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; onClick?: () => void }>;
}) {
  return (
    <nav aria-label="Drill-through breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span className="text-slate-300" aria-hidden="true">
              ›
            </span>
          )}
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="underline underline-offset-2 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 rounded-sm"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-medium text-slate-700">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

function KpiStrip({
  totalBudget,
  totalActuals,
  hasActuals,
  population,
}: {
  totalBudget: number;
  totalActuals: number;
  hasActuals: boolean;
  population?: number | null;
}) {
  const remaining = totalBudget - totalActuals;
  const execPct = totalBudget > 0 ? (totalActuals / totalBudget) * 100 : 0;
  const isUnder = remaining >= 0;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3" role="group" aria-label="Key financial indicators">
      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Total budget
        </p>
        <p className="mt-0.5 text-base font-semibold text-slate-900 sm:text-lg">
          {formatCompact(totalBudget)}
        </p>
        {population && population > 0 && (
          <p className="mt-0.5 text-[11px] text-slate-500">
            {formatCompact(totalBudget / population)} per resident
          </p>
        )}
      </div>

      {hasActuals && (
        <>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Spent to date
            </p>
            <p className="mt-0.5 text-base font-semibold text-slate-900 sm:text-lg">
              {formatCompact(totalActuals)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {Math.round(execPct)}% of budget
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {isUnder ? "Remaining" : "Over budget"}
            </p>
            <p
              className={`mt-0.5 text-base font-semibold sm:text-lg ${
                isUnder ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {formatCompact(Math.abs(remaining))}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {isUnder ? "Under plan" : "Above plan"}
            </p>
          </div>
        </>
      )}

      {population && population > 0 && (
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Per resident
          </p>
          <p className="mt-0.5 text-base font-semibold text-slate-900 sm:text-lg">
            {formatCompact(hasActuals ? totalActuals / population : totalBudget / population)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Pop. {population.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

function DrillBar({
  row,
  maxBudget,
  hasActuals,
  onClick,
  showArrow = true,
  showIcon = false,
  accentColor,
}: {
  row: BarRow;
  maxBudget: number;
  hasActuals: boolean;
  onClick: () => void;
  showArrow?: boolean;
  showIcon?: boolean;
  accentColor?: string;
}) {
  const budgetPct = maxBudget > 0 ? Math.min((row.budget / maxBudget) * 100, 100) : 0;
  const actualPct = maxBudget > 0 ? Math.min((row.actual / maxBudget) * 100, 100) : 0;
  const overBudget = row.actual > row.budget && row.budget > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-left transition-all duration-150 hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 sm:gap-3 sm:px-3"
      aria-label={`${row.name}: budget ${formatCurrency(row.budget)}${hasActuals ? `, actual ${formatCurrency(row.actual)}` : ""}. Click to drill down.`}
    >
      {/* Icon */}
      {showIcon && (
        <DepartmentIcon name={row.name} size="sm" accentColor={accentColor} />
      )}

      {/* Name */}
      <span className="min-w-0 flex-shrink-0 truncate text-sm font-medium text-slate-800 sm:w-40 sm:min-w-[10rem]">
        {row.name}
      </span>

      {/* Bar track */}
      <span className="relative flex h-5 flex-1 overflow-hidden rounded-full bg-slate-100">
        {/* Budget bar (background) */}
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-slate-300/60 transition-all duration-500 ease-out"
          style={{ width: `${budgetPct}%` }}
        />
        {/* Actual bar (foreground) */}
        {hasActuals && row.actual > 0 && (
          <span
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
              overBudget ? "bg-red-400/70" : "bg-emerald-500/70"
            }`}
            style={{ width: `${actualPct}%` }}
          />
        )}
      </span>

      {/* Amount */}
      <span className="min-w-[4.5rem] text-right font-mono text-xs text-slate-600 sm:min-w-[5.5rem]">
        {formatCompact(row.budget)}
      </span>

      {/* Arrow */}
      {showArrow && (
        <span
          className="text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500"
          aria-hidden="true"
        >
          ›
        </span>
      )}
    </button>
  );
}

function BreakdownToggle({
  mode,
  onChange,
}: {
  mode: BreakdownMode;
  onChange: (mode: BreakdownMode) => void;
}) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Breakdown dimension">
      <span className="text-xs text-slate-500">Break down by</span>
      <div className="flex gap-1">
        {(["department", "fund"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 ${
              mode === m
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
            }`}
            aria-pressed={mode === m}
          >
            {m === "department" ? "Department" : "Fund"}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChartLegend({ hasActuals }: { hasActuals: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500" aria-label="Chart legend">
      <span className="flex items-center gap-1">
        <span className="inline-block h-1.5 w-3 rounded-full bg-slate-300/60" />
        Budget
      </span>
      {hasActuals && (
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
  );
}

function DrillHint({ text }: { text: string }) {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-[11px] font-medium text-sky-700">
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path
          d="M8 3v5m0 0l2.5-2.5M8 8L5.5 5.5M4 13h8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {text}
    </p>
  );
}

/* =============================================================================
   Main Component
============================================================================= */

export default function BudgetExplorer({
  fiscalYear,
  deptSummary,
  fundSummary,
  fundDeptSummary,
  population,
  accentColor,
  hasActuals = true,
  enableTransactions = false,
}: Props) {
  const router = useRouter();

  const [drill, setDrill] = useState<DrillState>({
    level: "gov",
    departmentName: null,
    fundName: null,
    breakdownMode: "department",
  });

  // Reset drill state when fiscal year changes
  useEffect(() => {
    setDrill({
      level: "gov",
      departmentName: null,
      fundName: null,
      breakdownMode: "department",
    });
  }, [fiscalYear]);

  /* ---- Compute rows for current drill level ---- */

  const { bars, title, subtitle, totalBudget, totalActuals } = useMemo(() => {
    let rows: BarRow[] = [];
    let title = "";
    let subtitle = "";
    let totalBudget = 0;
    let totalActuals = 0;

    if (drill.level === "gov") {
      if (drill.breakdownMode === "department") {
        rows = (deptSummary ?? []).map((r) => {
          const budget = Number(r.budget_amount || 0);
          const actual = Number(r.actual_amount || 0);
          return {
            name: r.department_name || "Unspecified",
            budget,
            actual,
            pctSpent: budget > 0 ? (actual / budget) * 100 : 0,
            drillKey: r.department_name || "Unspecified",
          };
        });
      } else {
        rows = (fundSummary ?? []).map((r) => {
          const budget = Number(r.budget_amount || 0);
          const actual = Number(r.actual_amount || 0);
          return {
            name: r.fund_name || "Unspecified",
            budget,
            actual,
            pctSpent: budget > 0 ? (actual / budget) * 100 : 0,
            drillKey: r.fund_name || "Unspecified",
          };
        });
      }

      rows.sort((a, b) => b.budget - a.budget);
      totalBudget = rows.reduce((s, r) => s + r.budget, 0);
      totalActuals = rows.reduce((s, r) => s + r.actual, 0);
      title = `FY ${fiscalYear} budget overview`;
      subtitle = `All funds, all departments. Click any row to explore deeper.`;
    }

    if (drill.level === "department" && drill.departmentName) {
      const deptFunds = (fundDeptSummary ?? []).filter(
        (r) => (r.department_name || "Unspecified") === drill.departmentName
      );

      rows = deptFunds.map((r) => {
        const budget = Number(r.budget_amount || 0);
        const actual = Number(r.actual_amount || 0);
        return {
          name: r.fund_name || "Unspecified",
          budget,
          actual,
          pctSpent: budget > 0 ? (actual / budget) * 100 : 0,
          drillKey: r.fund_name || "Unspecified",
        };
      });

      rows.sort((a, b) => b.budget - a.budget);
      totalBudget = rows.reduce((s, r) => s + r.budget, 0);
      totalActuals = rows.reduce((s, r) => s + r.actual, 0);
      title = drill.departmentName;
      subtitle = `Budget and spending by fund for FY ${fiscalYear}`;
    }

    if (drill.level === "fund" && drill.fundName) {
      const fundDepts = (fundDeptSummary ?? []).filter(
        (r) => (r.fund_name || "Unspecified") === drill.fundName
      );

      rows = fundDepts.map((r) => {
        const budget = Number(r.budget_amount || 0);
        const actual = Number(r.actual_amount || 0);
        return {
          name: r.department_name || "Unspecified",
          budget,
          actual,
          pctSpent: budget > 0 ? (actual / budget) * 100 : 0,
          drillKey: r.department_name || "Unspecified",
        };
      });

      rows.sort((a, b) => b.budget - a.budget);
      totalBudget = rows.reduce((s, r) => s + r.budget, 0);
      totalActuals = rows.reduce((s, r) => s + r.actual, 0);
      title = drill.fundName;
      subtitle = `Departments within this fund for FY ${fiscalYear}`;
    }

    return { bars: rows, title, subtitle, totalBudget, totalActuals };
  }, [drill, deptSummary, fundSummary, fundDeptSummary, fiscalYear]);

  const maxBudget = useMemo(
    () => bars.reduce((m, r) => Math.max(m, r.budget), 0),
    [bars]
  );

  /* ---- Breadcrumb items ---- */
  const breadcrumbItems = useMemo(() => {
    const items: Array<{ label: string; onClick?: () => void }> = [];

    items.push({
      label: "Government-wide",
      onClick:
        drill.level !== "gov"
          ? () =>
              setDrill({
                level: "gov",
                departmentName: null,
                fundName: null,
                breakdownMode: drill.breakdownMode,
              })
          : undefined,
    });

    if (drill.level === "department" && drill.departmentName) {
      items.push({ label: drill.departmentName });
    }

    if (drill.level === "fund" && drill.fundName) {
      items.push({ label: drill.fundName });
    }

    return items;
  }, [drill]);

  /* ---- Drill handlers ---- */
  const handleBarClick = useCallback(
    (row: BarRow) => {
      if (drill.level === "gov") {
        if (drill.breakdownMode === "department") {
          setDrill({
            level: "department",
            departmentName: row.drillKey,
            fundName: null,
            breakdownMode: drill.breakdownMode,
          });
        } else {
          setDrill({
            level: "fund",
            departmentName: null,
            fundName: row.drillKey,
            breakdownMode: drill.breakdownMode,
          });
        }
      } else if (drill.level === "department") {
        // Clicking a fund within a department → navigate to department detail
        const deptEncoded = encodeURIComponent(drill.departmentName || "");
        router.push(
          `${cityHref(`/departments/${deptEncoded}`)}?year=${fiscalYear}`
        );
      } else if (drill.level === "fund") {
        // Clicking a department within a fund → navigate to department detail
        const deptEncoded = encodeURIComponent(row.drillKey);
        router.push(
          `${cityHref(`/departments/${deptEncoded}`)}?year=${fiscalYear}`
        );
      }
    },
    [drill, fiscalYear, router]
  );

  /* ---- Hint text ---- */
  const hintText = useMemo(() => {
    if (drill.level === "gov") {
      return drill.breakdownMode === "department"
        ? "Click any department to see its fund breakdown"
        : "Click any fund to see its department breakdown";
    }
    if (drill.level === "department") {
      return "Click a fund to view the full department detail page";
    }
    if (drill.level === "fund") {
      return "Click a department to view its detail page";
    }
    return "";
  }, [drill]);

  if (bars.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-600">
          No budget data available for FY {fiscalYear}.
        </p>
      </div>
    );
  }

  const showActuals = hasActuals && totalActuals > 0;

  return (
    <section
      aria-label="Budget explorer with drill-through"
      className="space-y-4"
    >
      {/* Hint */}
      <DrillHint text={hintText} />

      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Title */}
      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
      </div>

      {/* KPIs */}
      <KpiStrip
        totalBudget={totalBudget}
        totalActuals={totalActuals}
        hasActuals={showActuals}
        population={drill.level === "gov" ? population : undefined}
      />

      {/* Breakdown toggle (gov level only) */}
      {drill.level === "gov" && (
        <BreakdownToggle
          mode={drill.breakdownMode}
          onChange={(mode) =>
            setDrill({
              level: "gov",
              departmentName: null,
              fundName: null,
              breakdownMode: mode,
            })
          }
        />
      )}

      {/* Legend */}
      <ChartLegend hasActuals={showActuals} />

      {/* Bars */}
      <div
        className="space-y-0.5"
        role="list"
        aria-label={`Budget breakdown: ${bars.length} items`}
      >
        {bars.map((row) => (
          <DrillBar
            key={row.drillKey}
            row={row}
            maxBudget={maxBudget}
            hasActuals={showActuals}
            onClick={() => handleBarClick(row)}
            showArrow={drill.level !== "fund-dept"}
            showIcon={
              drill.level === "gov" && drill.breakdownMode === "department" ||
              drill.level === "fund"
            }
            accentColor={accentColor}
          />
        ))}
      </div>

      {/* Summary table */}
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
            {bars.map((row) => {
              const variance = row.budget - row.actual;
              const share =
                totalBudget > 0
                  ? ((row.budget / totalBudget) * 100).toFixed(1) + "%"
                  : "—";

              return (
                <tr
                  key={row.drillKey}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => handleBarClick(row)}
                >
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
                        {formatPercent(row.pctSpent, 1)}
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
                      totalBudget - totalActuals > 0
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
    </section>
  );
}

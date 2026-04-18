"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";

type YearTotalsRow = {
  year: number;
  Budget: number;
  Actuals: number;
  Variance: number;
};

type DeptRow = {
  department_name: string;
  budget: number;
};

type Props = {
  /** Current fiscal year */
  fiscalYear: number;
  /** Current year departments */
  currentDepts: DeptRow[];
  /** Prior year departments (null if no prior year) */
  priorDepts: DeptRow[] | null;
  /** Multi-year totals for overall change */
  yearTotals: YearTotalsRow[];
};

type ChangeItem = {
  name: string;
  current: number;
  prior: number;
  change: number;
  changePct: number;
};

export default function WhatChanged({
  fiscalYear,
  currentDepts,
  priorDepts,
  yearTotals,
}: Props) {
  const changes = useMemo(() => {
    if (!priorDepts || priorDepts.length === 0) return null;

    const priorMap = new Map<string, number>();
    for (const d of priorDepts) {
      priorMap.set(d.department_name, d.budget);
    }

    const items: ChangeItem[] = [];
    for (const d of currentDepts) {
      const prior = priorMap.get(d.department_name);
      if (prior != null && prior > 0) {
        const change = d.budget - prior;
        const changePct = (change / prior) * 100;
        if (Math.abs(change) > 0) {
          items.push({
            name: d.department_name,
            current: d.budget,
            prior,
            change,
            changePct,
          });
        }
      }
    }

    items.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    const increases = items.filter((i) => i.change > 0).slice(0, 3);
    const decreases = items.filter((i) => i.change < 0).slice(0, 3);

    if (increases.length === 0 && decreases.length === 0) return null;

    return { increases, decreases };
  }, [currentDepts, priorDepts]);

  // Overall budget change
  const overallChange = useMemo(() => {
    const currentTotal = yearTotals.find((y) => y.year === fiscalYear);
    const priorTotal = yearTotals.find((y) => y.year === fiscalYear - 1);
    if (!currentTotal || !priorTotal || priorTotal.Budget === 0) return null;

    const change = currentTotal.Budget - priorTotal.Budget;
    const changePct = (change / priorTotal.Budget) * 100;
    return { change, changePct, prior: priorTotal.Budget, current: currentTotal.Budget };
  }, [yearTotals, fiscalYear]);

  if (!changes && !overallChange) return null;

  return (
    <section aria-label="What changed this year" className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
          What changed in FY {fiscalYear}
        </h2>
        {overallChange && (
          <p className="mt-0.5 text-sm text-slate-600">
            Overall budget{" "}
            <span className={`font-semibold ${overallChange.change > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              {overallChange.change > 0 ? "increased" : "decreased"} by{" "}
              {formatCurrency(Math.abs(overallChange.change))}
            </span>
            {" "}({overallChange.change > 0 ? "+" : ""}
            {overallChange.changePct.toFixed(1)}%) compared to FY {fiscalYear - 1}.
          </p>
        )}
      </div>

      {changes && (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Increases */}
          {changes.increases.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Largest budget increases
              </p>
              <div className="mt-2 space-y-2">
                {changes.increases.map((item) => (
                  <Link
                    key={item.name}
                    href={cityHref(`/departments/${encodeURIComponent(item.name)}?year=${fiscalYear}`)}
                    className="group block"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-800 group-hover:underline">
                        {item.name}
                      </span>
                      <span className="whitespace-nowrap text-xs font-semibold text-amber-700">
                        +{formatCurrency(item.change)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {formatCurrency(item.prior)} → {formatCurrency(item.current)} (+{item.changePct.toFixed(1)}%)
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Decreases */}
          {changes.decreases.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Largest budget decreases
              </p>
              <div className="mt-2 space-y-2">
                {changes.decreases.map((item) => (
                  <Link
                    key={item.name}
                    href={cityHref(`/departments/${encodeURIComponent(item.name)}?year=${fiscalYear}`)}
                    className="group block"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-800 group-hover:underline">
                        {item.name}
                      </span>
                      <span className="whitespace-nowrap text-xs font-semibold text-emerald-700">
                        {formatCurrency(item.change)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {formatCurrency(item.prior)} → {formatCurrency(item.current)} ({item.changePct.toFixed(1)}%)
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

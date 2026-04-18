"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { cityHref } from "@/lib/cityRouting";

type DollarSlice = {
  name: string;
  amount: number;
  cents: number;
  color: string;
};

type Props = {
  departments: Array<{
    department_name: string;
    budget: number;
  }>;
  totalBudget: number;
  fiscalYear: number | null;
  accentColor?: string;
};

const COLORS = [
  "#0f766e", // teal-700
  "#1d4ed8", // blue-700
  "#7c3aed", // violet-700
  "#b45309", // amber-700
  "#15803d", // green-700
  "#be123c", // rose-700
  "#0369a1", // sky-700
  "#a16207", // yellow-700
  "#64748b", // slate-500 (other)
];

export default function DollarBreakdown({
  departments,
  totalBudget,
  fiscalYear,
  accentColor,
}: Props) {
  const slices: DollarSlice[] = useMemo(() => {
    if (totalBudget <= 0 || departments.length === 0) return [];

    const sorted = [...departments].sort((a, b) => b.budget - a.budget);
    const topN = sorted.slice(0, 7);
    const otherTotal = sorted
      .slice(7)
      .reduce((s, d) => s + d.budget, 0);

    const result: DollarSlice[] = topN.map((d, i) => ({
      name: d.department_name,
      amount: d.budget,
      cents: Math.round((d.budget / totalBudget) * 100),
      color: COLORS[i % COLORS.length],
    }));

    if (otherTotal > 0) {
      result.push({
        name: "All other",
        amount: otherTotal,
        cents: Math.round((otherTotal / totalBudget) * 100),
        color: COLORS[8],
      });
    }

    // Adjust rounding so cents sum to 100
    const totalCents = result.reduce((s, r) => s + r.cents, 0);
    if (totalCents !== 100 && result.length > 0) {
      result[0].cents += 100 - totalCents;
    }

    return result;
  }, [departments, totalBudget]);

  if (slices.length === 0) return null;

  return (
    <section aria-label="Where your dollar goes" className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
          Where your dollar goes
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">
          For every $1.00 of the{" "}
          {fiscalYear ? `FY ${fiscalYear} ` : ""}budget, here&apos;s
          how it&apos;s allocated.
        </p>
      </div>

      {/* Dollar bar visualization */}
      <div className="space-y-2">
        {/* Stacked bar */}
        <div
          className="flex h-8 w-full overflow-hidden rounded-full"
          role="img"
          aria-label="Dollar allocation bar chart"
        >
          {slices.map((slice) => (
            <div
              key={slice.name}
              className="relative h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${Math.max(slice.cents, 1)}%`,
                backgroundColor: slice.color,
              }}
              title={`${slice.name}: $${(slice.cents / 100).toFixed(2)}`}
            />
          ))}
        </div>

        {/* Slice cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {slices.map((slice) => {
            const deptHref =
              slice.name !== "All other"
                ? cityHref(
                    `/departments/${encodeURIComponent(slice.name)}`
                  )
                : null;

            const content = (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-xs font-medium text-slate-800">
                    {slice.name}
                  </span>
                </div>
                <div className="mt-1 pl-[1.125rem]">
                  <span className="text-lg font-semibold text-slate-900">
                    {slice.cents}¢
                  </span>
                </div>
              </>
            );

            if (deptHref) {
              return (
                <Link
                  key={slice.name}
                  href={deptHref}
                  className="block rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={slice.name}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

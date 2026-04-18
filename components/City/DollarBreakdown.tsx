"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";
import { getDepartmentColor } from "@/components/ui/DepartmentIcon";

type DeptSlice = {
  department_name: string;
  budget: number;
};

type Props = {
  departments: DeptSlice[];
  totalBudget: number;
  fiscalYear: number | null;
  accentColor?: string;
};

const FALLBACK_COLORS = [
  "#0f766e", "#1d4ed8", "#7c3aed", "#b45309",
  "#15803d", "#be123c", "#0369a1", "#a16207",
  "#64748b", "#4338ca", "#0891b2", "#dc2626",
];

export default function DollarBreakdown({ departments, totalBudget, fiscalYear }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const slices = useMemo(() => {
    if (totalBudget <= 0 || departments.length === 0) return [];

    const sorted = [...departments].sort((a, b) => b.budget - a.budget);
    const items = sorted.map((d, i) => ({
      name: d.department_name,
      budget: d.budget,
      share: d.budget / totalBudget,
      cents: Math.round((d.budget / totalBudget) * 100),
      color: getDepartmentColor(d.department_name, FALLBACK_COLORS[i % FALLBACK_COLORS.length]),
    }));

    return items;
  }, [departments, totalBudget]);

  if (slices.length === 0) return null;

  // Build segments for the dollar bar
  let cumulative = 0;
  const segments = slices.map((s) => {
    const start = cumulative;
    cumulative += s.share * 100;
    return { ...s, startPct: start, widthPct: s.share * 100 };
  });

  return (
    <section aria-label="Where your dollar goes" className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
          Where your dollar goes
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">
          For every $1.00 in the {fiscalYear ? `FY ${fiscalYear} ` : ""}budget, here is how it is allocated.
          {" "}Hover or tap a segment to see details.
        </p>
      </div>

      {/* The dollar bar */}
      <div
        className="relative"
        role="img"
        aria-label={`Dollar breakdown: ${slices.map(s => `${s.name} ${s.cents} cents`).join(", ")}`}
      >
        {/* Dollar sign + bar */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-slate-300" aria-hidden="true">$</span>
          <div className="flex-1 overflow-hidden rounded-lg" style={{ height: 44 }}>
            <div className="flex h-full w-full">
              {segments.map((seg, i) => (
                <button
                  key={seg.name}
                  type="button"
                  className="relative h-full transition-all duration-150"
                  style={{
                    width: `${Math.max(seg.widthPct, 0.5)}%`,
                    backgroundColor: seg.color,
                    opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.4,
                    transform: hoveredIndex === i ? "scaleY(1.15)" : "scaleY(1)",
                    transformOrigin: "bottom",
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(i)}
                  onBlur={() => setHoveredIndex(null)}
                  aria-label={`${seg.name}: ${seg.cents} cents of every dollar, ${formatCurrency(seg.budget)}`}
                >
                  {/* Separator line */}
                  {i > 0 && (
                    <div className="absolute inset-y-0 left-0 w-px bg-white/30" aria-hidden="true" />
                  )}
                  {/* Label for large segments */}
                  {seg.widthPct > 10 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white/90 truncate px-1"
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                      aria-hidden="true"
                    >
                      {seg.cents}¢
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hover tooltip */}
        {hoveredIndex !== null && segments[hoveredIndex] && (
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <div
              className="h-4 w-4 flex-shrink-0 rounded"
              style={{ backgroundColor: segments[hoveredIndex].color }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {segments[hoveredIndex].name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                {segments[hoveredIndex].cents}¢
              </p>
              <p className="text-[11px] text-slate-500">
                {formatCurrency(segments[hoveredIndex].budget)}
              </p>
            </div>
          </div>
        )}

        {/* Default state — show top departments as a compact legend */}
        {hoveredIndex === null && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {slices.slice(0, 6).map((s) => (
              <Link
                key={s.name}
                href={cityHref(`/departments/${encodeURIComponent(s.name)}`)}
                className="flex items-center gap-1.5 text-[12px] text-slate-600 hover:text-slate-900 transition-colors"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                  aria-hidden="true"
                />
                <span className="truncate">{s.name}</span>
                <span className="font-semibold text-slate-800">{s.cents}¢</span>
              </Link>
            ))}
            {slices.length > 6 && (
              <span className="text-[12px] text-slate-500">
                +{slices.length - 6} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Screen reader accessible table */}
      <table className="sr-only" aria-label="Dollar breakdown by department">
        <thead>
          <tr>
            <th>Department</th>
            <th>Cents per dollar</th>
            <th>Budget amount</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((s) => (
            <tr key={s.name}>
              <td>{s.name}</td>
              <td>{s.cents}¢</td>
              <td>{formatCurrency(s.budget)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

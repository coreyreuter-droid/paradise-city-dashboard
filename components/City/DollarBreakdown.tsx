"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";

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

const SEGMENT_COLORS = [
  "#1e40af", "#b91c1c", "#15803d", "#7e22ce", "#b45309",
  "#0e7490", "#be185d", "#3730a3", "#0f766e", "#c2410c",
  "#4338ca", "#065f46", "#92400e", "#64748b",
];

export default function DollarBreakdown({ departments, totalBudget, fiscalYear }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tappedIndex, setTappedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const slices = useMemo(() => {
    if (totalBudget <= 0 || departments.length === 0) return [];

    const sorted = [...departments].sort((a, b) => b.budget - a.budget);
    const maxSlices = 13;
    const top = sorted.slice(0, maxSlices);
    const otherBudget = sorted.slice(maxSlices).reduce((s, d) => s + d.budget, 0);
    const otherCount = sorted.length - maxSlices;

    const items = top.map((d, i) => ({
      name: d.department_name,
      budget: d.budget,
      share: d.budget / totalBudget,
      cents: Math.round((d.budget / totalBudget) * 100),
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      isOther: false,
    }));

    if (otherBudget > 0 && otherCount > 0) {
      items.push({
        name: `Other (${otherCount})`,
        budget: otherBudget,
        share: otherBudget / totalBudget,
        cents: Math.round((otherBudget / totalBudget) * 100),
        color: SEGMENT_COLORS[13],
        isOther: true,
      });
    }

    return items;
  }, [departments, totalBudget]);

  useEffect(() => {
    if (tappedIndex === null) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTappedIndex(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tappedIndex]);

  if (slices.length === 0) return null;

  const activeIndex = hoveredIndex ?? tappedIndex;

  return (
    <section aria-label="Where your dollar goes" className="space-y-4" ref={containerRef}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
          Where your dollar goes
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">
          For every $1.00 in the {fiscalYear ? `FY ${fiscalYear} ` : ""}budget, here is how it is allocated.
        </p>
      </div>

      <div className="w-full select-none">
        {/* Bill with overlay */}
        <div
          className="relative w-full overflow-hidden rounded-lg"
          style={{ aspectRatio: "2.34 / 1" }}
        >
          <Image
            src="/images/dollar-bill.png"
            alt=""
            aria-hidden="true"
            fill
            className="object-cover"
            draggable={false}
            sizes="(max-width: 768px) 100vw, 800px"
            priority
          />

          <div className="absolute inset-0 flex">
            {slices.map((seg, i) => {
              const isActive = activeIndex === i;
              const isDimmed = activeIndex !== null && activeIndex !== i;

              return (
                <Link
                  key={seg.name}
                  href={
                    seg.isOther
                      ? cityHref("/departments")
                      : cityHref(`/departments/${encodeURIComponent(seg.name)}`)
                  }
                  className="relative block h-full transition-all duration-200 ease-out"
                  style={{
                    width: `${Math.max(seg.share * 100, 0.6)}%`,
                    backgroundColor: seg.color + "5a",
                    opacity: isDimmed ? 0.45 : 1,
                    transform: isActive ? "translateY(-8px)" : "translateY(0)",
                    borderLeft: i > 0 ? "2px solid rgba(255,255,255,0.92)" : "none",
                    zIndex: isActive ? 10 : 1,
                    boxShadow: isActive ? "0 6px 16px rgba(0,0,0,0.2)" : "none",
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={(e) => {
                    if (tappedIndex !== i && "ontouchstart" in window) {
                      e.preventDefault();
                      setTappedIndex(i);
                    }
                  }}
                  aria-label={`${seg.name}: ${seg.cents} cents of every dollar, ${formatCurrency(seg.budget)}`}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-all duration-200"
                    style={{ height: isActive ? 6 : 4, backgroundColor: seg.color }}
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Angled labels below each segment */}
        <div className="relative flex" style={{ height: 120 }} aria-hidden="true">
          {slices.map((seg, i) => {
            const isActive = activeIndex === i;
            const isDimmed = activeIndex !== null && activeIndex !== i;

            return (
              <div
                key={seg.name}
                className="relative h-full"
                style={{
                  width: `${Math.max(seg.share * 100, 0.6)}%`,
                  opacity: isDimmed ? 0.35 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                {/* Tick mark */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: 1.5,
                    height: 8,
                    backgroundColor: seg.color,
                    opacity: 0.6,
                  }}
                />
                {/* Rotated label */}
                <div
                  className="absolute left-1/2"
                  style={{
                    top: 10,
                    transformOrigin: "top left",
                    transform: "rotate(45deg)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? seg.color : "#475569",
                      transition: "color 0.2s, font-weight 0.15s",
                    }}
                  >
                    {seg.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: seg.color,
                      marginLeft: 4,
                    }}
                  >
                    {seg.cents}¢
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active tooltip */}
      {activeIndex !== null && slices[activeIndex] && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div
            className="h-5 w-5 flex-shrink-0 rounded"
            style={{ backgroundColor: slices[activeIndex].color }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {slices[activeIndex].name}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-lg font-bold text-slate-900">
              {slices[activeIndex].cents}¢
            </span>
            <span className="ml-2 text-sm text-slate-500">
              {formatCurrency(slices[activeIndex].budget)}
            </span>
          </div>
        </div>
      )}

      {/* Screen reader table */}
      <table className="sr-only" aria-label="Dollar breakdown by department">
        <thead>
          <tr><th>Department</th><th>Cents per dollar</th><th>Budget</th></tr>
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

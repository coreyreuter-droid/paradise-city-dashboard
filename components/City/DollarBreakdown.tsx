"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
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
  "#1d4ed8", // blue
  "#dc2626", // red
  "#15803d", // green
  "#7c3aed", // purple
  "#b45309", // amber
  "#0891b2", // cyan
  "#be123c", // rose
  "#4338ca", // indigo
  "#0f766e", // teal
  "#64748b", // slate (other)
];

export default function DollarBreakdown({ departments, totalBudget, fiscalYear }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tappedIndex, setTappedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const slices = useMemo(() => {
    if (totalBudget <= 0 || departments.length === 0) return [];

    const sorted = [...departments].sort((a, b) => b.budget - a.budget);
    const top = sorted.slice(0, 9);
    const otherBudget = sorted.slice(9).reduce((s, d) => s + d.budget, 0);
    const otherCount = sorted.length - 9;

    const items = top.map((d, i) => ({
      name: d.department_name,
      budget: d.budget,
      share: d.budget / totalBudget,
      cents: Math.round((d.budget / totalBudget) * 100),
      color: SEGMENT_COLORS[i],
      isOther: false,
    }));

    if (otherBudget > 0 && otherCount > 0) {
      items.push({
        name: `Other (${otherCount} depts)`,
        budget: otherBudget,
        share: otherBudget / totalBudget,
        cents: Math.round((otherBudget / totalBudget) * 100),
        color: SEGMENT_COLORS[9],
        isOther: true,
      });
    }

    return items;
  }, [departments, totalBudget]);

  // Close tooltip on outside click (mobile)
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
    <section aria-label="Where your dollar goes" className="space-y-3" ref={containerRef}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
          Where your dollar goes
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">
          For every $1.00 in the {fiscalYear ? `FY ${fiscalYear} ` : ""}budget, here is how it is allocated.
        </p>
      </div>

      {/* Dollar bill container */}
      <div className="relative select-none" style={{ aspectRatio: "2.6 / 1", maxWidth: 620 }}>
        {/* Bill SVG background */}
        <DollarBillSvg />

        {/* Colored overlay segments */}
        <div className="absolute inset-0 flex" style={{ borderRadius: 6, overflow: "hidden" }}>
          {slices.map((seg, i) => {
            const isActive = activeIndex === i;
            const isDimmed = activeIndex !== null && activeIndex !== i;

            return (
              <Link
                key={seg.name}
                href={seg.isOther ? cityHref("/departments") : cityHref(`/departments/${encodeURIComponent(seg.name)}`)}
                className="relative block h-full transition-all duration-200 ease-out"
                style={{
                  width: `${Math.max(seg.share * 100, 0.8)}%`,
                  backgroundColor: seg.color + "55",
                  opacity: isDimmed ? 0.5 : 1,
                  transform: isActive ? "translateY(-6px)" : "translateY(0)",
                  borderLeft: i > 0 ? "2px solid rgba(255,255,255,0.85)" : "none",
                  zIndex: isActive ? 10 : 1,
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={(e) => {
                  // On mobile, first tap shows tooltip, second tap navigates
                  if (tappedIndex !== i && "ontouchstart" in window) {
                    e.preventDefault();
                    setTappedIndex(i);
                  }
                }}
                aria-label={`${seg.name}: ${seg.cents} cents of every dollar, ${formatCurrency(seg.budget)}`}
              >
                {/* Cents label for wide segments */}
                {seg.share > 0.08 && (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-white font-bold pointer-events-none"
                    style={{
                      fontSize: seg.share > 0.15 ? 16 : 13,
                      textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                      letterSpacing: "0.02em",
                    }}
                    aria-hidden="true"
                  >
                    {seg.cents}¢
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Active tooltip */}
      {activeIndex !== null && slices[activeIndex] && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm" style={{ maxWidth: 620 }}>
          <div
            className="h-4 w-4 flex-shrink-0 rounded"
            style={{ backgroundColor: slices[activeIndex].color }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{slices[activeIndex].name}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-sm font-bold text-slate-900">{slices[activeIndex].cents}¢</span>
            <span className="ml-2 text-[12px] text-slate-500">{formatCurrency(slices[activeIndex].budget)}</span>
          </div>
        </div>
      )}

      {/* Legend — visible when nothing is hovered */}
      {activeIndex === null && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5" style={{ maxWidth: 620 }}>
          {slices.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-[12px] text-slate-700">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              <span className="truncate max-w-[140px]">{s.name}</span>
              <span className="font-semibold">{s.cents}¢</span>
            </span>
          ))}
        </div>
      )}

      {/* Screen reader table */}
      <table className="sr-only" aria-label="Dollar breakdown by department">
        <thead><tr><th>Department</th><th>Cents per dollar</th><th>Budget</th></tr></thead>
        <tbody>
          {slices.map((s) => (
            <tr key={s.name}><td>{s.name}</td><td>{s.cents}¢</td><td>{formatCurrency(s.budget)}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* ===========================================================================
   SVG Dollar Bill Illustration
   Stylized, clearly illustrated, educational use
=========================================================================== */

function DollarBillSvg() {
  return (
    <svg
      viewBox="0 0 620 238"
      className="absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ borderRadius: 6 }}
    >
      {/* Background */}
      <rect width="620" height="238" rx="6" fill="#3d6b3d" />
      <rect x="4" y="4" width="612" height="230" rx="4" fill="#4a7c4a" />

      {/* Inner border */}
      <rect x="14" y="14" width="592" height="210" rx="3" fill="none" stroke="#2d5a2d" strokeWidth="1.5" />
      <rect x="18" y="18" width="584" height="202" rx="2" fill="none" stroke="#5a9a5a" strokeWidth="0.75" strokeDasharray="4 2" />

      {/* Corner 1s */}
      <g fill="#2d5a2d">
        {/* Top-left */}
        <rect x="22" y="22" width="44" height="50" rx="4" fill="#3a6a3a" stroke="#2d5a2d" strokeWidth="0.75" />
        <text x="44" y="56" textAnchor="middle" fontSize="30" fontWeight="bold" fontFamily="serif" fill="#c5d8c5">1</text>
        {/* Top-right */}
        <rect x="554" y="22" width="44" height="50" rx="4" fill="#3a6a3a" stroke="#2d5a2d" strokeWidth="0.75" />
        <text x="576" y="56" textAnchor="middle" fontSize="30" fontWeight="bold" fontFamily="serif" fill="#c5d8c5">1</text>
        {/* Bottom-left */}
        <rect x="22" y="166" width="44" height="50" rx="4" fill="#3a6a3a" stroke="#2d5a2d" strokeWidth="0.75" />
        <text x="44" y="200" textAnchor="middle" fontSize="30" fontWeight="bold" fontFamily="serif" fill="#c5d8c5">1</text>
        {/* Bottom-right */}
        <rect x="554" y="166" width="44" height="50" rx="4" fill="#3a6a3a" stroke="#2d5a2d" strokeWidth="0.75" />
        <text x="576" y="200" textAnchor="middle" fontSize="30" fontWeight="bold" fontFamily="serif" fill="#c5d8c5">1</text>
      </g>

      {/* Header text */}
      <text x="310" y="38" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="serif" fill="#c5d8c5" letterSpacing="3">
        FEDERAL RESERVE NOTE
      </text>
      <text x="310" y="58" textAnchor="middle" fontSize="12" fontWeight="bold" fontFamily="serif" fill="#d4e4d4" letterSpacing="1.5">
        THE UNITED STATES OF AMERICA
      </text>

      {/* Legal text */}
      <text x="310" y="72" textAnchor="middle" fontSize="5" fontFamily="serif" fill="#8ab88a" letterSpacing="0.5">
        THIS NOTE IS LEGAL TENDER FOR ALL DEBTS, PUBLIC AND PRIVATE
      </text>

      {/* Central portrait area */}
      <ellipse cx="310" cy="132" rx="52" ry="58" fill="#3a6a3a" stroke="#2d5a2d" strokeWidth="1" />
      <ellipse cx="310" cy="132" rx="48" ry="54" fill="#436e43" stroke="#5a9a5a" strokeWidth="0.5" />

      {/* Washington silhouette (simplified) */}
      <g transform="translate(310,125)" fill="#3a6a3a">
        {/* Head shape */}
        <ellipse cx="0" cy="-12" rx="18" ry="22" fill="#3d6b3d" />
        {/* Shoulders */}
        <path d="M-22,16 Q-22,6 -14,-2 Q-6,-6 0,-4 Q6,-6 14,-2 Q22,6 22,16 Q22,30 16,38 L-16,38 Q-22,30 -22,16Z" fill="#3d6b3d" />
        {/* Hair silhouette */}
        <path d="M-14,-28 Q-18,-20 -18,-10 Q-20,-16 -16,-28 Q-10,-34 0,-36 Q10,-34 16,-28 Q20,-16 18,-10 Q18,-20 14,-28 Q8,-32 0,-34 Q-8,-32 -14,-28Z" fill="#365e36" />
      </g>

      {/* Treasury seal (left) */}
      <circle cx="140" cy="130" r="22" fill="none" stroke="#2d5a2d" strokeWidth="1.5" />
      <circle cx="140" cy="130" r="18" fill="none" stroke="#2d5a2d" strokeWidth="0.75" />
      <circle cx="140" cy="130" r="8" fill="none" stroke="#2d5a2d" strokeWidth="0.75" />
      <text x="140" y="133" textAnchor="middle" fontSize="7" fontWeight="bold" fontFamily="serif" fill="#2d5a2d">T</text>

      {/* Federal seal (right) */}
      <circle cx="480" cy="130" r="22" fill="none" stroke="#4a9a5a" strokeWidth="1.5" />
      <circle cx="480" cy="130" r="18" fill="none" stroke="#4a9a5a" strokeWidth="0.75" />
      <circle cx="480" cy="130" r="8" fill="#4a9a5a" opacity="0.3" />
      <text x="480" y="133" textAnchor="middle" fontSize="7" fontWeight="bold" fontFamily="serif" fill="#4a9a5a">F</text>

      {/* Serial numbers */}
      <text x="160" y="100" fontSize="7" fontFamily="monospace" fill="#4a9a5a" letterSpacing="1">L 88888888 A</text>
      <text x="410" y="100" fontSize="7" fontFamily="monospace" fill="#4a9a5a" letterSpacing="1">L 88888888 A</text>

      {/* District numbers */}
      <text x="100" y="100" fontSize="8" fontFamily="serif" fill="#c5d8c5">12</text>
      <text x="520" y="100" fontSize="8" fontFamily="serif" fill="#c5d8c5">12</text>
      <text x="100" y="170" fontSize="8" fontFamily="serif" fill="#c5d8c5">12</text>
      <text x="520" y="170" fontSize="8" fontFamily="serif" fill="#c5d8c5">12</text>

      {/* "WASHINGTON, D.C." text */}
      <text x="460" y="112" fontSize="4.5" fontFamily="serif" fill="#c5d8c5" letterSpacing="0.5">WASHINGTON, D.C.</text>

      {/* Series text */}
      <text x="280" y="186" fontSize="5" fontFamily="serif" fill="#8ab88a">SERIES</text>
      <text x="284" y="193" fontSize="6" fontWeight="bold" fontFamily="serif" fill="#8ab88a">2024</text>

      {/* Laurel branches */}
      <g stroke="#5a9a5a" strokeWidth="0.75" fill="none" opacity="0.6">
        {/* Left branch */}
        <path d="M240,190 Q250,178 260,185 Q255,175 265,180 Q260,172 270,175 Q268,168 278,172" />
        <path d="M240,190 Q248,195 255,188 Q253,196 260,192 Q260,198 268,195 Q270,200 276,196" />
        {/* Right branch */}
        <path d="M380,190 Q370,178 360,185 Q365,175 355,180 Q360,172 350,175 Q352,168 342,172" />
        <path d="M380,190 Q372,195 365,188 Q367,196 360,192 Q360,198 352,195 Q350,200 344,196" />
      </g>

      {/* Bottom banner */}
      <rect x="200" y="202" width="220" height="22" rx="2" fill="#3a6a3a" stroke="#2d5a2d" strokeWidth="0.75" />
      <text x="310" y="218" textAnchor="middle" fontSize="12" fontWeight="bold" fontFamily="serif" fill="#c5d8c5" letterSpacing="4">
        ONE DOLLAR
      </text>

      {/* Signature line */}
      <line x1="370" y1="192" x2="430" y2="192" stroke="#5a9a5a" strokeWidth="0.5" />
      <path d="M375,190 Q385,185 395,189 Q405,186 415,190 Q420,188 425,190" fill="none" stroke="#5a9a5a" strokeWidth="0.6" />
    </svg>
  );
}

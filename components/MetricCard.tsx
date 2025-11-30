// components/MetricCard.tsx
"use client";

import { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: ReactNode;
  accentColor?: string;
};

export default function MetricCard({
  label,
  value,
  sublabel,
  icon,
  accentColor,
}: MetricCardProps) {
  const accent = accentColor || "#2563eb";

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      style={{
        backgroundImage: `radial-gradient(circle at top left, ${accent}15, transparent 55%)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          <p className="text-xl font-semibold text-slate-900 sm:text-2xl">
            {typeof value === "number" ? value.toLocaleString("en-US") : value}
          </p>
          {sublabel && (
            <p className="text-xs text-slate-500">{sublabel}</p>
          )}
        </div>

        {icon && (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border text-slate-700 shadow-sm"
            style={{
              borderColor: `${accent}55`,
              background: `linear-gradient(135deg, ${accent}18, #ffffff)`,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div
        className="mt-3 h-[3px] w-12 rounded-full transition-all group-hover:w-16"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)` }}
      />
    </div>
  );
}

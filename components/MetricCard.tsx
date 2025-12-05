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
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-4"
      style={{
        backgroundImage: `radial-gradient(circle at top left, ${accent}15, transparent 55%)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs">
            {label}
          </p>
          <p className="text-lg font-semibold text-slate-900 sm:text-xl lg:text-2xl">
            {typeof value === "number"
              ? value.toLocaleString("en-US")
              : value}
          </p>
          {sublabel && (
            <p className="max-w-xs text-xs leading-snug text-slate-500 sm:text-xs">
              {sublabel}
            </p>
          )}
        </div>

        {icon && (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border text-slate-700 shadow-sm sm:h-9 sm:w-9"
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
        className="mt-3 h-[2px] w-10 rounded-full transition-all group-hover:w-16 sm:h-[3px] sm:w-12"
        style={{
          background: `linear-gradient(90deg, ${accent}, ${accent}88)`,
        }}
      />
    </div>
  );
}

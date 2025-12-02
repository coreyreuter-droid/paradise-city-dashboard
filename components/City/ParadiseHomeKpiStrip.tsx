// components/City/ParadiseHomeKpiStrip.tsx
"use client";

import { formatCurrency, formatPercent } from "@/lib/format";
import MetricCard from "@/components/MetricCard";

type Props = {
  totalBudget: number;
  totalActuals: number;
  variance: number;
  execPct: number;
  deptCount: number;
  txCount: number;
  topDepartment: string | null;
  accentColor?: string;
  yearLabel?: number | string;
};

export default function KpiStrip({
  totalBudget,
  totalActuals,
  variance,
  execPct,
  deptCount,
  txCount,
  topDepartment,
  accentColor,
  yearLabel,
}: Props) {
  const accent = accentColor || "#2563eb";

  const varianceLabel = variance >= 0 ? "Under budget" : "Over budget";
  const varianceDisplay = `${variance >= 0 ? "" : "-"}${formatCurrency(
    Math.abs(variance)
  )}`;

  const yearText =
    yearLabel !== undefined && yearLabel !== null
      ? String(yearLabel)
      : "—";

  return (
    <section className="space-y-3">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Citywide Overview
          </p>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            Budget &amp; spending snapshot
          </h1>
        </div>
        <div className="text-right text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: accent }}
            />
            Live data from city finance system
          </span>
        </div>
      </div>

      {/* 
        Grid behavior:
        - 1 col on very small screens
        - 2 cols on small screens
        - 3 cols on laptops (lg)
        - 4 cols on wider desktops (xl)
        - 6 cols only on very wide (2xl) screens
      */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        <MetricCard
          label="Total adopted budget"
          value={formatCurrency(totalBudget)}
          sublabel={`All departments • fiscal year ${yearText}`}
          accentColor={accent}
        />

        <MetricCard
          label="Actual spending to date"
          value={formatCurrency(totalActuals)}
          sublabel={`${formatPercent(execPct)} of budget spent`}
          accentColor={accent}
        />

        <MetricCard
          label={varianceLabel}
          value={varianceDisplay}
          sublabel={
            variance >= 0
              ? "Available budget remaining"
              : "Spending beyond adopted budget"
          }
          accentColor={variance >= 0 ? "#16a34a" : "#b91c1c"}
        />

        <MetricCard
          label="Departments tracked"
          value={deptCount.toLocaleString()}
          sublabel="Active departments with budget data"
          accentColor={accent}
        />

        <MetricCard
          label="Transactions"
          value={txCount.toLocaleString()}
          sublabel={`Posted expenses in fiscal year ${yearText}`}
          accentColor={accent}
        />

        <MetricCard
          label="Top spending department"
          value={topDepartment || "—"}
          sublabel="By total actual expenditures"
          accentColor={accent}
        />
      </div>
    </section>
  );
}

// components/City/ParadiseHomeDepartmentsGrid.tsx
"use client";

import Link from "next/link";
import type { DepartmentSummary } from "@/components/Budget/BudgetClient";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";

type Props = {
  year?: number;
  departments: DepartmentSummary[];
};

export default function DepartmentsGrid({ year, departments }: Props) {
  const top = [...departments]
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 6);

  return (
    <section aria-label="Department snapshot" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Departments overview{year ? ` – ${year}` : ""}
        </h3>
      </div>

      {top.length === 0 ? (
        <p className="text-xs text-slate-500">
          No department budget or actuals data available for this
          year.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {top.map((d) => {
            const variance = d.actuals - d.budget;
            const varianceLabel =
              variance === 0
                ? "On budget"
                : variance > 0
                ? "Over budget"
                : "Under budget";
            const varianceColor =
              variance > 0
                ? "text-emerald-700"
                : variance < 0
                ? "text-red-700"
                : "text-slate-700";

            const deptName = d.department_name || "Unspecified";
            const basePath = `/departments/${encodeURIComponent(
              deptName
            )}`;
            const href = cityHref(
              `${basePath}${year ? `?year=${year}` : ""}`
            );

            return (
              <Link
                key={deptName}
                href={href}
                className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700 hover:border-sky-400 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
              >
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Department
                </div>
                <div className="mb-2 text-sm font-semibold text-slate-900">
                  {deptName}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Budget</span>
                  <span className="font-mono">
                    {formatCurrency(d.budget)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Actuals</span>
                  <span className="font-mono">
                    {formatCurrency(d.actuals)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">% spent</span>
                  <span className="font-mono">
                    {formatPercent(d.percentSpent, 1)}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Status</span>
                  <span className={`font-semibold ${varianceColor}`}>
                    {varianceLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

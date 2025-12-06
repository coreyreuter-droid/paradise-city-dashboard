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
  const sorted = [...departments].sort((a, b) => b.budget - a.budget);
  const top = sorted.slice(0, 6);
  const totalCount = departments.length;

  return (
    <section aria-label="Department snapshot" className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Departments overview{year ? ` – ${year}` : ""}
          </h3>
          <p className="text-[11px] text-slate-500">
            Top {top.length} of {totalCount || 0} departments by adopted
            budget.
          </p>
        </div>
        {totalCount > 0 && (
          <Link
            href={cityHref(`/departments${year ? `?year=${year}` : ""}`)}
            className="text-[11px] font-semibold text-slate-700 underline-offset-2 hover:underline"
          >
            View all departments
          </Link>
        )}
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

            const varianceTone =
              variance < 0
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : variance > 0
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-slate-50 text-slate-700 border-slate-200";

            const deptName = d.department_name || "Unspecified";
            const basePath = `/departments/${encodeURIComponent(deptName)}`;
            const href = cityHref(
              `${basePath}${year ? `?year=${year}` : ""}`
            );

            return (
              <Link
                key={deptName}
                href={href}
                className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700 shadow-sm transition hover:border-sky-400 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Department
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-900">
                      {deptName}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${varianceTone}`}
                  >
                    {varianceLabel}
                  </span>
                </div>

                <div className="mt-1 space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Budget</span>
                    <span className="font-mono">
                      {formatCurrency(d.budget)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Actuals</span>
                    <span className="font-mono">
                      {formatCurrency(d.actuals)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">% spent</span>
                    <span className="font-mono">
                      {formatPercent(d.percentSpent, 1)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

// components/City/ParadiseHomeDepartmentsGrid.tsx
"use client";

import Link from "next/link";
import type { DepartmentSummary } from "@/components/Budget/BudgetClient";
import { formatCurrency, formatPercent } from "@/lib/format";

type Props = {
  year?: number;
  departments: DepartmentSummary[];
};

export default function DepartmentsGrid({
  year,
  departments,
}: Props) {
  const top = departments.slice(0, 12);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Department Snapshots{year ? ` – ${year}` : ""}
        </h2>
        <div className="text-[11px] text-slate-500">
          Click a department to view its detailed page.
        </div>
      </div>

      {top.length === 0 ? (
        <p className="text-xs text-slate-500">
          No department budget or actuals data available for this
          year.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((d) => {
            const variance = d.actuals - d.budget;
            const pct = d.percentSpent;
            return (
              <Link
                key={d.department_name || "Unspecified"}
                href={`/paradise/departments/${encodeURIComponent(
                  d.department_name || "Unspecified"
                )}${year ? `?year=${year}` : ""}`}
                className="flex flex-col rounded-lg border border-slate-200 bg-white px-3 py-3 text-left shadow-sm hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="mb-1 text-xs font-semibold text-slate-900 line-clamp-2">
                  {d.department_name || "Unspecified"}
                </div>
                <div className="text-[11px] text-slate-500">
                  Budget:{" "}
                  <span className="font-mono">
                    {formatCurrency(d.budget)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Actuals:{" "}
                  <span className="font-mono">
                    {formatCurrency(d.actuals)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    % Spent:{" "}
                    <span className="font-mono">
                      {formatPercent(pct, 1)}
                    </span>
                  </span>
                  <span
                    className={[
                      "font-mono",
                      variance > 0
                        ? "text-emerald-700"
                        : variance < 0
                        ? "text-red-700"
                        : "text-slate-700",
                    ].join(" ")}
                  >
                    {formatCurrency(variance)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

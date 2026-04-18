"use client";

import Link from "next/link";
import type { DepartmentSummary } from "@/lib/types";
import DrillBarList from "@/components/ui/DrillBarList";
import type { DrillBarItem } from "@/components/ui/DrillBarList";
import { cityHref } from "@/lib/cityRouting";

type Props = {
  year?: number;
  departments: DepartmentSummary[];
};

export default function DepartmentsGrid({ year, departments }: Props) {
  const sorted = [...departments].sort((a, b) => b.budget - a.budget);
  const totalCount = departments.length;

  const items: DrillBarItem[] = sorted.map((d) => {
    const deptName = d.department_name || "Unspecified";
    const basePath = `/departments/${encodeURIComponent(deptName)}`;
    const href = cityHref(`${basePath}${year ? `?year=${year}` : ""}`);

    return {
      name: deptName,
      budget: d.budget,
      actual: d.actuals,
      href,
    };
  });

  const hasActuals = departments.some((d) => d.actuals > 0);

  return (
    <section aria-label="Department snapshot" className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Departments{year ? ` – FY ${year}` : ""}
          </h3>
          <p className="text-sm text-slate-600">
            {totalCount} departments by adopted budget.
            Click any row to explore.
          </p>
        </div>
        {totalCount > 0 && (
          <Link
            href={cityHref(`/departments${year ? `?year=${year}` : ""}`)}
            className="text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 transition-colors"
          >
            View all departments
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-600">
          No department budget or actuals data available for this year.
        </p>
      ) : (
        <DrillBarList
          items={items}
          showActuals={hasActuals}
          maxVisible={8}
          ariaLabel="Departments by budget"
          showIcons={true}
        />
      )}
    </section>
  );
}

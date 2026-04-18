// components/City/HomeRevenueSummary.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { RevenueRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";
import DrillBarList from "@/components/ui/DrillBarList";
import type { DrillBarItem } from "@/components/ui/DrillBarList";
import FinanceTooltip from "@/components/ui/FinanceTooltip";

type Props = {
  revenues: RevenueRow[];
  years: number[];
  accentColor?: string;
};

export default function HomeRevenueSummary({
  revenues,
  years,
  accentColor: _accentColor,
}: Props) {
  const searchParams = useSearchParams();

  const selectedYear: number | null = useMemo(() => {
    if (!years.length) return null;
    const raw = searchParams.get("year");
    if (!raw) return years[0];
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return years[0];
    return years.includes(parsed) ? parsed : years[0];
  }, [searchParams, years]);

  const revenuesForYear = useMemo(() => {
    if (selectedYear == null) return revenues;
    return revenues.filter((r) => r.fiscal_year === selectedYear);
  }, [revenues, selectedYear]);

  // Aggregate by category
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of revenuesForYear) {
      const cat = r.category?.trim() || "Other";
      const amt = Number(r.amount || 0);
      if (amt > 0) {
        map.set(cat, (map.get(cat) || 0) + amt);
      }
    }
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [revenuesForYear]);

  const totalRevenue = categoryTotals.reduce((s, c) => s + c.total, 0);

  const drillItems: DrillBarItem[] = categoryTotals.map((c) => ({
    name: c.name,
    budget: c.total,
    actual: 0,
    href: cityHref(`/revenues/${encodeURIComponent(c.name)}${selectedYear ? `?year=${selectedYear}` : ""}`),
  }));

  if (categoryTotals.length === 0) {
    return (
      <section aria-label="Revenue summary" className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">Revenue sources</h2>
        <p className="text-sm text-slate-600">
          No revenue data available for {selectedYear ? `FY ${selectedYear}` : "the selected year"}.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Revenue summary" className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
            <FinanceTooltip term="revenue">Revenue sources</FinanceTooltip>
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {categoryTotals.length} revenue categories totaling{" "}
            <span className="font-semibold text-slate-800">{formatCurrency(totalRevenue)}</span>
            {selectedYear ? ` for FY ${selectedYear}` : ""}.
          </p>
        </div>
        <Link
          href={cityHref(`/revenues${selectedYear ? `?year=${selectedYear}` : ""}`)}
          className="text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 transition-colors"
        >
          View all revenue
        </Link>
      </div>

      <DrillBarList
        items={drillItems}
        showActuals={false}
        maxVisible={8}
        ariaLabel="Revenue sources ranked by amount"
      />
    </section>
  );
}

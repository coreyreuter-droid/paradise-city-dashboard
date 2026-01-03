// components/City/HomeRevenueSummary.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { RevenueRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

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

  const hasRows = revenuesForYear.length > 0;

  const totalRevenue = useMemo(
    () =>
      revenuesForYear.reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
      ),
    [revenuesForYear]
  );

  const hasRevenueData = hasRows; // if there are rows, show the cards even if total is 0
  const yearLabel =
    selectedYear != null ? String(selectedYear) : "the selected year";

  return (
    <section
      aria-label="Revenue snapshot"
      className="flex h-full flex-col text-left"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Revenue snapshot
          </h2>
          <p className="text-sm text-slate-600">
            High-level view of total recorded revenues for{" "}
            {yearLabel}.
          </p>
        </div>

      </div>

      <div className="mt-4 flex-1">
        {hasRevenueData ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Total revenues */}
            <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Total revenues
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {formatCurrency(totalRevenue)}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Sum of all revenue records loaded for{" "}
                {yearLabel}.
              </p>
            </div>

            {/* Approx monthly */}
            <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Approx. monthly revenues
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {formatCurrency(totalRevenue / 12)}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Simple total divided by 12 months to give a
                ballpark monthly figure.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Revenue data for {yearLabel} has not been loaded into the
            portal yet. Once revenue files are uploaded through the
            admin area, this section will summarize total revenues for
            the selected fiscal year.
          </p>
        )}
      </div>
    </section>
  );
}

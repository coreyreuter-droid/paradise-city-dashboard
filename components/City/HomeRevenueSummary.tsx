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
  accentColor,
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

  const totalRevenue = useMemo(
    () =>
      revenuesForYear.reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
      ),
    [revenuesForYear]
  );

  const hasRevenueData = totalRevenue > 0;
  const yearLabel =
    selectedYear != null ? String(selectedYear) : "the selected year";

  const labelStyle = accentColor
    ? { color: accentColor }
    : undefined;
  const accentBadgeStyle = accentColor
    ? { backgroundColor: accentColor }
    : undefined;

  return (
    <section
      aria-label="Revenue snapshot"
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm sm:px-5 sm:py-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Revenue snapshot
          </h2>
          <p className="text-xs text-slate-500">
            High-level view of total revenues recorded for{" "}
            {yearLabel}.
          </p>
        </div>
        <span
          className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-50"
          style={accentBadgeStyle}
        >
          Revenues
        </span>
      </div>

      <div className="mt-4 flex-1">
        {hasRevenueData ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Total revenues */}
            <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                style={labelStyle}
              >
                Total revenues
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {formatCurrency(totalRevenue)}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Sum of all revenue records loaded for{" "}
                {yearLabel}.
              </p>
            </div>

            {/* Approx monthly */}
            <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Approx. monthly revenues
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {formatCurrency(totalRevenue / 12)}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Simple total divided by 12 months to give a
                ballpark monthly figure.
              </p>
            </div>

            {/* Context blurb */}
            <div className="sm:col-span-2">
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Context
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Use this alongside the budget and spending KPIs
                  to understand how incoming revenues relate to
                  overall financial activity for {yearLabel}.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Revenue data for {yearLabel} has not been uploaded
            yet. Once revenue files are loaded through the admin
            portal, this section will display total revenues for
            the selected fiscal year.
          </p>
        )}
      </div>
    </section>
  );
}

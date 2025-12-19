// components/City/RevenuesDashboardClient.tsx
"use client";

import { useMemo, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { RevenueRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import FiscalYearSelect from "../FiscalYearSelect";
import DataTable, { DataTableColumn } from "../DataTable";

type Props = {
  years: number[];
  selectedYear: number | null;
  revenues: RevenueRow[];
  sourceQuery: string | null;
  yearTotals: { year: number; total: number }[];
  fiscalYearNote?: string;
};

type RevenueSourceRow = {
  source: string;
  total: number;
  count: number;
  avg: number;
};

type DistributionSlice = { name: string; value: number };

const PIE_COLORS = [
  "#0f766e",
  "#0369a1",
  "#4f46e5",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#15803d",
];

const REVENUE_LINE_COLOR = "#0f766e";

const CURRENCY_COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

function formatCurrencyCompactTick(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${CURRENCY_COMPACT.format(abs)}`;
}

function buildSearchUrl(
  pathname: string,
  currentParams: URLSearchParams,
  updates: { year?: string | null; q?: string | null }
): string {
  const params = new URLSearchParams(currentParams.toString());

  if (updates.year !== undefined) {
    if (!updates.year || updates.year === "latest") {
      params.delete("year");
    } else {
      params.set("year", updates.year);
    }
  }

  if (updates.q !== undefined) {
    const trimmed = updates.q?.trim() ?? "";
    if (trimmed.length === 0) {
      params.delete("q");
    } else {
      params.set("q", trimmed);
    }
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function buildDistribution(
  base: DistributionSlice[]
): DistributionSlice[] {
  if (base.length <= 7) return base;

  const sorted = [...base].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 7);
  const otherValue = sorted.slice(7).reduce((sum, s) => sum + s.value, 0);

  if (otherValue <= 0) return top;

  return [
    ...top,
    {
      name: "Other",
      value: otherValue,
    },
  ];
}

export default function RevenuesDashboardClient({
  years,
  selectedYear,
  revenues,
  sourceQuery,
  yearTotals,
  fiscalYearNote,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [queryInput, setQueryInput] = useState<string>(
    sourceQuery ?? ""
  );

  const yearLabel =
    selectedYear ?? (years.length > 0 ? years[0] : undefined);

  const sourceRows: RevenueSourceRow[] = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    for (const r of revenues) {
      const raw =
        r.category && r.category.trim().length > 0
          ? r.category.trim()
          : "Unspecified";
      const amt = Number(r.amount || 0);
      const current = map.get(raw) ?? { total: 0, count: 0 };
      current.total += amt;
      current.count += 1;
      map.set(raw, current);
    }

    let rows: RevenueSourceRow[] = Array.from(map.entries()).map(
      ([source, v]) => ({
        source,
        total: v.total,
        count: v.count,
        avg: v.count > 0 ? v.total / v.count : 0,
      })
    );

    const q = sourceQuery?.trim().toLowerCase();
    if (q && q.length > 0) {
      rows = rows.filter((row) =>
        row.source.toLowerCase().includes(q)
      );
    }

    rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [revenues, sourceQuery]);

  const totalSources = sourceRows.length;
  const totalRevenue = sourceRows.reduce(
    (sum, r) => sum + r.total,
    0
  );
  const avgPerSource =
    totalSources > 0 ? totalRevenue / totalSources : 0;

  const topSource = sourceRows[0]?.source ?? null;

  const yoyTrendData = useMemo(() => {
    if (!yearTotals || yearTotals.length === 0) return [];
    return [...yearTotals]
      .filter((row) => Number.isFinite(row.total))
      .sort((a, b) => a.year - b.year)
      .map((row) => ({
        year: row.year,
        Revenue: row.total,
      }));
  }, [yearTotals]);

  const distributionSlices = useMemo(() => {
    const base: DistributionSlice[] = sourceRows.map((row) => ({
      name: row.source,
      value: row.total,
    }));
    return buildDistribution(base);
  }, [sourceRows]);

  const columns: DataTableColumn<RevenueSourceRow>[] = [
    {
      key: "source",
      header: "Revenue source",
      sortable: true,
      sortAccessor: (row) => row.source.toLowerCase(),
      cell: (row) => (
        <span className="text-sm text-slate-900">{row.source}</span>
      ),
    },
    {
      key: "total",
      header: "Total revenue",
      sortable: true,
      sortAccessor: (row) => row.total,
      cellClassName: "whitespace-nowrap text-right",
      cell: (row) => (
        <span className="font-mono text-sm">
          {formatCurrency(row.total)}
        </span>
      ),
    },
    {
      key: "count",
      header: "Records",
      sortable: true,
      sortAccessor: (row) => row.count,
      cellClassName: "whitespace-nowrap text-right",
      cell: (row) => (
        <span className="text-sm">
          {row.count.toLocaleString("en-US")}
        </span>
      ),
    },
    {
      key: "avg",
      header: "Avg per record",
      sortable: true,
      sortAccessor: (row) => row.avg,
      cellClassName: "whitespace-nowrap text-right",
      cell: (row) => (
        <span className="font-mono text-sm">
          {formatCurrency(row.avg)}
        </span>
      ),
    },
  ];

  const applySourceSearch = () => {
    const url = buildSearchUrl(pathname, searchParams, {
      q: queryInput,
    });
    router.push(url);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applySourceSearch();
  };

  const handleClearFilters = () => {
    setQueryInput("");
    const url = buildSearchUrl(pathname, searchParams, {
      q: null,
    });
    router.push(url);
  };

  const totalUnfilteredRevenue = useMemo(() => {
    if (yearLabel == null) return null;
    const match = yearTotals.find((y) => y.year === yearLabel);
    if (!match) return null;
    return match.total;
  }, [yearLabel, yearTotals]);

  const showingFiltered =
    sourceQuery && sourceQuery.trim().length > 0;

  return (
    <div
      id="main-content"
      className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 sm:py-8"
    >
      <SectionHeader
        eyebrow="Revenues"
        title="Revenue by source"
        description="Explore recorded revenues by source for the selected fiscal year. Data typically includes taxes, fees, grants, and other income."
        fiscalNote={fiscalYearNote}
        rightSlot={
          years.length > 0 ? (
            <FiscalYearSelect options={years} label="Fiscal year" />
          ) : null
        }
      />

      {/* Summary KPIs */}
      <CardContainer>
        <section aria-label="Revenue summary" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                Fiscal year
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {yearLabel ?? "Latest"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Revenue records grouped by source.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                Revenue sources
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {totalSources.toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Sources with at least one record this year.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                Total revenue
                {showingFiltered ? " (filtered)" : ""}
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Sum of all sources in the current view.
              </p>
              {showingFiltered && totalUnfilteredRevenue != null && (
                <p className="mt-1 text-xs text-slate-500">
                  Unfiltered total for this year:{" "}
                  <span className="font-mono">
                    {formatCurrency(totalUnfilteredRevenue)}
                  </span>
                  .
                </p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                Avg per source
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {formatCurrency(avgPerSource)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Simple average of total revenues across all visible sources.
              </p>
            </div>
          </div>

          {topSource && (
            <p className="text-sm text-slate-600">
              Top revenue source in this view:{" "}
              <span className="font-semibold text-slate-900">
                {topSource}
              </span>
              .
            </p>
          )}
        </section>
      </CardContainer>

      {/* Charts: distribution + YOY trend */}
      <CardContainer>
        <section aria-label="Revenue charts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Distribution by source */}
            <figure
              role="group"
              aria-labelledby="revenue-distribution-heading"
              aria-describedby="revenue-distribution-desc"
              className="space-y-3"
            >
              <div>
                <h2
                  id="revenue-distribution-heading"
                  className="text-sm font-semibold text-slate-800"
                >
                  Revenue distribution by source
                </h2>
                <p
                  id="revenue-distribution-desc"
                  className="text-sm text-slate-600"
                >
                  How total recorded revenues are distributed across
                  sources for {yearLabel ?? "this year"}.
                </p>
              </div>

              {distributionSlices.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No revenue data available for this fiscal year.
                </p>
              ) : (
                <>
                  <div className="h-56 w-full min-w-0 overflow-hidden sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distributionSlices}
                          dataKey="value"
                          nameKey="name"
                          outerRadius="80%"
                          paddingAngle={1}
                        >
                          {distributionSlices.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
formatter={(value: any, name?: string) => {
  const key = name ?? "";
  return [formatCurrency(Number(value ?? 0)), key];
}}

                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="mt-3 min-w-full border border-slate-200 text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left">
                            Source
                          </th>
                          <th scope="col" className="px-3 py-2 text-right">
                            Revenue
                          </th>
                          <th scope="col" className="px-3 py-2 text-right">
                            Share of total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {distributionSlices.map((slice) => {
                          const total = distributionSlices.reduce(
                            (sum, s) => sum + s.value,
                            0
                          );
                          const percent =
                            total === 0
                              ? 0
                              : (slice.value / total) * 100;

                          return (
                            <tr key={slice.name}>
                              <th
                                scope="row"
                                className="px-3 py-2 text-left font-medium text-slate-800"
                              >
                                {slice.name}
                              </th>
                              <td className="px-3 py-2 text-right text-slate-700">
                                {formatCurrency(slice.value)}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-700">
                                {percent.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </figure>

            {/* YOY revenue trend */}
            <figure
              role="group"
              aria-labelledby="revenue-yoy-heading"
              aria-describedby="revenue-yoy-desc"
              className="space-y-3"
            >
              <div>
                <h2
                  id="revenue-yoy-heading"
                  className="text-sm font-semibold text-slate-800"
                >
                  Revenues over time
                </h2>
                <p
                  id="revenue-yoy-desc"
                  className="text-sm text-slate-600"
                >
                  Year-over-year view of total recorded revenues.
                </p>
              </div>

              {yoyTrendData.length <= 1 ? (
                <p className="text-sm text-slate-600">
                  Not enough years of revenue data to show a trend.
                  Load multiple fiscal years to see year-over-year
                  changes.
                </p>
              ) : (
                <>
                  <div className="h-64 w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={yoyTrendData}
                        margin={{
                          top: 10,
                          right: 30,
                          left: 10,
                          bottom: 20,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                        />
                        <XAxis
                          dataKey="year"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tickFormatter={formatCurrencyCompactTick}
                          tickLine={false}
                          axisLine={false}
                        />

                        <Tooltip
                          labelFormatter={(label) =>
                            `Fiscal year ${label}`
                          }
                          formatter={(value: any, name) =>
                            typeof value === "number"
                              ? [formatCurrencyCompactTick(value), name]
                              : [value, name]
                          }
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          wrapperStyle={{ fontSize: 11 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Revenue"
                          dot={false}
                          strokeWidth={2}
                          stroke={REVENUE_LINE_COLOR}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full border border-slate-200 text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <tr>
                          <th
                            scope="col"
                            className="px-3 py-2 text-left"
                          >
                            Fiscal year
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-right"
                          >
                            Total revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {yoyTrendData.map((row) => (
                          <tr key={row.year}>
                            <th
                              scope="row"
                              className="px-3 py-2 text-left font-medium text-slate-800"
                            >
                              {row.year}
                            </th>
                            <td className="px-3 py-2 text-right text-slate-700">
                              {formatCurrency(row.Revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </figure>
          </div>
        </section>
      </CardContainer>

      {/* Filters + table */}
      <CardContainer>
        <section
          aria-label="Revenue filters and table"
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <form
              onSubmit={handleSearchSubmit}
              className="flex-1 space-y-1"
            >
              <label
                htmlFor="revenue-source-search"
                className="text-xs font-medium text-slate-700"
              >
                Search revenue sources
              </label>
              <input
                id="revenue-source-search"
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder='e.g. "Sales Tax", "Grants"'
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </form>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applySourceSearch}
                className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                Clear
              </button>
            </div>
          </div>

          {sourceQuery && sourceQuery.trim().length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span className="font-semibold">Active filters:</span>{" "}
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                <span>Source contains “{sourceQuery.trim()}”</span>
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing{" "}
              <span className="font-semibold">
                {sourceRows.length.toLocaleString("en-US")}
              </span>{" "}
              sources.
            </span>
          </div>

          <DataTable<RevenueSourceRow>
            data={sourceRows}
            columns={columns}
            getRowKey={(row) => row.source}
            pageSize={50}
            showPagination={false}
            initialSortKey="total"
            initialSortDirection="desc"
          />
        </section>
      </CardContainer>
    </div>
  );
}

// components/City/RevenuesDashboardClient.tsx
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  Treemap,
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
import { buildRevenuesNarrative } from "@/lib/narrativeHelpers";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import NarrativeSummary from "../NarrativeSummary";
import FiscalYearSelect from "../FiscalYearSelect";
import DataTable, { DataTableColumn } from "../DataTable";
import { CITY_CONFIG } from "@/lib/cityConfig";

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

// Colors for treemap - gradient from dark to light for visual hierarchy
const TREEMAP_COLORS = [
  "#0f172a", // slate-900
  "#1e293b", // slate-800
  "#334155", // slate-700
  "#475569", // slate-600
  "#64748b", // slate-500
  "#0f766e", // teal-700
  "#15803d", // green-700
  "#b45309", // amber-700
];

const REVENUE_LINE_COLOR = "#0f172a";

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

function computeSnappedDomain(values: number[]): [number, number] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return [0, 100_000];

  let min = Math.min(...finite);
  let max = Math.max(...finite);

  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.1, 100_000);
    min -= pad;
    max += pad;
  }

  const range = max - min;
  const pad = range * 0.08;
  min -= pad;
  max += pad;

  const step = 100_000; // 0.1M
  const snappedMin = Math.floor(min / step) * step;
  const snappedMax = Math.ceil(max / step) * step;

  return [snappedMin, snappedMax];
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

// Treemap cell position for HTML overlay
type CellPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  value: number;
  color: string;
};

// Global store for cell positions (updated during render)
let cellCollector: CellPosition[] = [];

// Custom treemap content - rectangles only, captures positions for HTML labels
interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  value: number;
  index: number;
  depth: number;
  colors: string[];
}

function TreemapContent(props: TreemapContentProps) {
  const { x, y, width, height, name, value, index, depth, colors } = props;
  
  // Only render leaf nodes
  if (depth !== 1) return null;
  
  const color = colors[index % colors.length];

  // Round positions to whole pixels
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(width);
  const rh = Math.round(height);

  // Collect cell position for HTML overlay
  if (rw > 0 && rh > 0) {
    cellCollector.push({ x: rx, y: ry, width: rw, height: rh, name, value, color });
  }
  
  return (
    <g>
      <rect
        x={rx}
        y={ry}
        width={rw}
        height={rh}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
        ry={4}
        role="img"
        aria-label={`${name}: ${formatCurrency(value)}`}
      />
    </g>
  );
}

// Custom tooltip for treemap
interface TreemapTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      value: number;
    };
  }>;
}

function TreemapTooltip({ active, payload }: TreemapTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  
  const data = payload[0].payload;
  
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-sm font-semibold text-slate-900">{data.name}</p>
      <p className="text-sm text-slate-600">{formatCurrency(data.value)}</p>
    </div>
  );
}

// HTML Label overlay component - renders crisp text on top of treemap
function TreemapLabels({ cells }: { cells: CellPosition[] }) {
  return (
    <div 
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      {cells.map((cell, i) => {
        const showFullLabel = cell.width > 80 && cell.height > 50;
        const showShortLabel = cell.width > 50 && cell.height > 30;
        const showValue = cell.width > 60 && cell.height > 45;
        
        if (!showFullLabel && !showShortLabel) return null;
        
        // Truncate name for display
        const displayName = cell.name.length > 15 ? cell.name.slice(0, 12) + "…" : cell.name;
        const shortName = cell.name.length > 8 ? cell.name.slice(0, 6) + "…" : cell.name;
        
        return (
          <div
            key={`${cell.name}-${i}`}
            className="absolute flex flex-col items-center justify-center overflow-hidden"
            style={{
              left: cell.x,
              top: cell.y,
              width: cell.width,
              height: cell.height,
            }}
          >
            <span 
              className="text-white font-medium leading-tight text-center px-1 truncate max-w-full"
              style={{ 
                fontSize: showFullLabel ? 13 : 11,
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              {showFullLabel ? displayName : shortName}
            </span>
            {showValue && (
              <span 
                className="text-white/90 leading-tight"
                style={{ 
                  fontSize: 11,
                  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
              >
                {formatCurrencyCompactTick(cell.value)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
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
  
  // Track treemap cell positions for HTML labels
  const [cellPositions, setCellPositions] = useState<CellPosition[]>([]);
  const treemapContainerRef = useRef<HTMLDivElement>(null);

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

    const yoyDomain = useMemo((): [number, number] => {
    const values = yoyTrendData.map((d) => Number(d.Revenue || 0));
    return computeSnappedDomain(values);
  }, [yoyTrendData]);

  const distributionSlices = useMemo(() => {
    const base: DistributionSlice[] = sourceRows.map((row) => ({
      name: row.source,
      value: row.total,
    }));
    return buildDistribution(base);
  }, [sourceRows]);

  // Treemap data format
  const treemapData = useMemo(() => {
    return distributionSlices.map((slice, index) => ({
      name: slice.name,
      value: slice.value,
      fill: TREEMAP_COLORS[index % TREEMAP_COLORS.length],
    }));
  }, [distributionSlices]);

  // Update cell positions after treemap renders
  useEffect(() => {
    // Small delay to let Recharts render first
    const timer = setTimeout(() => {
      if (cellCollector.length > 0) {
        setCellPositions([...cellCollector]);
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [treemapData]);

  // Clear collector before each render
  cellCollector = [];

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
      headerClassName: "text-right",
      cellClassName: "whitespace-nowrap text-right font-mono",
      cell: (row) => (
        <span className="text-sm">
          {formatCurrency(row.total)}
        </span>
      ),
    },
    {
      key: "count",
      header: "Records",
      sortable: true,
      sortAccessor: (row) => row.count,
      headerClassName: "text-right",
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
      headerClassName: "text-right",
      cellClassName: "whitespace-nowrap text-right font-mono",
      cell: (row) => (
        <span className="text-sm">
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

  // Build narrative summary
  const narrative = useMemo(() => {
    const cityName = CITY_CONFIG.displayName || "This organization";
    const topSources = sourceRows.slice(0, 3).map((r) => ({
      name: r.source,
      value: r.total,
    }));

    return buildRevenuesNarrative({
      cityName,
      year: selectedYear,
      totalRevenue,
      sourceCount: totalSources,
      topSources,
      yearTotals,
    });
  }, [selectedYear, totalRevenue, totalSources, sourceRows, yearTotals]);

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

      {/* Narrative Summary */}
      {narrative && <NarrativeSummary narrative={narrative} />}

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
<div className="grid gap-4 md:grid-cols-2 overflow-hidden">
            {/* Distribution by source - Treemap */}
<figure
  role="group"
  aria-labelledby="revenue-distribution-heading"
  aria-describedby="revenue-distribution-desc"
  className="min-w-0 overflow-hidden space-y-3"
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
                  sources for {yearLabel ?? "this year"}. Larger areas represent higher revenue.
                </p>
              </div>

              {distributionSlices.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No revenue data available for this fiscal year.
                </p>
              ) : (
                <>
                  {/* Treemap visualization with HTML label overlay */}
                  <div 
                    ref={treemapContainerRef}
                    className="relative h-64 w-full min-w-0 overflow-hidden sm:h-72"
                    role="img"
                    aria-label={`Treemap showing revenue distribution: ${distributionSlices.map(s => `${s.name} ${formatCurrency(s.value)}`).join(', ')}`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <Treemap
                        data={treemapData}
                        dataKey="value"
                        aspectRatio={4 / 3}
                        stroke="#fff"
                        content={
                          <TreemapContent 
                            x={0} 
                            y={0} 
                            width={0} 
                            height={0} 
                            name="" 
                            value={0} 
                            index={0} 
                            depth={1}
                            colors={TREEMAP_COLORS}
                          />
                        }
                      >
                        <Tooltip content={<TreemapTooltip />} />
                      </Treemap>
                    </ResponsiveContainer>
                    
                    {/* HTML labels overlay - renders crisp text */}
                    <TreemapLabels cells={cellPositions} />
                  </div>

                  {/* Accessible data table - always visible for screen readers and mobile */}
<div className="overflow-x-auto -mx-1 px-1">
                    <table 
                      className="mt-3 min-w-full border border-slate-200 text-sm"
                      aria-label="Revenue distribution data"
                    >
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
                        {distributionSlices.map((slice, index) => {
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
                                <span className="flex items-center gap-2">
                                  <span 
                                    className="inline-block h-3 w-3 flex-shrink-0 rounded-sm"
                                    style={{ backgroundColor: TREEMAP_COLORS[index % TREEMAP_COLORS.length] }}
                                    aria-hidden="true"
                                  />
                                  {slice.name}
                                </span>
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
                        domain={yoyDomain}
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
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              />
            </form>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applySourceSearch}
                className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                Clear
              </button>
            </div>
          </div>

          {sourceQuery && sourceQuery.trim().length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span className="font-semibold">Active filters:</span>{" "}
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                <span>Source contains "{sourceQuery.trim()}"</span>
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

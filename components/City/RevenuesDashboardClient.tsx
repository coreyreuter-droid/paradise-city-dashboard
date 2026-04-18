// components/City/RevenuesDashboardClient.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
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
import { formatCurrency, formatAxisCurrency } from "@/lib/format";
import { computeSnappedDomain } from "@/lib/chartDomain";
import { buildRevenuesNarrative } from "@/lib/narrativeHelpers";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import NarrativeSummary from "../NarrativeSummary";
import FiscalYearSelect from "../FiscalYearSelect";
import DrillBarList from "../ui/DrillBarList";
import type { DrillBarItem } from "../ui/DrillBarList";
import FinanceTooltip from "../ui/FinanceTooltip";
import DataTable, { DataTableColumn } from "../DataTable";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { cityHref } from "@/lib/cityRouting";
import { REVENUE_LINE_COLOR } from "@/lib/chartConfig";

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

function buildSearchUrl(
  pathname: string,
  currentParams: URLSearchParams,
  updates: { year?: string | null; q?: string | null }
): string {
  const params = new URLSearchParams(currentParams.toString());
  if (updates.year !== undefined) {
    if (!updates.year || updates.year === "latest") params.delete("year");
    else params.set("year", updates.year);
  }
  if (updates.q !== undefined) {
    const trimmed = updates.q?.trim() ?? "";
    if (trimmed.length === 0) params.delete("q");
    else params.set("q", trimmed);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
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
  const [queryInput, setQueryInput] = useState<string>(sourceQuery ?? "");

  const yearLabel = selectedYear ?? (years.length > 0 ? years[0] : undefined);

  // Aggregate by source/category
  const sourceRows: RevenueSourceRow[] = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    for (const r of revenues) {
      const raw = r.category && r.category.trim().length > 0 ? r.category.trim() : "Unspecified";
      const amt = Number(r.amount || 0);
      const current = map.get(raw) ?? { total: 0, count: 0 };
      current.total += amt;
      current.count += 1;
      map.set(raw, current);
    }

    let rows: RevenueSourceRow[] = Array.from(map.entries()).map(([source, v]) => ({
      source,
      total: v.total,
      count: v.count,
      avg: v.count > 0 ? v.total / v.count : 0,
    }));

    const q = sourceQuery?.trim().toLowerCase();
    if (q && q.length > 0) {
      rows = rows.filter((row) => row.source.toLowerCase().includes(q));
    }

    rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [revenues, sourceQuery]);

  const totalSources = sourceRows.length;
  const totalRevenue = sourceRows.reduce((sum, r) => sum + r.total, 0);
  const topSource = sourceRows[0]?.source ?? null;

  // Drill bar items
  const drillItems: DrillBarItem[] = useMemo(() => {
    return sourceRows.map((r) => ({
      name: r.source,
      budget: r.total, // use budget slot for total revenue (visual bar)
      actual: 0,
      href: cityHref(`/revenues/${encodeURIComponent(r.source)}${selectedYear ? `?year=${selectedYear}` : ""}`),
    }));
  }, [sourceRows, selectedYear]);

  // YoY trend
  const yoyTrendData = useMemo(() => {
    if (!yearTotals || yearTotals.length === 0) return [];
    return [...yearTotals]
      .filter((row) => Number.isFinite(row.total))
      .sort((a, b) => a.year - b.year)
      .map((row) => ({ year: row.year, Revenue: row.total }));
  }, [yearTotals]);

  const yoyDomain = useMemo((): [number, number] => {
    const values = yoyTrendData.map((d) => Number(d.Revenue || 0));
    return computeSnappedDomain(values);
  }, [yoyTrendData]);

  // YoY change
  const yoyChange = useMemo(() => {
    if (!selectedYear || yearTotals.length < 2) return null;
    const current = yearTotals.find((y) => y.year === selectedYear);
    const prior = yearTotals.find((y) => y.year === selectedYear - 1);
    if (!current || !prior || prior.total === 0) return null;
    const delta = current.total - prior.total;
    const pct = (delta / prior.total) * 100;
    return { delta, pct };
  }, [selectedYear, yearTotals]);

  // Columns
  const columns: DataTableColumn<RevenueSourceRow>[] = [
    {
      key: "source",
      header: "Revenue source",
      sortable: true,
      sortAccessor: (row) => row.source.toLowerCase(),
      cell: (row) => (
        <Link
          href={cityHref(`/revenues/${encodeURIComponent(row.source)}`)}
          className="font-medium text-slate-800 hover:underline"
        >
          {row.source}
        </Link>
      ),
    },
    {
      key: "total",
      header: "Total revenue",
      sortable: true,
      sortAccessor: (row) => row.total,
      headerClassName: "text-right",
      cellClassName: "whitespace-nowrap text-right font-mono",
      cell: (row) => formatCurrency(row.total),
    },
    {
      key: "count",
      header: "Records",
      sortable: true,
      sortAccessor: (row) => row.count,
      headerClassName: "text-right",
      cellClassName: "whitespace-nowrap text-right",
      cell: (row) => row.count.toLocaleString("en-US"),
    },
    {
      key: "avg",
      header: "Avg per record",
      sortable: true,
      sortAccessor: (row) => row.avg,
      headerClassName: "text-right",
      cellClassName: "whitespace-nowrap text-right font-mono",
      cell: (row) => formatCurrency(row.avg),
    },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildSearchUrl(pathname, searchParams, { q: queryInput }));
  };

  const handleClearFilters = () => {
    setQueryInput("");
    router.push(buildSearchUrl(pathname, searchParams, { q: null }));
  };

  // Narrative
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
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Revenue"
        title="Revenue by source"
        description="Explore recorded revenues by source. Click any source to see details."
        fiscalNote={fiscalYearNote}
        rightSlot={years.length > 0 ? <FiscalYearSelect options={years} label="Fiscal year" /> : null}
      />

      <nav aria-label="Breadcrumb" className="px-1 text-xs text-slate-600">
        <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
        <span className="mx-1 text-slate-400">›</span>
        <span className="font-medium text-slate-700">Revenue</span>
      </nav>

      {narrative && <NarrativeSummary narrative={narrative} />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <FinanceTooltip term="revenue">Total revenue</FinanceTooltip>
          </p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">
            {formatCurrency(totalRevenue)}
          </p>
          {yoyChange && (
            <p className={`mt-0.5 text-[11px] font-semibold ${yoyChange.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {yoyChange.delta >= 0 ? "+" : ""}{yoyChange.pct.toFixed(1)}% vs prior
            </p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sources</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{totalSources}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Top source</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{topSource ?? "—"}</p>
          {sourceRows[0] && (
            <p className="mt-0.5 text-[11px] text-slate-500">{formatCurrency(sourceRows[0].total)}</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fiscal year</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{yearLabel ?? "—"}</p>
        </div>
      </div>

      {/* Revenue source drill bars */}
      <CardContainer>
        <section aria-label="Revenue sources" className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Revenue sources — FY {yearLabel}
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {totalSources} sources. Click any source to explore.
              </p>
            </div>
          </div>

          {sourceRows.length === 0 ? (
            <p className="text-sm text-slate-600">
              No revenue data available for {yearLabel ?? "the selected year"}.
            </p>
          ) : (
            <DrillBarList
              items={drillItems}
              showActuals={false}
              showTable={true}
              ariaLabel="Revenue sources ranked by amount"
            />
          )}
        </section>
      </CardContainer>

      {/* YoY trend chart */}
      {yoyTrendData.length > 1 && (
        <CardContainer>
          <section aria-label="Revenue over time" className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Revenue over time
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                Total recorded revenue across {yoyTrendData.length} fiscal years.
              </p>
            </div>

            <div className="h-64 w-full min-w-0 overflow-hidden sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={yoyTrendData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} />
                  <YAxis
                    domain={yoyDomain}
                    tickFormatter={formatAxisCurrency}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelFormatter={(label) => `Fiscal year ${label}`}
                    formatter={(value) =>
                      typeof value === "number"
                        ? [formatCurrency(value), "Revenue"]
                        : [String(value ?? ""), "Revenue"]
                    }
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    labelStyle={{ color: "#0f172a", fontWeight: 600, marginBottom: "4px" }}
                    itemStyle={{ color: "#334155" }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} />
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
          </section>
        </CardContainer>
      )}

      {/* Search + table */}
      <CardContainer>
        <section aria-label="Revenue search and table" className="space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end" aria-label="Revenue source search">
            <div className="flex-1">
              <label htmlFor="revenue-source-search" className="text-xs font-medium text-slate-700">
                Search revenue sources
              </label>
              <input
                id="revenue-source-search"
                type="search"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder='e.g. "Sales Tax", "Grants"'
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                Search
              </button>
              {sourceQuery && (
                <button type="button" onClick={handleClearFilters} className="text-xs text-slate-600 hover:text-slate-900 underline underline-offset-2">
                  Clear
                </button>
              )}
            </div>
          </form>

          {sourceQuery && sourceQuery.trim().length > 0 && (
            <p className="text-xs text-slate-500">
              Showing {sourceRows.length} sources matching &quot;{sourceQuery.trim()}&quot;
            </p>
          )}

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

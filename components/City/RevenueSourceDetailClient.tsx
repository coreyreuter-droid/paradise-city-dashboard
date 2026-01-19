// components/City/RevenueSourceDetailClient.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import type { RevenueRow } from "@/lib/types";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import NarrativeSummary from "../NarrativeSummary";
import FiscalYearSelect from "../FiscalYearSelect";
import DataTable, { DataTableColumn } from "../DataTable";
import { cityHref } from "@/lib/cityRouting";
import { formatCurrency, formatPercent, formatAxisCurrency } from "@/lib/format";
import { computeSnappedDomain } from "@/lib/chartDomain";

type Props = {
  sourceName: string;
  revenues: RevenueRow[];
  availableYears: number[];
  summaryByYear: Array<{
    fiscal_year: number;
    total: number;
    count: number;
  }>;
  selectedYear: number;
  fiscalYearStartMonth: number;
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Convert fiscal period (1-12) to month name based on fiscal year start month.
 * E.g., if fiscal year starts in August (8), period 1 = Aug, period 2 = Sep, etc.
 */
function fiscalPeriodToMonth(fiscalPeriod: number, fiscalYearStartMonth: number): string {
  // fiscalPeriod is 1-12, fiscalYearStartMonth is 1-12
  // Period 1 = start month, Period 2 = start month + 1, etc.
  const monthIndex = ((fiscalYearStartMonth - 1) + (fiscalPeriod - 1)) % 12;
  return MONTH_NAMES[monthIndex];
}

export default function RevenueSourceDetailClient({
  sourceName,
  revenues,
  availableYears,
  summaryByYear,
  selectedYear,
  fiscalYearStartMonth,
}: Props) {
  // Reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Summary stats for selected year
  const currentYearSummary = summaryByYear.find((s) => s.fiscal_year === selectedYear);
  const totalRevenue = currentYearSummary?.total ?? 0;
  const recordCount = currentYearSummary?.count ?? 0;
  const avgPerRecord = recordCount > 0 ? totalRevenue / recordCount : 0;

  // Year-over-year comparison
  const prevYearSummary = summaryByYear.find((s) => s.fiscal_year === selectedYear - 1);
  const yoyChange = prevYearSummary
    ? ((totalRevenue - prevYearSummary.total) / prevYearSummary.total) * 100
    : null;

  // Breakdown by period (monthly based on fiscal period)
  const byPeriod = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of revenues) {
      const period = r.fiscal_period ?? 0;
      if (period >= 1 && period <= 12) {
        map.set(period, (map.get(period) ?? 0) + Number(r.amount ?? 0));
      }
    }
    return Array.from(map.entries())
      .map(([fiscalPeriod, total]) => ({
        fiscalPeriod,
        month: fiscalPeriodToMonth(fiscalPeriod, fiscalYearStartMonth),
        total,
      }))
      .sort((a, b) => a.fiscalPeriod - b.fiscalPeriod);
  }, [revenues, fiscalYearStartMonth]);

  // Breakdown by fund
  const byFund = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of revenues) {
      const fund = r.fund_name ?? "Unspecified";
      map.set(fund, (map.get(fund) ?? 0) + Number(r.amount ?? 0));
    }
    return Array.from(map.entries())
      .map(([fund, total]) => ({ fund, total, percent: totalRevenue > 0 ? (total / totalRevenue) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [revenues, totalRevenue]);

  // Breakdown by department
  const byDepartment = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of revenues) {
      const dept = r.department_name ?? "Unspecified";
      map.set(dept, (map.get(dept) ?? 0) + Number(r.amount ?? 0));
    }
    return Array.from(map.entries())
      .map(([department, total]) => ({ department, total, percent: totalRevenue > 0 ? (total / totalRevenue) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [revenues, totalRevenue]);

  // Multi-year trend data
  const trendData = useMemo(() => {
    return summaryByYear
      .map((s) => ({
        year: s.fiscal_year,
        Revenue: s.total,
      }))
      .sort((a, b) => a.year - b.year);
  }, [summaryByYear]);

  const trendDomain = useMemo(() => {
    return computeSnappedDomain(trendData.map((d) => d.Revenue));
  }, [trendData]);

  // Table columns for individual records
  const recordColumns: DataTableColumn<RevenueRow>[] = useMemo(
    () => [
      {
        key: "fiscal_period",
        header: "Month",
        sortable: true,
        sortAccessor: (row) => row.fiscal_period ?? 0,
        cell: (row) => {
          if (row.fiscal_period && row.fiscal_period >= 1 && row.fiscal_period <= 12) {
            return fiscalPeriodToMonth(row.fiscal_period, fiscalYearStartMonth);
          }
          return row.period ?? "–";
        },
      },
      {
        key: "fund_name",
        header: "Fund",
        sortable: true,
        cell: (row) => row.fund_name ?? "–",
      },
      {
        key: "department_name",
        header: "Department",
        sortable: true,
        cell: (row) => row.department_name ?? "–",
      },
      {
        key: "account_name",
        header: "Account",
        sortable: true,
        cell: (row) => row.account_name ?? "–",
      },
      {
        key: "amount",
        header: "Amount",
        sortable: true,
        headerClassName: "text-right",
        cellClassName: "text-right font-mono",
        cell: (row) => formatCurrency(Number(row.amount ?? 0)),
      },
    ],
    [fiscalYearStartMonth]
  );

  // Narrative
  const narrative = useMemo(() => {
    let text = `${sourceName} generated ${formatCurrency(totalRevenue)} in revenue for fiscal year ${selectedYear}`;
    if (recordCount > 1) {
      text += `, recorded across ${recordCount.toLocaleString()} entries`;
    }
    text += ".";
    if (yoyChange !== null) {
      const direction = yoyChange >= 0 ? "increased" : "decreased";
      text += ` This ${direction} ${Math.abs(yoyChange).toFixed(1)}% compared to the previous year.`;
    }
    return text;
  }, [sourceName, totalRevenue, selectedYear, recordCount, yoyChange]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <ol className="flex items-center gap-1">
          <li>
            <Link
              href={cityHref("/revenues")}
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded"
            >
              Revenues
            </Link>
          </li>
          <li>
            <span className="text-slate-500" aria-hidden="true">›</span>
          </li>
          <li>
            <span className="font-medium text-slate-900">{sourceName}</span>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionHeader
            title={sourceName}
          />
          <p className="mt-1 text-sm text-slate-600">
            Revenue source details for fiscal year {selectedYear}
          </p>
        </div>
        <FiscalYearSelect
          options={availableYears}
        />
      </div>

      {/* Narrative */}
      <NarrativeSummary narrative={narrative} />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardContainer>
          <div className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Total Revenue
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(totalRevenue)}
            </div>
          </div>
        </CardContainer>

        <CardContainer>
          <div className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Records
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {recordCount.toLocaleString()}
            </div>
          </div>
        </CardContainer>

        <CardContainer>
          <div className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Avg per Record
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(avgPerRecord)}
            </div>
          </div>
        </CardContainer>

        <CardContainer>
          <div className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Year-over-Year
            </div>
            <div className={`mt-1 text-2xl font-bold ${yoyChange === null ? "text-slate-500" : yoyChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {yoyChange === null ? "–" : `${yoyChange >= 0 ? "+" : ""}${yoyChange.toFixed(1)}%`}
            </div>
          </div>
        </CardContainer>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend over time */}
        {trendData.length > 1 && (
          <CardContainer>
            <div className="p-4">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">
                Revenue Over Time
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} />
                    <YAxis
                      domain={trendDomain}
                      tickFormatter={formatAxisCurrency}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      labelFormatter={(label) => `Fiscal year ${label}`}
                      formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      labelStyle={{
                        color: "#0f172a",
                        fontWeight: 600,
                        marginBottom: "4px",
                      }}
                      itemStyle={{
                        color: "#334155",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Revenue"
                      stroke="#0f172a"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={!prefersReducedMotion}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContainer>
        )}

        {/* By period (monthly) */}
        {byPeriod.length > 1 && (
          <CardContainer>
            <div className="p-4">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">
                Revenue by Month ({selectedYear})
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPeriod} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={formatAxisCurrency}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      labelFormatter={(label) => `${label}`}
                      formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      labelStyle={{
                        color: "#0f172a",
                        fontWeight: 600,
                        marginBottom: "4px",
                      }}
                      itemStyle={{
                        color: "#334155",
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="#0d9488"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={!prefersReducedMotion}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContainer>
        )}
      </div>

      {/* Breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Fund */}
        {byFund.length > 0 && byFund[0].fund !== "Unspecified" && (
          <CardContainer>
            <div className="p-4">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">
                By Fund ({selectedYear})
              </h2>
              <div className="space-y-2 text-sm">
                {byFund.slice(0, 8).map((f) => (
                  <div key={f.fund}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate pr-2 text-slate-800">{f.fund}</span>
                      <span className="whitespace-nowrap font-mono text-slate-900">
                        {formatCurrency(f.total)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-teal-500"
                          style={{ width: `${Math.max(2, Math.min(f.percent, 100))}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs text-slate-700">
                        {formatPercent(f.percent)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContainer>
        )}

        {/* By Department */}
        {byDepartment.length > 0 && byDepartment[0].department !== "Unspecified" && (
          <CardContainer>
            <div className="p-4">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">
                By Department ({selectedYear})
              </h2>
              <div className="space-y-2 text-sm">
                {byDepartment.slice(0, 8).map((d) => (
                  <div key={d.department}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate pr-2 text-slate-800">{d.department}</span>
                      <span className="whitespace-nowrap font-mono text-slate-900">
                        {formatCurrency(d.total)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-blue-500"
                          style={{ width: `${Math.max(2, Math.min(d.percent, 100))}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs text-slate-700">
                        {formatPercent(d.percent)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContainer>
        )}
      </div>

      {/* Individual records table */}
      <CardContainer>
        <div className="p-4">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Individual Records ({selectedYear})
          </h2>
          <p className="mb-4 text-sm text-slate-700">
            Showing {revenues.length.toLocaleString()} revenue entries for {sourceName}.
          </p>
          <DataTable<RevenueRow>
            data={revenues}
            columns={recordColumns}
            getRowKey={(row, idx) => `${row.period}-${row.fund_code}-${row.account_code}-${idx}`}
            pageSize={25}
            showPagination={revenues.length > 25}
            initialSortKey="period"
            initialSortDirection="asc"
          />
        </div>
      </CardContainer>
    </div>
  );
}

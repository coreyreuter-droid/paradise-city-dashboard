// components/City/RevenueSourceDetailClient.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { RevenueRow } from "@/lib/types";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import NarrativeSummary from "../NarrativeSummary";
import FiscalYearSelect from "../FiscalYearSelect";
import DrillBarList from "../ui/DrillBarList";
import type { DrillBarItem } from "../ui/DrillBarList";
import FinanceTooltip from "../ui/FinanceTooltip";
import DataTable, { DataTableColumn } from "../DataTable";
import { cityHref } from "@/lib/cityRouting";
import { formatCurrency, formatAxisCurrency } from "@/lib/format";
import { computeSnappedDomain } from "@/lib/chartDomain";

type Props = {
  sourceName: string;
  revenues: RevenueRow[];
  availableYears: number[];
  summaryByYear: Array<{ fiscal_year: number; total: number; count: number }>;
  selectedYear: number;
  fiscalYearStartMonth: number;
};

export default function RevenueSourceDetailClient({
  sourceName,
  revenues,
  availableYears,
  summaryByYear,
  selectedYear,
}: Props) {
  const currentYearSummary = summaryByYear.find((s) => s.fiscal_year === selectedYear);
  const totalRevenue = currentYearSummary?.total ?? 0;
  const recordCount = currentYearSummary?.count ?? 0;
  const avgPerRecord = recordCount > 0 ? totalRevenue / recordCount : 0;

  const prevYearSummary = summaryByYear.find((s) => s.fiscal_year === selectedYear - 1);
  const yoyChange = prevYearSummary && prevYearSummary.total > 0
    ? ((totalRevenue - prevYearSummary.total) / prevYearSummary.total) * 100
    : null;

  // Fund breakdown
  const fundItems: DrillBarItem[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of revenues) {
      const fund = r.fund_name ?? "Unspecified";
      map.set(fund, (map.get(fund) ?? 0) + Number(r.amount ?? 0));
    }
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, budget: total, actual: 0 }))
      .sort((a, b) => b.budget - a.budget);
  }, [revenues]);

  // Department breakdown
  const deptItems: DrillBarItem[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of revenues) {
      const dept = r.department_name ?? "Unspecified";
      map.set(dept, (map.get(dept) ?? 0) + Number(r.amount ?? 0));
    }
    return Array.from(map.entries())
      .map(([name, total]) => ({
        name,
        budget: total,
        actual: 0,
        href: name !== "Unspecified"
          ? cityHref(`/departments/${encodeURIComponent(name)}?year=${selectedYear}`)
          : undefined,
      }))
      .sort((a, b) => b.budget - a.budget);
  }, [revenues, selectedYear]);

  // Multi-year trend
  const trendData = useMemo(() => {
    return summaryByYear
      .map((s) => ({ year: s.fiscal_year, Revenue: s.total }))
      .sort((a, b) => a.year - b.year);
  }, [summaryByYear]);

  const trendDomain = useMemo(() => computeSnappedDomain(trendData.map((d) => d.Revenue)), [trendData]);

  // Record columns
  const recordColumns: DataTableColumn<RevenueRow>[] = useMemo(() => [
    { key: "fund_name", header: "Fund", sortable: true, cell: (row) => row.fund_name ?? "–" },
    { key: "department_name", header: "Department", sortable: true, cell: (row) => row.department_name ?? "–" },
    { key: "account_name", header: "Account", sortable: true, cell: (row) => row.account_name ?? "–" },
    {
      key: "amount", header: "Amount", sortable: true,
      headerClassName: "text-right", cellClassName: "text-right font-mono",
      cell: (row) => formatCurrency(Number(row.amount ?? 0)),
    },
  ], []);

  // Narrative
  const narrative = useMemo(() => {
    let text = `${sourceName} generated ${formatCurrency(totalRevenue)} in revenue for fiscal year ${selectedYear}`;
    if (recordCount > 1) text += `, recorded across ${recordCount.toLocaleString()} entries`;
    text += ".";
    if (yoyChange !== null) {
      const direction = yoyChange >= 0 ? "increased" : "decreased";
      text += ` This ${direction} ${Math.abs(yoyChange).toFixed(1)}% compared to the previous year.`;
    }
    return text;
  }, [sourceName, totalRevenue, selectedYear, recordCount, yoyChange]);

  const showFunds = fundItems.length > 0 && fundItems[0].name !== "Unspecified";
  const showDepts = deptItems.length > 0 && deptItems[0].name !== "Unspecified";

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Revenue source"
        title={sourceName}
        description={`Revenue source details for FY ${selectedYear}.`}
        rightSlot={availableYears.length > 0 ? <FiscalYearSelect options={availableYears} label="Fiscal year" /> : null}
      />

      <nav aria-label="Breadcrumb" className="px-1 text-xs text-slate-600">
        <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
        <span className="mx-1 text-slate-400" aria-hidden="true">›</span>
        <Link href={cityHref(`/revenues?year=${selectedYear}`)} className="hover:text-slate-800">Revenue</Link>
        <span className="mx-1 text-slate-400" aria-hidden="true">›</span>
        <span className="font-medium text-slate-700">{sourceName}</span>
      </nav>

      {narrative && <NarrativeSummary narrative={narrative} />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <FinanceTooltip term="revenue">Total revenue</FinanceTooltip>
          </p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(totalRevenue)}</p>
          {yoyChange !== null && (
            <p className={`mt-0.5 text-[11px] font-semibold ${yoyChange >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {yoyChange >= 0 ? "+" : ""}{yoyChange.toFixed(1)}% vs prior
            </p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Records</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{recordCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Avg per record</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(avgPerRecord)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fiscal year</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{selectedYear}</p>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        {showFunds && (
          <CardContainer>
            <section aria-label="Revenue by fund" className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">By fund</h2>
              <DrillBarList items={fundItems} showActuals={false} ariaLabel="Revenue by fund" />
            </section>
          </CardContainer>
        )}
        {showDepts && (
          <CardContainer>
            <section aria-label="Revenue by department" className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">By department</h2>
              <DrillBarList items={deptItems} showActuals={false} showIcons={true} ariaLabel="Revenue by department" />
            </section>
          </CardContainer>
        )}
      </div>

      {/* Multi-year trend */}
      {trendData.length > 1 && (
        <CardContainer>
          <section aria-label="Revenue trend" className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">{sourceName} over time</h2>
            <div className="h-56 w-full min-w-0 overflow-hidden sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} />
                  <YAxis domain={trendDomain} tickFormatter={formatAxisCurrency} tickLine={false} axisLine={false} />
                  <Tooltip
                    labelFormatter={(label) => `FY ${label}`}
                    formatter={(value) => typeof value === "number" ? [formatCurrency(value), "Revenue"] : [String(value), "Revenue"]}
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    labelStyle={{ color: "#0f172a", fontWeight: 600, marginBottom: "4px" }}
                  />
                  <Line type="monotone" dataKey="Revenue" stroke="#0f172a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </CardContainer>
      )}

      {/* Individual records */}
      <CardContainer>
        <section aria-label="Revenue records" className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Individual records ({revenues.length.toLocaleString()})
          </h2>
          <DataTable<RevenueRow>
            data={revenues}
            columns={recordColumns}
            getRowKey={(row, idx) => `${row.period}-${row.fund_code}-${row.account_code}-${idx}`}
            pageSize={25}
            showPagination={revenues.length > 25}
            initialSortKey="amount"
            initialSortDirection="desc"
          />
        </section>
      </CardContainer>
    </div>
  );
}

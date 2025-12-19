"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CardContainer from "@/components/CardContainer";
import BudgetCharts from "@/components/Budget/BudgetCharts";
import type { DepartmentSummary } from "@/components/Budget/BudgetClient";
import SectionHeader from "@/components/SectionHeader";
import ParadiseHomeKpiStrip from "@/components/City/HomeKpiStrip";
import ParadiseHomeMultiYearChart from "@/components/City/HomeMultiYearChart";
import DepartmentsGrid from "@/components/City/HomeDepartmentsGrid";
import RecentTransactionsCard from "@/components/City/HomeRecentTransactionsCard";
import HomeRevenueSummary from "@/components/City/HomeRevenueSummary";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { cityHref } from "@/lib/cityRouting";
import type {
  PortalSettings,
  VendorYearSummary,
  BudgetActualsYearDeptRow,
} from "@/lib/queries";
import type { TransactionRow, RevenueRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type FreshnessEntry = {
  table: string;
  fiscalYear: number | null;
  rowCount: number | null;
  lastUploadAt: string | null;
};

type DataFreshnessSummary = {
  budgets?: FreshnessEntry | null;
  actuals?: FreshnessEntry | null;
  transactions?: FreshnessEntry | null;
  revenues?: FreshnessEntry | null;
};

type YearTotalsRow = {
  year: number;
  Budget: number;
  Actuals: number;
  Variance: number;
};

type Props = {
  deptBudgetActuals: BudgetActualsYearDeptRow[];
  yearTotals: YearTotalsRow[];

  recentTransactions: TransactionRow[];
  vendorSummaries: VendorYearSummary[];
  availableYears: number[];
  portalSettings: PortalSettings | null;

  revenues?: RevenueRow[];
  revenueTotal?: number | null;
  dataFreshness?: DataFreshnessSummary;
};

function formatFreshnessDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const MONTH_NAMES = ["", "January","February","March","April","May","June","July","August","September","October","November","December"];
const LAST_DAY_OF_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function getFiscalYearPublicLabel(portalSettings: PortalSettings | null): string | null {
  if (!portalSettings) return null;

  const anySettings = portalSettings as any;
  const explicitLabel = anySettings?.fiscal_year_label as string | null | undefined;
  if (explicitLabel && explicitLabel.trim().length > 0) return explicitLabel.trim();

  const startMonth = (anySettings?.fiscal_year_start_month as number | null | undefined) ?? 1;
  const startDay = (anySettings?.fiscal_year_start_day as number | null | undefined) ?? 1;

  if (startMonth === 1 && startDay === 1) {
    return "Fiscal year aligns with the calendar year (January 1 – December 31).";
  }

  const startMonthName = MONTH_NAMES[startMonth] || "January";
  const endMonthIndex = ((startMonth + 10) % 12) + 1;
  const endMonthName = MONTH_NAMES[endMonthIndex] || "December";

const endDay = LAST_DAY_OF_MONTH[endMonthIndex] ?? 30;
return `Fiscal year runs ${startMonthName} ${startDay} – ${endMonthName} ${endDay}.`;

}

export default function ParadiseHomeClient({
  deptBudgetActuals,
  yearTotals,
  recentTransactions,
  vendorSummaries,
  availableYears,
  portalSettings,
  revenues = [],
  revenueTotal,
  dataFreshness,
}: Props) {
  const searchParams = useSearchParams();

  const enableActuals =
    portalSettings?.enable_actuals === null || portalSettings?.enable_actuals === undefined
      ? true
      : !!portalSettings.enable_actuals;

  const enableTransactions = portalSettings?.enable_transactions === true;
  const enableRevenues = portalSettings?.enable_revenues === true;
  const enableVendors = enableTransactions && portalSettings?.enable_vendors === true;

  const years = useMemo(() => (availableYears ?? []).slice().sort((a, b) => b - a), [availableYears]);

  const selectedYear: number | null = useMemo(() => {
    if (!years.length) return null;
    const raw = searchParams.get("year");
    if (!raw) return years[0];
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return years[0];
    if (!years.includes(parsed)) return years[0];
    return parsed;
  }, [searchParams, years]);

  const yearLabel = selectedYear !== null ? String(selectedYear) : null;

  const departmentsForYear: DepartmentSummary[] = useMemo(() => {
    const rows = (deptBudgetActuals ?? []).map((r) => {
      const dept = r.department_name || "Unspecified";
      const budget = Number(r.budget_amount || 0);
      const actual = Number(r.actual_amount || 0);
      const percentSpent = budget > 0 ? (actual / budget) * 100 : 0;

      return { department_name: dept, budget, actuals: actual, percentSpent };
    });

    rows.sort((a, b) => b.budget - a.budget);
    return rows;
  }, [deptBudgetActuals]);

  const { totalBudget, totalActuals, variance, execPct, deptCount, txCount, topDepartment } =
    useMemo(() => {
      const totalBudget = departmentsForYear.reduce((sum, d) => sum + d.budget, 0);
      const totalActuals = departmentsForYear.reduce((sum, d) => sum + d.actuals, 0);
      const variance = totalActuals - totalBudget;
      const execPct = totalBudget > 0 ? totalActuals / totalBudget : 0;
      const deptCount = departmentsForYear.length;

      const txCount = enableTransactions
        ? (vendorSummaries ?? []).reduce((sum, v) => sum + Number(v.txn_count || 0), 0)
        : 0;

      const topDepartment = departmentsForYear.length > 0 ? departmentsForYear[0].department_name : null;

      return { totalBudget, totalActuals, variance, execPct, deptCount, txCount, topDepartment };
    }, [departmentsForYear, enableTransactions, vendorSummaries]);

  const execPctDisplay = `${Math.round(execPct * 100)}%`;
  const hasBudgetData = totalBudget > 0;

  const accentColor =
    portalSettings?.accent_color ||
    portalSettings?.primary_color ||
    CITY_CONFIG.accentColor ||
    CITY_CONFIG.primaryColor;

  const cityName = portalSettings?.city_name || CITY_CONFIG.displayName || "Your City";
  const tagline = portalSettings?.tagline || CITY_CONFIG.tagline || "Financial Transparency Portal";
  const heroMessage = portalSettings?.hero_message || "Explore how public dollars are budgeted and spent.";

  const heroImageUrl = portalSettings?.hero_image_url || null;
  const heroBackground = portalSettings?.background_color || "#020617";
  const heroOverlay = "rgba(15, 23, 42, 0.65)";

  const fiscalYearNote = getFiscalYearPublicLabel(portalSettings);

  const hasAnyDataForSelectedYear = hasBudgetData || (enableTransactions && recentTransactions.length > 0);

  const freshnessText = useMemo(() => {
    if (!dataFreshness) return null;

    const parts: string[] = [];
    const push = (label: string, entry: FreshnessEntry | null | undefined) => {
      if (!entry || !entry.lastUploadAt) return;
      const date = formatFreshnessDate(entry.lastUploadAt);
      if (!date) return;
      parts.push(`${label}: ${date}`);
    };

    push("Budgets", dataFreshness?.budgets);
    if (enableActuals) push("Actuals", dataFreshness?.actuals);
    if (enableTransactions) push("Transactions", dataFreshness?.transactions);
    if (enableRevenues) push("Revenues", dataFreshness?.revenues);

    return parts.length ? parts.join(" · ") : null;
  }, [dataFreshness, enableActuals, enableTransactions, enableRevenues]);

  const topVendors = useMemo(() => {
    return (vendorSummaries ?? [])
      .map((v) => ({
        name: v.vendor && v.vendor.trim().length > 0 ? v.vendor.trim() : "Unspecified",
        total: Number(v.total_amount || 0),
      }))
      .filter((v) => v.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [vendorSummaries]);

  return (
    <div id="main-content" className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 sm:py-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-900 text-slate-50 shadow-lg" aria-labelledby="overview-hero-title">
        <div className="relative">
          {heroImageUrl ? (
            <div className="absolute inset-0 opacity-20" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImageUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ backgroundColor: heroOverlay }} />
            </div>
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: heroBackground }} aria-hidden="true" />
          )}

          <div className="relative grid gap-6 p-5 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] sm:p-7 lg:p-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Public financial transparency portal
              </p>
              <h1 id="overview-hero-title" className="mt-2 text-xl font-semibold leading-tight text-slate-50 sm:text-2xl">
                {cityName} Budget &amp; Spending Overview
              </h1>
              <p className="mt-1 text-sm text-slate-100/90">{tagline}</p>
              <p className="mt-2 text-xs text-slate-200/90 sm:max-w-md">{heroMessage}</p>
              {fiscalYearNote && <p className="mt-1 text-[11px] text-slate-300 sm:max-w-md">{fiscalYearNote}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={cityHref("/budget")}
                  className="inline-flex items-center justify-center rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  View budget details
                </Link>
                {enableActuals && (
                  <Link
                    href={cityHref("/departments")}
                    className="inline-flex items-center justify-center rounded-full border border-slate-100/60 bg-transparent px-3 py-1.5 text-xs font-semibold text-slate-50 shadow-sm transition hover:bg-slate-50/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    Explore departments
                  </Link>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-xl bg-slate-900/60 p-3 text-xs shadow-inner sm:p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-full bg-slate-800/80 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-200">
                  Fiscal year {yearLabel ? yearLabel : "not selected"}
                </div>
                {enableActuals && hasBudgetData && (
                  <div className="rounded-full bg-emerald-500/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-950">
                    {execPctDisplay}
                  </div>
                )}
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-950/50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Budget</div>
                  <div className="mt-1 text-sm font-semibold text-slate-50">
                    {hasBudgetData ? formatCurrency(totalBudget) : "Awaiting data"}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Govwide adopted budget for the selected fiscal year.
                  </p>
                </div>

                {enableActuals && (
                  <div className="rounded-lg bg-slate-950/50 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Spent to date</div>
                    <div className="mt-1 text-sm font-semibold text-slate-50">
                      {hasBudgetData ? formatCurrency(totalActuals) : "Awaiting data"}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Actual expenditures recorded against the budget so far.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                  <span>
                    Departments: <span className="font-semibold">{deptCount || "—"}</span>
                  </span>
                  {enableTransactions && (
                    <span>
                      Transactions: <span className="font-semibold">{txCount || "—"}</span>
                    </span>
                  )}
                </div>
                {enableActuals && hasBudgetData && (
                  <div className="text-[11px] text-slate-300">
                    <span className="font-semibold">{execPctDisplay}</span> of budget spent so far.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {!hasAnyDataForSelectedYear ? (
        <CardContainer>
          <section aria-label="No data available for selected fiscal year" className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Data not yet available for this fiscal year</h2>
            <p className="text-sm leading-relaxed text-slate-700">
              There are no budgets or published spending data loaded for{" "}
              {yearLabel ? `fiscal year ${yearLabel}` : "the selected year"}.
              Try choosing a different fiscal year from the menu above, or check back after new data is published.
            </p>
          </section>
        </CardContainer>
      ) : (
        <>
          {enableActuals && (
            <CardContainer>
              <ParadiseHomeKpiStrip
                totalBudget={totalBudget}
                totalActuals={totalActuals}
                variance={variance}
                execPct={execPct}
                deptCount={deptCount}
                txCount={txCount}
                topDepartment={topDepartment}
                accentColor={accentColor}
                enableTransactions={enableTransactions}
              />
              {freshnessText && <p className="mt-2 text-xs text-slate-600">Data last updated — {freshnessText}</p>}
            </CardContainer>
          )}

          {enableRevenues && (
            <CardContainer>
              <HomeRevenueSummary revenues={revenues} years={years} accentColor={accentColor} />
            </CardContainer>
          )}

          {enableActuals && (
            <div className="grid gap-6 lg:grid-cols-[2fr,1.3fr]">
              <CardContainer>
                <section aria-label="Budget vs Actuals by Department" className="space-y-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-800">Budget vs Actuals by Department</h2>
                      <p className="text-sm text-slate-600">
                        Top departments by budget and their corresponding spending for {yearLabel ?? "the selected year"}.
                      </p>
                    </div>
                    <Link href={cityHref("/departments")} className="mt-1 text-xs font-semibold text-slate-700 underline-offset-2 hover:underline">
                      View all departments
                    </Link>
                  </div>

                  <BudgetCharts
                    year={selectedYear ?? new Date().getFullYear()}
                    departments={departmentsForYear}
                    layout="stacked"
                  />
                </section>
              </CardContainer>

              <CardContainer>
                <section aria-labelledby="home-multiyear-heading" className="space-y-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 id="home-multiyear-heading" className="text-sm font-semibold text-slate-800">
                        Budget &amp; Spending Over Time
                      </h2>
                      <p className="text-sm text-slate-600">
                        Compare adopted budgets and actual spending across multiple fiscal years.
                      </p>
                    </div>
                    <div className="text-xs text-slate-600">
                      Showing <span className="font-semibold">{years.length} {years.length === 1 ? "year" : "years"}</span>.
                    </div>
                  </div>

                  <ParadiseHomeMultiYearChart yearTotals={yearTotals} />
                </section>
              </CardContainer>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <CardContainer>
              <SectionHeader
                title="Departments"
                eyebrow="Services"
                description={
                  enableActuals
                    ? "Compare budgets, actuals, and spending patterns across departments."
                    : "Compare adopted budgets across departments."
                }
              />
              <DepartmentsGrid year={selectedYear ?? years[0]} departments={departmentsForYear} />
            </CardContainer>

            {enableTransactions && (
              <div className="space-y-4">
                {enableVendors && (
                  <CardContainer>
                    <section aria-label="Top vendors" className="space-y-2">
                      <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-sm font-semibold text-slate-800">Top Vendors</h2>
                          <p className="text-sm text-slate-600">
                            Vendors ranked by total spending for {yearLabel ?? "the selected year"}.
                          </p>
                        </div>
                        <Link href={cityHref("/vendors")} className="text-xs font-semibold text-slate-700 underline-offset-2 hover:underline">
                          View vendors
                        </Link>
                      </div>

                      {topVendors.length === 0 ? (
                        <p className="text-sm text-slate-600">No vendor summary data available for this year.</p>
                      ) : (
                        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                          {topVendors.map((v) => (
                            <li key={v.name} className="flex items-center justify-between gap-3 px-3 py-2">
                              <span className="truncate text-sm text-slate-800">{v.name}</span>
                              <span className="whitespace-nowrap font-mono text-sm text-slate-900">
                                {formatCurrency(v.total)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </CardContainer>
                )}

                <CardContainer>
                  <RecentTransactionsCard
                    year={selectedYear ?? undefined}
                    transactions={recentTransactions}
                    enableVendors={enableVendors}
                  />
                </CardContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

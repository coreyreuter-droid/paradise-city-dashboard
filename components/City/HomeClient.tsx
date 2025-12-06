// components/City/HomeClient.tsx
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
import TopVendorsCard from "@/components/City/HomeTopVendorsCard";
import RecentTransactionsCard from "@/components/City/HomeRecentTransactionsCard";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { cityHref } from "@/lib/cityRouting";
import type { PortalSettings } from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";
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

type Props = {
  budgets: BudgetRow[];
  actuals: ActualRow[];
  transactions: TransactionRow[];
  availableYears: number[];
  portalSettings: PortalSettings | null;
  revenueTotal?: number | null;
  dataFreshness?: DataFreshnessSummary;
};

function fy(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatFreshnessDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ParadiseHomeClient({
  budgets,
  actuals,
  transactions,
  availableYears,
  portalSettings,
  revenueTotal,
  dataFreshness,
}: Props) {
  const searchParams = useSearchParams();

  // Aggregate all years we actually have data for
  const years: number[] = useMemo(() => {
    const set = new Set<number>();

    availableYears.forEach((y) => {
      const n = fy(y);
      if (n !== null) set.add(n);
    });

    budgets.forEach((b) => {
      const y = fy(b.fiscal_year);
      if (y !== null) set.add(y);
    });

    actuals.forEach((a) => {
      const y = fy(a.fiscal_year);
      if (y !== null) set.add(y);
    });

    transactions.forEach((t) => {
      const y = fy(t.fiscal_year);
      if (y !== null) set.add(y);
    });

    return Array.from(set).sort((a, b) => b - a); // newest first
  }, [availableYears, budgets, actuals, transactions]);

  const selectedYear: number | null = useMemo(() => {
    if (!years.length) return null;

    const raw = searchParams.get("year");
    if (!raw) return years[0];

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return years[0];
    if (!years.includes(parsed)) return years[0];

    return parsed;
  }, [searchParams, years]);

  const yearLabel =
    selectedYear !== null ? String(selectedYear) : null;

  const budgetsForYear = useMemo(
    () =>
      selectedYear === null
        ? budgets
        : budgets.filter((b) => b.fiscal_year === selectedYear),
    [budgets, selectedYear]
  );

  const actualsForYear = useMemo(
    () =>
      selectedYear === null
        ? actuals
        : actuals.filter((a) => a.fiscal_year === selectedYear),
    [actuals, selectedYear]
  );

  const transactionsForYear = useMemo(
    () =>
      selectedYear === null
        ? transactions
        : transactions.filter(
            (t) => t.fiscal_year === selectedYear
          ),
    [transactions, selectedYear]
  );

  const recentTransactions = useMemo(
    () => transactionsForYear.slice(0, 20),
    [transactionsForYear]
  );

  // Department-level summaries (for charts + grid)
  const departmentsForYear: DepartmentSummary[] = useMemo(() => {
    const budgetByDept = new Map<string, number>();
    const actualsByDept = new Map<string, number>();

    budgetsForYear.forEach((b) => {
      if (!b.department_name) return;
      const dept = b.department_name;
      budgetByDept.set(dept, (budgetByDept.get(dept) || 0) + b.amount);
    });

    actualsForYear.forEach((a) => {
      if (!a.department_name) return;
      const dept = a.department_name;
      const amt = a.amount || 0;
      actualsByDept.set(dept, (actualsByDept.get(dept) || 0) + amt);
    });

    const allDepts = Array.from(
      new Set([...budgetByDept.keys(), ...actualsByDept.keys()])
    );

    const rows: DepartmentSummary[] = allDepts.map((dept) => {
      const budget = budgetByDept.get(dept) || 0;
      const actual = actualsByDept.get(dept) || 0;

      const percentSpent =
        budget > 0 ? (actual / budget) * 100 : 0;

      return {
        department_name: dept,
        budget,
        actuals: actual,
        percentSpent,
      };
    });

    rows.sort((a, b) => b.budget - a.budget);
    return rows;
  }, [budgetsForYear, actualsForYear]);

  // KPI rollups
  const {
    totalBudget,
    totalActuals,
    variance,
    execPct,
    deptCount,
    txCount,
    topDepartment,
  } = useMemo(() => {
    const totalBudget = departmentsForYear.reduce(
      (sum, d) => sum + d.budget,
      0
    );
    const totalActuals = departmentsForYear.reduce(
      (sum, d) => sum + d.actuals,
      0
    );
    const variance = totalActuals - totalBudget;
    const execPct =
      totalBudget > 0 ? totalActuals / totalBudget : 0;

    const deptCount = departmentsForYear.length;
    const txCount = transactionsForYear.length;

    const topDepartment =
      departmentsForYear.length > 0
        ? departmentsForYear[0].department_name
        : null;

    return {
      totalBudget,
      totalActuals,
      variance,
      execPct,
      deptCount,
      txCount,
      topDepartment,
    };
  }, [departmentsForYear, transactionsForYear]);

  const execPctDisplay = `${Math.round(execPct * 100)}%`;
  const hasBudgetData = totalBudget > 0;

  // Branding / hero config
  const accentColor =
    portalSettings?.accent_color ||
    portalSettings?.primary_color ||
    CITY_CONFIG.accentColor ||
    CITY_CONFIG.primaryColor;

  const cityName =
    portalSettings?.city_name ||
    CITY_CONFIG.displayName ||
    "Your City";

  const tagline =
    portalSettings?.tagline ||
    CITY_CONFIG.tagline ||
    "Financial Transparency Portal";

  const heroMessage =
    portalSettings?.hero_message ||
    "Explore how public dollars are budgeted and spent.";

  const heroImageUrl = portalSettings?.hero_image_url || null;
  const heroBackground =
    portalSettings?.background_color || "#020617";
  const heroOverlay = "rgba(15, 23, 42, 0.65)";

  const hasAnyDataForSelectedYear =
    hasBudgetData || transactionsForYear.length > 0;

  // Build data freshness string
  const freshnessText = useMemo(() => {
    if (!dataFreshness) return null;

    const parts: string[] = [];

    const push = (
      label: string,
      entry: FreshnessEntry | null | undefined
    ) => {
      if (!entry || !entry.lastUploadAt) return;
      const date = formatFreshnessDate(entry.lastUploadAt);
      if (!date) return;
      parts.push(`${label}: ${date}`);
    };

    push("Budgets", dataFreshness.budgets);
    push("Actuals", dataFreshness.actuals);
    push("Transactions", dataFreshness.transactions);
    push("Revenues", dataFreshness.revenues);

    if (!parts.length) return null;
    return parts.join(" · ");
  }, [dataFreshness]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 sm:py-8">
      {/* Hero */}
      <section
        className="overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-900 text-slate-50 shadow-lg"
        aria-labelledby="overview-hero-title"
      >
        <div className="relative">
          {heroImageUrl && (
            <div
              className="absolute inset-0 opacity-20"
              aria-hidden="true"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ backgroundColor: heroOverlay }}
              />
            </div>
          )}
          {!heroImageUrl && (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: heroBackground }}
              aria-hidden="true"
            />
          )}

          <div className="relative grid gap-6 p-5 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] sm:p-7 lg:p-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Where CiviPortal was born
              </p>
              <h1
                id="overview-hero-title"
                className="mt-2 text-xl font-semibold leading-tight text-slate-50 sm:text-2xl"
              >
                {cityName} Budget &amp; Spending Overview
              </h1>
              <p className="mt-1 text-sm text-slate-100/90">
                {tagline}
              </p>
              <p className="mt-2 text-xs text-slate-200/90 sm:max-w-md">
                {heroMessage}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={cityHref("/budget")}
                  className="inline-flex items-center justify-center rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  View budget details
                </Link>
                <Link
                  href={cityHref("/departments")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-100/60 bg-transparent px-3 py-1.5 text-xs font-semibold text-slate-50 shadow-sm transition hover:bg-slate-50/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Explore departments
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-xl bg-slate-900/60 p-3 text-xs shadow-inner sm:p-4">
              <div className="flex items-center justify-between">
                <div className="rounded-full bg-slate-800/80 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-200">
                  Fiscal year{" "}
                  {yearLabel ? yearLabel : "not selected"}
                </div>
                <div className="rounded-full bg-emerald-500/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-950">
                  {hasBudgetData ? execPctDisplay : "Awaiting data"}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-950/50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Budget
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-50">
                    {hasBudgetData
                      ? formatCurrency(totalBudget)
                      : "Awaiting data"}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Citywide adopted budget for the selected
                    fiscal year.
                  </p>
                </div>

                <div className="rounded-lg bg-slate-950/50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Spent to date
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-50">
                    {hasBudgetData
                      ? formatCurrency(totalActuals)
                      : "Awaiting data"}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Actual expenditures recorded against the
                    budget so far.
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                  <span>
                    Departments:{" "}
                    <span className="font-semibold">
                      {deptCount || "—"}
                    </span>
                  </span>
                  <span>
                    Transactions:{" "}
                    <span className="font-semibold">
                      {txCount || "—"}
                    </span>
                  </span>
                </div>
                {hasBudgetData && (
                  <div className="text-[11px] text-slate-300">
                    <span className="font-semibold">
                      {execPctDisplay}
                    </span>{" "}
                    of budget spent so far.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* If no data for the selected year, show a clear empty state and bail out */}
      {!hasAnyDataForSelectedYear ? (
        <>
          <CardContainer>
            <section
              aria-label="No data available for selected fiscal year"
              className="space-y-2"
            >
              <h2 className="text-sm font-semibold text-slate-900">
                Data not yet available for this fiscal year
              </h2>
              <p className="text-sm leading-relaxed text-slate-700">
                There are no budgets, actuals, or transactions loaded for{" "}
                {yearLabel ? `fiscal year ${yearLabel}` : "the selected year"}
                . Try choosing a different fiscal year from the menu above, or
                check back after new data is published.
              </p>
            </section>
          </CardContainer>

          <div className="pb-4 pt-1 text-center text-xs text-slate-400">
            Powered by{" "}
            <span className="font-semibold text-slate-600">
              CiviPortal
            </span>
            .
          </div>
        </>
      ) : (
        <>
          {/* KPI Strip */}
          <CardContainer>
            {yearLabel && (
              <div className="mb-3 text-xs text-slate-600">
                Citywide totals for fiscal year{" "}
                <span className="font-semibold">{yearLabel}</span>.
              </div>
            )}

            <ParadiseHomeKpiStrip
              totalBudget={totalBudget}
              totalActuals={totalActuals}
              variance={variance}
              execPct={execPct}
              deptCount={deptCount}
              txCount={txCount}
              topDepartment={topDepartment}
              accentColor={accentColor}
            />

            {revenueTotal != null && revenueTotal > 0 && (
              <p className="mt-3 text-xs text-slate-600">
                Total recorded revenues for{" "}
                {yearLabel ?? "the selected year"}:{" "}
                <span className="font-semibold">
                  {formatCurrency(revenueTotal)}
                </span>
                .
              </p>
            )}

            {freshnessText && (
              <p className="mt-2 text-[11px] text-slate-500">
                Data last updated — {freshnessText}
              </p>
            )}
          </CardContainer>

          {/* Row 1: Budget vs actuals by department + multi-year chart */}
          <div className="grid gap-6 lg:grid-cols-[2fr,1.3fr]">
            <CardContainer>
              <section
                aria-label="Budget vs Actuals by Department"
                className="space-y-3"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                      Budget vs Actuals by Department
                    </h2>
                    <p className="text-xs text-slate-500">
                      Top departments by budget and their corresponding
                      spending for{" "}
                      {yearLabel ?? "the selected year"}.
                    </p>
                  </div>
                  <Link
                    href={cityHref("/departments")}
                    className="mt-1 text-xs font-semibold text-slate-700 underline-offset-2 hover:underline"
                  >
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
              <section
                aria-labelledby="home-multiyear-heading"
                className="space-y-2"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2
                      id="home-multiyear-heading"
                      className="text-sm font-semibold text-slate-800"
                    >
                      Budget &amp; Spending Over Time
                    </h2>
                    <p className="text-xs text-slate-500">
                      Compare adopted budgets and actual spending across
                      multiple fiscal years.
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-semibold">
                      {years.length}{" "}
                      {years.length === 1 ? "year" : "years"}
                    </span>
                    .
                  </div>
                </div>

                <ParadiseHomeMultiYearChart
                  budgets={budgets}
                  actuals={actuals}
                />
              </section>
            </CardContainer>
          </div>

          {/* Row 2: Departments grid + vendors / transactions */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <CardContainer>
              <SectionHeader
                title="Departments"
                eyebrow="City services"
                description="Compare budgets, actuals, and spending patterns across departments."
              />
              <DepartmentsGrid
                year={selectedYear ?? years[0]}
                departments={departmentsForYear}
              />
            </CardContainer>

            <div className="space-y-4">
              <CardContainer>
                <TopVendorsCard transactions={transactionsForYear} />
              </CardContainer>
              <CardContainer>
                <RecentTransactionsCard
                  transactions={recentTransactions}
                />
              </CardContainer>
            </div>
          </div>

          <div className="pb-4 pt-1 text-center text-xs text-slate-400">
            Powered by{" "}
            <span className="font-semibold text-slate-600">
              CiviPortal
            </span>
            {" · "}
            <span className="text-slate-500">
              {cityName} –{" "}
              {totalBudget > 0
                ? `Managing ${formatCurrency(
                    totalBudget
                  )} in adopted budget`
                : "Awaiting budget data"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

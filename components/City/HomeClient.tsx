// components/City/ParadiseHomeClient.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CardContainer from "@/components/CardContainer";
import BudgetCharts from "@/components/Budget/BudgetCharts";
import type { DepartmentSummary } from "@/components/Budget/BudgetClient";
import SectionHeader from "@/components/SectionHeader";
import FiscalYearSelect from "@/components/FiscalYearSelect";
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

type Props = {
  budgets: BudgetRow[];
  actuals: ActualRow[];
  transactions: TransactionRow[];
  availableYears: number[];
  portalSettings: PortalSettings | null;
};

function safeYear(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function ParadiseHomeClient({
  budgets,
  actuals,
  transactions,
  availableYears,
  portalSettings,
}: Props) {
  const searchParams = useSearchParams();

  // Canonical list of fiscal years
  const years = useMemo(() => {
    const set = new Set<number>();

    availableYears.forEach((y) => {
      const n = Number(y);
      if (Number.isFinite(n)) set.add(n);
    });

    budgets.forEach((b) => {
      const y = safeYear(b.fiscal_year);
      if (y !== null) set.add(y);
    });

    actuals.forEach((a) => {
      const y = safeYear(a.fiscal_year);
      if (y !== null) set.add(y);
    });

    transactions.forEach((t) => {
      const y = safeYear(t.fiscal_year);
      if (y !== null) set.add(y);
    });

    return Array.from(set).sort((a, b) => b - a);
  }, [availableYears, budgets, actuals, transactions]);

  const selectedYear: number | null = useMemo(() => {
    if (!years.length) return null;

    const param = searchParams.get("year");
    if (!param) return years[0];

    const parsed = Number(param);
    if (!Number.isFinite(parsed)) return years[0];

    if (years.includes(parsed)) return parsed;
    return years[0];
  }, [searchParams, years]);

  const yearLabel = selectedYear ?? (years.length > 0 ? years[0] : undefined);

  // Year-scoped slices
  const budgetsForYear = useMemo(
    () =>
      selectedYear != null
        ? budgets.filter(
            (b) => safeYear(b.fiscal_year) === selectedYear
          )
        : [],
    [budgets, selectedYear]
  );

  const actualsForYear = useMemo(
    () =>
      selectedYear != null
        ? actuals.filter(
            (a) => safeYear(a.fiscal_year) === selectedYear
          )
        : [],
    [actuals, selectedYear]
  );

  const txForYear = useMemo(
    () =>
      selectedYear != null
        ? transactions.filter(
            (t) => safeYear(t.fiscal_year) === selectedYear
          )
        : [],
    [transactions, selectedYear]
  );

  // Aggregate per-department for this year
  const departmentsForYear: DepartmentSummary[] = useMemo(() => {
    if (!selectedYear) return [];

    const budgetByDept = new Map<string, number>();
    const actualsByDept = new Map<string, number>();

    budgetsForYear.forEach((row) => {
      const dept = row.department_name || "Unspecified";
      const amt = Number(row.amount || 0);
      budgetByDept.set(
        dept,
        (budgetByDept.get(dept) || 0) + amt
      );
    });

    actualsForYear.forEach((row) => {
      const dept = row.department_name || "Unspecified";
      const amt = Number(row.amount || 0);
      actualsByDept.set(
        dept,
        (actualsByDept.get(dept) || 0) + amt
      );
    });

    const allDepts = Array.from(
      new Set([
        ...budgetByDept.keys(),
        ...actualsByDept.keys(),
      ])
    );

    const rows: DepartmentSummary[] = allDepts.map((dept) => {
      const budget = budgetByDept.get(dept) || 0;
      const actuals = actualsByDept.get(dept) || 0;
      const percentSpent =
        budget === 0 ? 0 : (actuals / budget) * 100;

      return {
        department_name: dept,
        budget,
        actuals,
        percentSpent,
      };
    });

    rows.sort((a, b) => b.budget - a.budget);
    return rows;
  }, [budgetsForYear, actualsForYear, selectedYear]);

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
      totalBudget === 0
        ? 0
        : Math.min((totalActuals / totalBudget) * 100, 999);

    const deptCount = departmentsForYear.length;
    const txCount = txForYear.length;

    let topDepartment: string | null = null;
    if (departmentsForYear.length > 0) {
      const sorted = [...departmentsForYear].sort(
        (a, b) => b.actuals - a.actuals
      );
      topDepartment = sorted[0].department_name;
    }

    return {
      totalBudget,
      totalActuals,
      variance,
      execPct,
      deptCount,
      txCount,
      topDepartment,
    };
  }, [departmentsForYear, txForYear]);

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

  const logoUrl = portalSettings?.logo_url || null;
  const heroImageUrl =
    portalSettings?.hero_image_url || null;
  const sealUrl = portalSettings?.seal_url || null;

  const heroBackground = "#0f172a";
  const heroOverlay = "rgba(15,23,42,0.85)";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 sm:py-8">
        {/* HERO */}
        <section
          aria-label={`${cityName} financial transparency introduction`}
          className="relative overflow-hidden rounded-2xl border border-slate-800/40 bg-slate-900 px-4 py-6 shadow-sm sm:px-6 sm:py-8 md:px-8 md:py-10"
          style={{ backgroundColor: heroBackground }}
        >
          {heroImageUrl && (
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              aria-hidden="true"
            >
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

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {/* Left: text + CTAs */}
            <div className="max-w-xl text-slate-50">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                {tagline}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {cityName} Financial Transparency
              </h1>
              <p className="mt-2 text-sm text-slate-100/80">
                {heroMessage}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={cityHref("/budget")}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  View budget details
                </Link>
                <Link
                  href={cityHref("/departments")}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Explore departments
                </Link>
                <Link
                  href={cityHref("/transactions")}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Search transactions
                </Link>
              </div>
            </div>

            {/* Right: logo / seal / quick stats */}
            <div className="flex flex-col items-end gap-4">
              <div className="flex items-center gap-3">
                {sealUrl && (
                  <img
                    src={sealUrl}
                    alt={`${cityName} seal`}
                    className="h-12 w-12 rounded-full border border-slate-700 bg-slate-900/60 object-contain p-1"
                  />
                )}
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={`${cityName} logo`}
                    className="h-10 max-w-[160px] object-contain"
                  />
                )}
              </div>

              <div className="rounded-lg bg-slate-900/60 px-3 py-2 text-right text-[11px] text-slate-200 shadow-sm">
                <div className="font-semibold">
                  {yearLabel
                    ? `Fiscal year ${yearLabel}`
                    : "Latest fiscal year"}
                </div>
                <div className="mt-1">
                  Managing{" "}
                  <span className="font-semibold">
                    {formatCurrency(totalBudget)}
                  </span>{" "}
                  in adopted budget.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Snapshot header */}
        <SectionHeader
          eyebrow="Overview"
          title="Budget & Spending Snapshot"
          description="Citywide totals, department comparisons, year-over-year trends, and recent transactions for the selected fiscal year."
          rightSlot={
            years.length > 0 ? (
              <FiscalYearSelect
                options={years}
                label="Fiscal year"
              />
            ) : null
          }
        />

        {/* KPI Strip */}
        <CardContainer>
          {yearLabel && (
            <div className="mb-3 text-xs text-slate-600">
              Citywide totals for fiscal year{" "}
              <span className="font-semibold">
                {yearLabel}
              </span>
              .
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
                    Top departments by budget and their
                    corresponding spending for{" "}
                    {yearLabel ?? "the selected year"}.
                  </p>
                </div>
              </div>

              <BudgetCharts
                year={yearLabel ?? new Date().getFullYear()}
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
              <h2
                id="home-multiyear-heading"
                className="text-sm font-semibold text-slate-800"
              >
                Multi-year Budget vs Actuals
              </h2>
              <p className="text-xs text-slate-500">
                Citywide budget and actual spending across
                recent fiscal years.
              </p>
              <ParadiseHomeMultiYearChart
                budgets={budgets}
                actuals={actuals}
              />
            </section>
          </CardContainer>
        </div>

        {/* Row 2: recent transactions + departments + vendors */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr,1.6fr]">
          <CardContainer>
            <RecentTransactionsCard
              year={yearLabel ?? undefined}
              transactions={txForYear}
              limit={6}
            />
          </CardContainer>

          <CardContainer>
            <div className="space-y-4">
              <DepartmentsGrid
                year={yearLabel ?? undefined}
                departments={departmentsForYear}
              />
              <TopVendorsCard
                year={yearLabel ?? undefined}
                transactions={txForYear}
              />
            </div>
          </CardContainer>
        </div>

        {/* Footer */}
        <div className="pb-4 pt-1 text-center text-[11px] text-slate-400">
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
      </div>
    </div>
  );
}

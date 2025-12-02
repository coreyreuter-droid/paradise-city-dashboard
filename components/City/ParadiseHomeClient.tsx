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
import ParadiseHomeKpiStrip from "@/components/City/ParadiseHomeKpiStrip";
import ParadiseHomeMultiYearChart from "@/components/City/ParadiseHomeMultiYearChart";
import DepartmentsGrid from "@/components/City/ParadiseHomeDepartmentsGrid";
import TopVendorsCard from "@/components/City/ParadiseHomeTopVendorsCard";
import RecentTransactionsCard from "@/components/City/ParadiseHomeRecentTransactionsCard";
import { CITY_CONFIG } from "@/lib/cityConfig";
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

  // Selected year via ?year= or default to most recent
  const selectedYear = useMemo(() => {
    if (!years || years.length === 0) return undefined;
    const param = searchParams.get("year");
    if (!param) return years[0];

    const parsed = Number(param);
    if (!Number.isFinite(parsed)) return years[0];
    if (years.includes(parsed)) return parsed;
    return years[0];
  }, [searchParams, years]);

  const yearLabel =
    selectedYear ?? (years.length > 0 ? years[0] : undefined);

  // Filter to selected year
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
        : (totalActuals / totalBudget) * 100;

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
    portalSettings?.primary_color ||
    portalSettings?.accent_color ||
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
      <div className="mx-auto max-w-6xl px-3 py-6 space-y-6 sm:px-4 sm:py-8">
        {/* HERO */}
        <section
          className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10"
          style={{ backgroundColor: heroBackground }}
        >
          {heroImageUrl && (
            <div className="pointer-events-none absolute inset-0 opacity-25">
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

              {yearLabel && (
                <p className="mt-1 text-xs text-slate-200/80">
                  Showing data for fiscal year{" "}
                  <span className="font-semibold">
                    {yearLabel}
                  </span>
                  .
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/paradise/analytics"
                  className="inline-flex items-center justify-center rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-wide shadow-sm hover:opacity-90"
                  style={{
                    backgroundColor: accentColor,
                    color: "#ffffff",
                  }}
                >
                  View analytics
                </Link>
                <Link
                  href="/paradise/budget"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-white"
                >
                  View budget
                </Link>
                <Link
                  href="/paradise/departments"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-white"
                >
                  Departments
                </Link>
                <Link
                  href="/paradise/transactions"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-white"
                >
                  Transactions
                </Link>
              </div>
            </div>

            {/* Right: logo/seal + FY select */}
            <div className="flex w-full max-w-xs flex-col items-end gap-3 md:w-auto">
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <div className="flex h-12 w-20 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 shadow-sm">
                    <img
                      src={logoUrl}
                      alt={`${cityName} logo`}
                      className="max-h-10 max-w-full object-contain"
                    />
                  </div>
                )}
                {sealUrl && (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white shadow-sm">
                    <img
                      src={sealUrl}
                      alt={`${cityName} seal`}
                      className="h-10 w-10 rounded-full object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-white/95 px-3 py-2 text-xs text-slate-800 shadow-sm">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Fiscal year
                </div>
                {years.length > 0 ? (
                  <FiscalYearSelect
                    options={years}
                    label="Fiscal year"
                  />
                ) : (
                  <div className="text-[11px] text-slate-500">
                    No years available
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SNAPSHOT HEADER */}
        <SectionHeader
          as="h2"
          eyebrow="Overview"
          title="Budget & spending snapshot"
          description="Citywide totals, department comparison, multi-year trends, and recent transactions for the selected fiscal year."
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
            accentColor={accentColor || undefined}
          />
        </CardContainer>

        {/* Row 1: Budget vs actuals by department + multi-year chart */}
        <div className="mt-2 grid gap-6 lg:grid-cols-[2fr,1.3fr]">
          <CardContainer>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Budget vs actuals by department
                </h3>
                <p className="text-xs text-slate-500">
                  Top departments by budget and their corresponding spending for{" "}
                  {yearLabel ?? "the selected year"}.
                </p>
              </div>
            </div>
            <BudgetCharts
              year={yearLabel ?? new Date().getFullYear()}
              departments={departmentsForYear}
            />
          </CardContainer>

          <CardContainer>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Multi-year budget vs actuals
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              Citywide budget and actual spending across recent fiscal years.
            </p>
            <ParadiseHomeMultiYearChart
              budgets={budgets}
              actuals={actuals}
            />
          </CardContainer>
        </div>

        {/* Row 2: Recent transactions + departments snapshot + top vendors */}
        <div className="mt-2 grid gap-6 lg:grid-cols-[2fr,1.3fr]">
          <CardContainer>
            <RecentTransactionsCard
              year={yearLabel}
              transactions={txForYear}
            />
          </CardContainer>

          <CardContainer>
            <div className="space-y-4">
              <DepartmentsGrid
                year={yearLabel}
                departments={departmentsForYear}
              />
              <TopVendorsCard
                year={yearLabel}
                transactions={txForYear}
              />
            </div>
          </CardContainer>
        </div>

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

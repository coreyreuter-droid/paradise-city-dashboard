// components/City/HomeClient.tsx
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
import type { BudgetRow, ActualRow, TransactionRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type Props = {
  budgets: BudgetRow[];
  actuals: ActualRow[];
  transactions: TransactionRow[];
  availableYears: number[];
  portalSettings: PortalSettings | null;
};

function fy(value: unknown): number | null {
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
    selectedYear ?? (years.length > 0 ? years[0] : undefined);

  // Year-scoped slices
  const budgetsForYear = useMemo(
    () =>
      selectedYear != null
        ? budgets.filter((b) => b.fiscal_year === selectedYear)
        : budgets,
    [budgets, selectedYear]
  );

  const actualsForYear = useMemo(
    () =>
      selectedYear != null
        ? actuals.filter((a) => a.fiscal_year === selectedYear)
        : actuals,
    [actuals, selectedYear]
  );

  const txForYear = useMemo(
    () =>
      selectedYear != null
        ? transactions.filter((t) => t.fiscal_year === selectedYear)
        : transactions,
    [transactions, selectedYear]
  );

  // Department summaries
  const departmentsForYear: DepartmentSummary[] = useMemo(() => {
    const budgetByDept = new Map<string, number>();
    const actualsByDept = new Map<string, number>();

    budgetsForYear.forEach((b) => {
      const dept = b.department_name || "Uncategorized";
      const amt = b.amount || 0;
      budgetByDept.set(dept, (budgetByDept.get(dept) || 0) + amt);
    });

    actualsForYear.forEach((a) => {
      const dept = a.department_name || "Uncategorized";
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
        budget === 0 ? 0 : Math.max(0, Math.min(1, actual / budget));

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
      totalBudget === 0
        ? 0
        : Math.max(0, Math.min(1, totalActuals / totalBudget));

    const deptCount = departmentsForYear.length;
    const txCount = txForYear.length;

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
  }, [departmentsForYear, txForYear]);

  const execPctDisplay = `${Math.round(execPct * 100)}%`;

  // Branding / hero config
  const accentColor =
    portalSettings?.accent_color ||
    portalSettings?.primary_color ||
    CITY_CONFIG.accentColor ||
    CITY_CONFIG.primaryColor;

  const cityName =
    portalSettings?.city_name || CITY_CONFIG.displayName || "Your City";

  const tagline =
    portalSettings?.tagline ||
    CITY_CONFIG.tagline ||
    "Financial Transparency Portal";

  const heroMessage =
    portalSettings?.hero_message ||
    "Explore how public dollars are budgeted and spent.";

  const heroImageUrl = portalSettings?.hero_image_url || null;
  const heroBackground =
    portalSettings?.background_color || "#020617"; // slate-950-ish fallback
  const heroOverlay = "rgba(15, 23, 42, 0.65)"; // slate-900/65

  const hasBudgetData = totalBudget > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 sm:py-8">
      {/* HERO */}
      <section
        aria-label={`${cityName} financial transparency introduction`}
        className="relative overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-900 px-4 py-6 text-slate-50 shadow-sm sm:px-6 sm:py-8 md:px-8 md:py-10"
        style={{ backgroundColor: heroBackground }}
      >
        {heroImageUrl && (
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
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

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Left: text + CTAs */}
          <div className="max-w-xl text-slate-50">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {tagline}
            </p>
            <h1 className="mt-2 text-xl font-semibold sm:text-2xl">
              {cityName} Budget &amp; Spending Overview
            </h1>
            <p className="mt-2 text-sm text-slate-100/80">
              {heroMessage}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={cityHref("/budget")}
                className="inline-flex items-center justify-center rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                View budget details
              </Link>
            <Link
                href={cityHref("/departments")}
                className="inline-flex items-center justify-center rounded-full border border-slate-300/60 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Explore departments
              </Link>
            </div>
          </div>

          {/* Right: summarized year snapshot */}
          <div className="flex w-full max-w-xs flex-col gap-3 text-xs text-slate-100 md:items-end">
            <div className="rounded-lg bg-slate-900/60 px-3 py-2 text-xs text-slate-200 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  {yearLabel
                    ? `Fiscal year ${yearLabel}`
                    : "Latest fiscal year"}
                </span>
                {hasBudgetData && (
                  <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                    {execPctDisplay} spent
                  </span>
                )}
              </div>
              {hasBudgetData ? (
                <div className="mt-1 space-y-0.5">
                  <p>
                    Budget:&nbsp;
                    <span className="font-semibold">
                      {formatCurrency(totalBudget)}
                    </span>
                  </p>
                  <p>
                    Spent to date:&nbsp;
                    <span className="font-semibold">
                      {formatCurrency(totalActuals)}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-slate-300/80">
                  Waiting for budget data to be uploaded.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-200">
              <div className="rounded-md bg-slate-900/60 px-2 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Departments
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-50">
                  {deptCount}
                </p>
              </div>
              <div className="rounded-md bg-slate-900/60 px-2 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Transactions
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-50">
                  {txCount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Snapshot header */}
      <SectionHeader
        eyebrow="Overview"
        title="Budget & Spending Snapshot"
        description="Citywide totals, department comparisons, trends, and recent transactions for the selected fiscal year."
        accentColor={accentColor}
        rightSlot={
          years.length > 0 ? (
            <FiscalYearSelect options={years} label="Fiscal year" />
          ) : null
        }
      />

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
                  Top departments by budget and their corresponding spending
                  for{" "}
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
              Citywide budget and actual spending across recent fiscal years.
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
    </div>
  );
}

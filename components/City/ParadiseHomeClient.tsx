// components/City/ParadiseHomeClient.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CardContainer from "@/components/CardContainer";
import BudgetCharts from "@/components/Budget/BudgetCharts";
import type { DepartmentSummary } from "@/components/Budget/BudgetClient";
import type { PortalSettings } from "@/lib/queries";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";
import KpiStrip from "@/components/City/ParadiseHomeKpiStrip";
import TopVendorsCard from "@/components/City/ParadiseHomeTopVendorsCard";
import RecentTransactionsCard from "@/components/City/ParadiseHomeRecentTransactionsCard";
import DepartmentsGrid from "@/components/City/ParadiseHomeDepartmentsGrid";
import MultiYearBudgetActualsChart from "@/components/City/ParadiseHomeMultiYearChart";
import FiscalYearSelect from "@/components/FiscalYearSelect";

type Props = {
  budgets: BudgetRow[];
  actuals: ActualRow[];
  transactions: TransactionRow[];
  availableYears: number[];
  portalSettings: PortalSettings | null;
};

function toYear(v: unknown): number | null {
  const n = Number(v);
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

  const years = useMemo(() => {
    const set = new Set<number>();
    availableYears.forEach((y) => {
      if (Number.isFinite(y)) set.add(y);
    });
    budgets.forEach((b) => {
      const y = toYear(b.fiscal_year);
      if (y !== null) set.add(y);
    });
    actuals.forEach((a) => {
      const y = toYear(a.fiscal_year);
      if (y !== null) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [availableYears, budgets, actuals]);

  const selectedYear = useMemo(() => {
    if (years.length === 0) return undefined;
    const param = searchParams.get("year");
    const parsed = param ? Number(param) : NaN;
    if (Number.isFinite(parsed) && years.includes(parsed)) {
      return parsed;
    }
    return years[0]; // latest year by default
  }, [searchParams, years]);

  const budgetsForYear = useMemo(
    () =>
      selectedYear
        ? budgets.filter(
            (b) => toYear(b.fiscal_year) === selectedYear
          )
        : [],
    [budgets, selectedYear]
  );

  const actualsForYear = useMemo(
    () =>
      selectedYear
        ? actuals.filter(
            (a) => toYear(a.fiscal_year) === selectedYear
          )
        : [],
    [actuals, selectedYear]
  );

  const transactionsForYear = useMemo(
    () =>
      selectedYear
        ? transactions.filter(
            (t) => toYear(t.fiscal_year) === selectedYear
          )
        : [],
    [transactions, selectedYear]
  );

  // Department-level summary (same idea as BudgetClient)
  const departments: DepartmentSummary[] = useMemo(() => {
    if (!selectedYear) return [];

    const budgetByDept = new Map<string, number>();
    budgetsForYear.forEach((row) => {
      const dept = row.department_name || "Unspecified";
      const amt = Number(row.amount || 0);
      budgetByDept.set(
        dept,
        (budgetByDept.get(dept) || 0) + amt
      );
    });

    const actualsByDept = new Map<string, number>();
    actualsForYear.forEach((row) => {
      const dept = row.department_name || "Unspecified";
      const amt = Number(row.amount || 0);
      actualsByDept.set(
        dept,
        (actualsByDept.get(dept) || 0) + amt
      );
    });

    const rows: DepartmentSummary[] = Array.from(
      new Set([
        ...budgetByDept.keys(),
        ...actualsByDept.keys(),
      ])
    ).map((dept) => {
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
  }, [budgetsForYear, actualsForYear, selectedYear]);

  const totalBudget = departments.reduce(
    (sum, d) => sum + d.budget,
    0
  );
  const totalActuals = departments.reduce(
    (sum, d) => sum + d.actuals,
    0
  );
  const variance = totalBudget - totalActuals;
  const execPct =
    totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;
  const deptCount = departments.length;
  const txCount = transactionsForYear.length;

  const topDepartment =
    departments.length > 0
      ? departments[0].department_name || "Unspecified"
      : null;

  const yearLabel =
    selectedYear ??
    (years.length > 0 ? years[0] : undefined);

  // Branding
  const cityName =
    portalSettings?.city_name ?? "Paradise City";
  const tagline =
    portalSettings?.tagline ??
    "Financial transparency portal";
  const heroMessage =
    portalSettings?.hero_message ??
    "Explore how public dollars are budgeted and spent across departments, vendors, and programs.";

  const primaryColor =
    portalSettings?.primary_color ?? "#0f172a"; // slate-900
  const accentColor =
    portalSettings?.accent_color ?? "#0ea5e9"; // sky-500
  const backgroundColor =
    portalSettings?.background_color ?? "#020617"; // slate-950
  const heroImageUrl = portalSettings?.hero_image_url ?? null;

  const heroGradient = {
    backgroundImage: `linear-gradient(135deg, ${backgroundColor} 0%, ${primaryColor} 45%, ${accentColor} 100%)`,
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Hero / branding section */}
        <section
          className="relative overflow-hidden rounded-2xl border border-slate-200 text-slate-50 shadow-sm px-6 py-8 sm:px-8 sm:py-10"
          style={heroGradient}
        >
          {heroImageUrl && (
            <div className="pointer-events-none absolute inset-0 opacity-35">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImageUrl}
                alt=""
                className="h-full w-full object-cover mix-blend-soft-light"
              />
            </div>
          )}

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {/* Left: text + CTAs */}
            <div className="max-w-xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {tagline}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight drop-shadow-sm">
                {cityName}{" "}
                <span className="font-normal text-slate-200">
                  Financial Transparency
                </span>
              </h1>
              <p className="text-sm text-slate-100/80">
                {heroMessage}
              </p>
              {yearLabel && (
                <p className="text-xs text-slate-200/80">
                  Showing data for fiscal year{" "}
                  <span className="font-semibold">
                    {yearLabel}
                  </span>
                  . Use the tools below to explore the city’s
                  budget, spending, and transactions.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/paradise/analytics"
                  className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-900 shadow-sm hover:opacity-90 transition"
                  style={{ backgroundColor: accentColor }}
                >
                  View analytics
                </Link>
                <Link
                  href="/paradise/budget"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200/70 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 backdrop-blur hover:bg-white/15"
                >
                  View budget
                </Link>
                <Link
                  href="/paradise/departments"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200/70 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 backdrop-blur hover:bg-white/15"
                >
                  Departments
                </Link>
                <Link
                  href="/paradise/transactions"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200/70 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 backdrop-blur hover:bg-white/15"
                >
                  Transactions
                </Link>
              </div>
            </div>

            {/* Right: logo + year selector */}
            <div className="flex w-full max-w-xs flex-col items-end gap-4 md:w-auto">
              {portalSettings?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <div className="flex h-20 w-36 items-center justify-center rounded-xl border border-white/30 bg-white/90 px-4 shadow-sm backdrop-blur">
                  <img
                    src={portalSettings.logo_url}
                    alt={`${cityName} logo`}
                    className="max-h-16 max-w-full object-contain"
                  />
                </div>
              )}

              {years.length > 0 && (
                <div className="w-36">
                  <FiscalYearSelect
                    options={years}
                    label="Fiscal year"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* KPIs */}
        <CardContainer>
          <div className="space-y-3">
            <KpiStrip
              totalBudget={totalBudget}
              totalActuals={totalActuals}
              variance={variance}
              execPct={execPct}
              deptCount={deptCount}
              txCount={txCount}
              topDepartment={topDepartment}
              accentColor={accentColor}
              yearLabel={yearLabel}
            />
            {yearLabel && (
              <p className="text-xs text-slate-500">
                Citywide totals for fiscal year{" "}
                <span className="font-semibold">
                  {yearLabel}
                </span>
                .
              </p>
            )}
          </div>
        </CardContainer>

        {/* Hero charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <CardContainer>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Budget vs actuals by department
              </h2>
              <p className="text-xs text-slate-500">
                Top departments by budget and their corresponding
                actual spending for the selected fiscal year.
              </p>
              <BudgetCharts
                year={yearLabel ?? new Date().getFullYear()}
                departments={departments}
              />
            </div>
          </CardContainer>

          <CardContainer>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Multi-year budget vs actuals
              </h2>
              <p className="text-xs text-slate-500">
                Total citywide budget and actuals across recent
                fiscal years.
              </p>
              <MultiYearBudgetActualsChart
                years={years}
                budgets={budgets}
                actuals={actuals}
              />
            </div>
          </CardContainer>
        </div>

        {/* Departments grid + Vendors + Recent transactions */}
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <CardContainer>
              <DepartmentsGrid
                year={yearLabel}
                departments={departments}
              />
            </CardContainer>
          </div>

          <div className="space-y-4">
            <CardContainer>
              <TopVendorsCard
                year={yearLabel}
                transactions={transactionsForYear}
              />
            </CardContainer>
            <CardContainer>
              <RecentTransactionsCard
                year={yearLabel}
                transactions={transactionsForYear}
              />
            </CardContainer>
          </div>
        </div>

        {/* City / portal info card */}
        <CardContainer>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">
              About this financial transparency portal
            </h2>
            <p className="text-xs text-slate-500">
              This site provides a public view into the city’s
              adopted budget, actual spending, and
              transaction-level detail. Use the navigation links
              above to drill into analytics, department-level
              budgets, and individual transactions.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              <li>
                • <span className="font-semibold">Budget</span>{" "}
                shows adopted amounts by department and how they
                compare to actual spending.
              </li>
              <li>
                • <span className="font-semibold">Analytics</span>{" "}
                provides citywide charts, trends, and breakdowns by
                department, category, and vendor.
              </li>
              <li>
                •{" "}
                <span className="font-semibold">
                  Departments
                </span>{" "}
                lets you see multi-year trends and detailed
                transactions for a single department.
              </li>
              <li>
                •{" "}
                <span className="font-semibold">
                  Transactions
                </span>{" "}
                is a searchable list of individual expenses
                filtered by year, department, and vendor.
              </li>
            </ul>
            <p className="mt-2 text-[11px] text-slate-500">
              Dollar amounts are rounded for display. Some values
              may not include pending or future-dated
              transactions. For questions about the data, please
              contact the city’s finance office.
            </p>
          </div>
        </CardContainer>
      </div>
    </main>
  );
}

// components/City/ParadiseHomeClient.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import SectionHeader from "@/components/SectionHeader";
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
import ParadiseSettingsMenu from "@/components/City/ParadiseSettingsMenu";

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
  const variance = totalActuals - totalBudget;
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
  const heroMessage =
    portalSettings?.hero_message ??
    "High-level view of Paradise’s budget, spending, and activity. Use this page to quickly understand where money comes from and where it goes.";

  // Colors available for future theming:
  const primaryColor =
    portalSettings?.primary_color ?? "#0f172a";
  const accentColor =
    portalSettings?.accent_color ?? "#0ea5e9";
  // background_color etc. also available on portalSettings

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header with branding + gear icon */}
        <div className="flex items-start justify-between gap-4">
          <div
            className="flex-1 border-b pb-4"
            style={{ borderBottom: `2px solid ${accentColor}` }}
          >
            <SectionHeader
              title={`${cityName} – Financial Overview`}
              description={heroMessage}
            />
          </div>
          <div className="flex items-center gap-3">
            {portalSettings?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={portalSettings.logo_url}
                alt={`${cityName} logo`}
                className="h-12 w-auto rounded bg-white p-1 shadow-sm"
              />
            )}
            <ParadiseSettingsMenu />
          </div>
        </div>


        {/* Filters + KPIs */}
        <CardContainer>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xs">
                {years.length > 0 && (
                  <FiscalYearSelect
                    options={years}
                    label="Fiscal year"
                  />
                )}
              </div>
              {yearLabel && (
                <div className="text-xs text-slate-500 md:text-right">
                  Showing citywide data for fiscal year{" "}
                  <span className="font-semibold">
                    {yearLabel}
                  </span>
                  .
                </div>
              )}
            </div>

            <KpiStrip
              totalBudget={totalBudget}
              totalActuals={totalActuals}
              variance={variance}
              execPct={execPct}
              deptCount={deptCount}
              txCount={txCount}
              topDepartment={topDepartment}
              accentColor={accentColor}
            />

          </div>
        </CardContainer>

        {/* Hero charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <CardContainer>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Budget vs Actuals by Department
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
                Multi-Year Budget vs Actuals
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
          <div className="xl:col-span-2 space-y-4">
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
      </div>
    </main>
  );
}

"use client";

import { useMemo } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import CardContainer from "@/components/CardContainer";
import SectionHeader from "@/components/SectionHeader";
import FiscalYearSelect from "@/components/FiscalYearSelect";
import BudgetExplorer from "@/components/Budget/BudgetExplorer";
import AmendedComparison from "@/components/Budget/AmendedComparison";
import NarrativeSummary from "@/components/NarrativeSummary";
import { buildBudgetNarrative } from "@/lib/narrativeHelpers";
import { cityHref } from "@/lib/cityRouting";
import { CITY_CONFIG } from "@/lib/cityConfig";
import type {
  BudgetActualsYearDeptRow,
  BudgetActualsYearFundRow,
  BudgetActualsYearFundDeptRow,
  AdoptedVsAmendedRow,
} from "@/lib/queries";
import Link from "next/link";

/* =============================================================================
   Types
============================================================================= */

type BudgetSubTab = "adopted" | "bva";

type Props = {
  /** All available budget years */
  budgetYears: number[];
  /** Years with both budget AND actuals */
  bvaYears: number[];
  /** Department-level rollup for selected year */
  deptBudgetActuals: BudgetActualsYearDeptRow[];
  /** Fund-level rollup for selected year */
  fundSummary: BudgetActualsYearFundRow[];
  /** Fund × Department rollup for selected year */
  fundDeptSummary: BudgetActualsYearFundDeptRow[];
  /** Population from portal settings (numeric) */
  population?: number | null;
  /** Accent color */
  accentColor?: string;
  /** Whether actuals exist for the currently selected year */
  hasActualsForSelectedYear?: boolean;
  /** Whether transactions module is enabled */
  enableTransactions?: boolean;
  /** Adopted vs amended comparison rows (empty if no amendments) */
  amendedComparison?: AdoptedVsAmendedRow[];
};

/* =============================================================================
   Component
============================================================================= */

export default function BudgetPageClient({
  budgetYears,
  bvaYears,
  deptBudgetActuals,
  fundSummary,
  fundDeptSummary,
  population,
  accentColor,
  hasActualsForSelectedYear = false,
  enableTransactions = false,
  amendedComparison = [],
}: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Tab is URL-driven via ?view= param — shareable and bookmarkable
  const activeTab: BudgetSubTab = useMemo(() => {
    const param = searchParams.get("view");
    if (param === "bva" && bvaYears.length > 0) return "bva";
    return "adopted";
  }, [searchParams, bvaYears]);

  // Switch tab by updating URL (preserves year if valid for new tab)
  const switchTab = (tab: BudgetSubTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "adopted") {
      params.delete("view");
    } else {
      params.set("view", "bva");
    }
    // If current year isn't valid for the new tab, drop it so it falls to default
    const currentYear = params.get("year");
    const targetYears = tab === "bva" ? bvaYears : budgetYears;
    if (currentYear && !targetYears.includes(Number(currentYear))) {
      params.delete("year");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // Which years to show depends on tab
  const yearsForTab = activeTab === "bva" ? bvaYears : budgetYears;

  const selectedYear = useMemo(() => {
    if (!yearsForTab.length) return null;
    const raw = searchParams.get("year");
    if (!raw) return yearsForTab[0];
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return yearsForTab[0];
    if (!yearsForTab.includes(parsed)) return yearsForTab[0];
    return parsed;
  }, [searchParams, yearsForTab]);

  // Department summaries for narrative
  const departments = useMemo(() => {
    return (deptBudgetActuals ?? []).map((r) => {
      const budget = Number(r.budget_amount || 0);
      const actuals = Number(r.actual_amount || 0);
      return {
        department_name: r.department_name || "Unspecified",
        budget,
        actuals,
        percentSpent: budget > 0 ? (actuals / budget) * 100 : 0,
      };
    }).sort((a, b) => b.budget - a.budget);
  }, [deptBudgetActuals]);

  const totals = useMemo(() => {
    const budget = departments.reduce((s, d) => s + d.budget, 0);
    const actuals = departments.reduce((s, d) => s + d.actuals, 0);
    return { budget, actuals };
  }, [departments]);

  // Build narrative
  const narrative = useMemo(() => {
    const cityName = CITY_CONFIG.displayName || "This organization";
    const topDept = departments[0];
    const topDeptPct =
      totals.budget > 0 ? (topDept?.budget / totals.budget) * 100 : 0;

    const overBudgetDepts = departments
      .filter((d) => d.percentSpent > 100)
      .sort((a, b) => b.percentSpent - a.percentSpent)
      .map((d) => ({ name: d.department_name, pct: d.percentSpent }));

    const showActuals = activeTab === "bva" && hasActualsForSelectedYear;

    return buildBudgetNarrative({
      cityName,
      year: selectedYear,
      totalBudget: totals.budget,
      totalActuals: totals.actuals,
      execPct: totals.budget > 0 ? totals.actuals / totals.budget : 0,
      deptCount: departments.length,
      topDepartment: topDept?.department_name || null,
      topDepartmentBudget: topDept?.budget || 0,
      topDepartmentPct: topDeptPct,
      overBudgetDepts,
      enableActuals: showActuals,
    });
  }, [departments, totals, selectedYear, activeTab, hasActualsForSelectedYear]);

  const showActuals = activeTab === "bva" && hasActualsForSelectedYear;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      {/* Header */}
      <SectionHeader
        eyebrow="Budget"
        title={activeTab === "adopted" ? "Adopted Budget" : "Budget vs Actuals"}
        description={
          activeTab === "adopted"
            ? "Explore the adopted budget across departments and funds for the selected fiscal year."
            : "Compare adopted budgets against actual spending for years with both datasets."
        }
        rightSlot={
          yearsForTab.length > 0 ? (
            <FiscalYearSelect options={yearsForTab} label="Fiscal year" />
          ) : null
        }
        accentColor={accentColor}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="px-1 text-xs text-slate-600">
        <ol className="flex items-center gap-1">
          <li>
            <Link href={cityHref("/overview")} className="hover:text-slate-800">
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-400">
            ›
          </li>
          <li aria-current="page">
            <span className="font-medium text-slate-700">Budget</span>
          </li>
        </ol>
      </nav>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => switchTab("adopted")}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "adopted"
              ? "text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
          aria-selected={activeTab === "adopted"}
          role="tab"
        >
          Adopted budget
          {activeTab === "adopted" && (
            <span
              className="absolute inset-x-0 bottom-0 h-0.5 rounded-full"
              style={{ backgroundColor: accentColor || "#0f172a" }}
            />
          )}
        </button>

        {bvaYears.length > 0 && (
          <button
            type="button"
            onClick={() => switchTab("bva")}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "bva"
                ? "text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
            aria-selected={activeTab === "bva"}
            role="tab"
          >
            Budget vs actuals
            <span className="ml-1.5 inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {bvaYears.length} {bvaYears.length === 1 ? "year" : "years"}
            </span>
            {activeTab === "bva" && (
              <span
                className="absolute inset-x-0 bottom-0 h-0.5 rounded-full"
                style={{ backgroundColor: accentColor || "#0f172a" }}
              />
            )}
          </button>
        )}
      </div>

      {/* No years message */}
      {yearsForTab.length === 0 ? (
        <CardContainer>
          <div className="py-8 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              {activeTab === "bva"
                ? "No years with both budget and actuals data"
                : "No budget data available yet"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {activeTab === "bva"
                ? "Budget vs Actuals comparison requires fiscal years that have both adopted budget and actual spending data uploaded. Check back after actuals are published."
                : "Budget data has not been uploaded yet. Check back after the adopted budget is published."}
            </p>
          </div>
        </CardContainer>
      ) : (
        <>
          {/* Narrative */}
          {narrative && <NarrativeSummary narrative={narrative} />}

          {/* Explorer */}
          <CardContainer>
            {selectedYear !== null && (
              <BudgetExplorer
                fiscalYear={selectedYear}
                deptSummary={deptBudgetActuals}
                fundSummary={fundSummary}
                fundDeptSummary={fundDeptSummary}
                population={population}
                accentColor={accentColor}
                hasActuals={showActuals}
                enableTransactions={enableTransactions}
              />
            )}
          </CardContainer>

          {/* Amended budget comparison — only on adopted tab, only when amendments exist */}
          {activeTab === "adopted" && amendedComparison.length > 0 && selectedYear !== null && (
            <CardContainer>
              <AmendedComparison
                rows={amendedComparison}
                fiscalYear={selectedYear}
                accentColor={accentColor}
              />
            </CardContainer>
          )}

          {/* Fund explorer link */}
          <div className="flex items-center justify-center py-2">
            <Link
              href={cityHref(`/funds${selectedYear ? `?year=${selectedYear}` : ""}`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow-md"
            >
              Browse by fund
              <span className="text-slate-400" aria-hidden="true">→</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

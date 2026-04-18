"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CardContainer from "@/components/CardContainer";
import SectionHeader from "@/components/SectionHeader";
import FiscalYearSelect from "@/components/FiscalYearSelect";
import DrillBarList from "@/components/ui/DrillBarList";
import type { DrillBarItem } from "@/components/ui/DrillBarList";
import FinanceTooltip from "@/components/ui/FinanceTooltip";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";
import type { BudgetActualsYearFundRow, BudgetActualsYearFundDeptRow } from "@/lib/queries";

type Props = {
  years: number[];
  fundSummary: BudgetActualsYearFundRow[];
  fundDeptSummary: BudgetActualsYearFundDeptRow[];
  accentColor?: string;
};

export default function FundsListClient({
  years,
  fundSummary,
  fundDeptSummary,
  accentColor,
}: Props) {
  const searchParams = useSearchParams();

  const selectedYear = useMemo(() => {
    if (!years.length) return null;
    const param = searchParams.get("year");
    if (!param) return years[0];
    const parsed = Number(param);
    return Number.isFinite(parsed) && years.includes(parsed) ? parsed : years[0];
  }, [searchParams, years]);

  const funds = useMemo(() => {
    return (fundSummary ?? [])
      .map((r) => ({
        name: r.fund_name || "Unspecified",
        budget: Number(r.budget_amount || 0),
        actual: Number(r.actual_amount || 0),
      }))
      .sort((a, b) => b.budget - a.budget);
  }, [fundSummary]);

  const totalBudget = funds.reduce((s, f) => s + f.budget, 0);
  const totalActuals = funds.reduce((s, f) => s + f.actual, 0);
  const hasActuals = funds.some((f) => f.actual > 0);
  const execPct = totalBudget > 0 ? (totalActuals / totalBudget) * 100 : 0;

  const drillItems: DrillBarItem[] = useMemo(() => {
    return funds.map((f) => ({
      name: f.name,
      budget: f.budget,
      actual: f.actual,
      href: cityHref(`/funds/${encodeURIComponent(f.name)}${selectedYear ? `?year=${selectedYear}` : ""}`),
    }));
  }, [funds, selectedYear]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Funds"
        title="Fund explorer"
        description="See how the budget is distributed across funds. Click any fund to see its departments."
        rightSlot={years.length > 0 ? <FiscalYearSelect options={years} label="Fiscal year" /> : null}
        accentColor={accentColor}
      />

      <nav aria-label="Breadcrumb" className="px-1 text-xs text-slate-600">
        <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
        <span className="mx-1 text-slate-400" aria-hidden="true">›</span>
        <span className="font-medium text-slate-700">Funds</span>
      </nav>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <FinanceTooltip term="fund">Funds</FinanceTooltip>
          </p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{funds.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total budget</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(totalBudget)}</p>
        </div>
        {hasActuals && (
          <>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total spent</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(totalActuals)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <FinanceTooltip term="budget execution">Execution</FinanceTooltip>
              </p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatPercent(execPct, 1)}</p>
            </div>
          </>
        )}
      </div>

      {/* Fund bars */}
      <CardContainer>
        <section aria-label="Fund breakdown" className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {selectedYear ? `FY ${selectedYear} funds` : "Funds"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {funds.length} funds. Click any fund to see departments within it.
            </p>
          </div>
          <DrillBarList
            items={drillItems}
            showActuals={hasActuals}
            showTable={true}
            ariaLabel="Funds ranked by budget"
          />
        </section>
      </CardContainer>
    </div>
  );
}

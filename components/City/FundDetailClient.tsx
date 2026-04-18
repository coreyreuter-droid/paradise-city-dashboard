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
import type { BudgetActualsYearFundDeptRow } from "@/lib/queries";

type Props = {
  fundName: string;
  years: number[];
  fundDeptRows: BudgetActualsYearFundDeptRow[];
};

export default function FundDetailClient({ fundName, years, fundDeptRows }: Props) {
  const searchParams = useSearchParams();

  const selectedYear = useMemo(() => {
    if (!years.length) return null;
    const param = searchParams.get("year");
    if (!param) return years[0];
    const parsed = Number(param);
    return Number.isFinite(parsed) && years.includes(parsed) ? parsed : years[0];
  }, [searchParams, years]);

  const departments = useMemo(() => {
    return (fundDeptRows ?? [])
      .map((r) => ({
        name: r.department_name || "Unspecified",
        budget: Number(r.budget_amount || 0),
        actual: Number(r.actual_amount || 0),
      }))
      .sort((a, b) => b.budget - a.budget);
  }, [fundDeptRows]);

  const totalBudget = departments.reduce((s, d) => s + d.budget, 0);
  const totalActuals = departments.reduce((s, d) => s + d.actual, 0);
  const hasActuals = departments.some((d) => d.actual > 0);
  const execPct = totalBudget > 0 ? (totalActuals / totalBudget) * 100 : 0;

  const drillItems: DrillBarItem[] = useMemo(() => {
    return departments.map((d) => ({
      name: d.name,
      budget: d.budget,
      actual: d.actual,
      href: cityHref(`/departments/${encodeURIComponent(d.name)}${selectedYear ? `?year=${selectedYear}` : ""}`),
    }));
  }, [departments, selectedYear]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Fund detail"
        title={fundName}
        description={`Departments within this fund for ${selectedYear ? `FY ${selectedYear}` : "the selected year"}.`}
        rightSlot={years.length > 0 ? <FiscalYearSelect options={years} label="Fiscal year" /> : null}
      />

      <nav aria-label="Breadcrumb" className="px-1 text-xs text-slate-600">
        <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
        <span className="mx-1 text-slate-400">›</span>
        <Link href={cityHref(`/funds${selectedYear ? `?year=${selectedYear}` : ""}`)} className="hover:text-slate-800">Funds</Link>
        <span className="mx-1 text-slate-400">›</span>
        <span className="font-medium text-slate-700">{fundName}</span>
      </nav>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Departments</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{departments.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <FinanceTooltip term="fund">Fund budget</FinanceTooltip>
          </p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(totalBudget)}</p>
        </div>
        {hasActuals && (
          <>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Fund spent</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(totalActuals)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Execution</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatPercent(execPct, 1)}</p>
            </div>
          </>
        )}
      </div>

      {/* Department bars */}
      <CardContainer>
        <section aria-label="Departments in this fund" className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Departments in {fundName}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Click any department to view its full detail.
            </p>
          </div>

          {departments.length === 0 ? (
            <p className="text-sm text-slate-600">No departments found in this fund for the selected year.</p>
          ) : (
            <DrillBarList
              items={drillItems}
              showActuals={hasActuals}
              showTable={true}
              ariaLabel="Departments within fund"
            />
          )}
        </section>
      </CardContainer>
    </div>
  );
}

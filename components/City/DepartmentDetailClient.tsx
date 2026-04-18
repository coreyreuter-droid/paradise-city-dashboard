// components/City/DepartmentDetailClient.tsx
"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type {
  BudgetRow,
  ActualRow,
  TransactionRow,
} from "@/lib/types";
import CardContainer from "../CardContainer";
import SectionHeader from "../SectionHeader";
import NarrativeSummary from "../NarrativeSummary";
import FiscalYearSelect from "../FiscalYearSelect";
import DrillBarList from "../ui/DrillBarList";
import type { DrillBarItem } from "../ui/DrillBarList";
import FinanceTooltip from "../ui/FinanceTooltip";
import DataTable, {
  DataTableColumn,
} from "../DataTable";
import { cityHref } from "@/lib/cityRouting";
import { buildDepartmentDetailNarrative } from "@/lib/narrativeHelpers";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { formatCurrency, formatPercent, formatAxisCurrency } from "@/lib/format";
import { computeSnappedDomain } from "@/lib/chartDomain";

type Props = {
  departmentName?: string;
  budgets: BudgetRow[];
  actuals: ActualRow[];
  transactions: TransactionRow[];
  enableVendors: boolean;
  availableYears?: number[];
  deptSummaryAllYears?: Array<{
    fiscal_year: number;
    budget_amount: number | string | null;
    actual_amount: number | string | null;
  }>;
};

const normalizeName = (name: string | null | undefined) =>
  (name ?? "").trim().toLowerCase();

type DeptVendorSummary = {
  name: string;
  total: number;
  txCount: number;
  percent: number;
};

type DeptCategorySummary = {
  category: string;
  total: number;
  percent: number;
};

export default function DepartmentDetailClient({
  departmentName,
  budgets,
  actuals,
  transactions,
  enableVendors,
  availableYears,
  deptSummaryAllYears,
}: Props) {
  const searchParams = useSearchParams();
  const [activeVendor, setActiveVendor] = useState<string | null>(null);
  
  // Refs for vendor modal focus management
  const vendorModalRef = useRef<HTMLDivElement>(null);
  const vendorCloseButtonRef = useRef<HTMLButtonElement>(null);
  const vendorTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Focus management for vendor modal
  useEffect(() => {
    if (activeVendor) {
      // Focus the close button when modal opens
      vendorCloseButtonRef.current?.focus();
      
      // Trap focus within modal
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setActiveVendor(null);
          return;
        }
        
        if (e.key === "Tab" && vendorModalRef.current) {
          const focusable = vendorModalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      };
      
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    } else {
      // Return focus to trigger button when modal closes
      vendorTriggerRef.current?.focus();
      vendorTriggerRef.current = null;
    }
  }, [activeVendor]);

  // Handler to open vendor modal and store trigger ref
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openVendorModal = useCallback((vendorName: string, triggerElement: HTMLButtonElement) => {
    vendorTriggerRef.current = triggerElement;
    setActiveVendor(vendorName);
  }, []);

  const displayName = useMemo(() => {
    if (departmentName && departmentName.trim().length > 0) {
      return departmentName;
    }

    const fromQuery =
      searchParams.get("department") || searchParams.get("dept");
    if (fromQuery && fromQuery.trim().length > 0) {
      return fromQuery;
    }

    const fromBudgets =
      budgets.find((b) => b.department_name)?.department_name;
    if (fromBudgets && fromBudgets.trim().length > 0) {
      return fromBudgets;
    }

    const fromActuals =
      actuals.find((a) => a.department_name)?.department_name;
    if (fromActuals && fromActuals.trim().length > 0) {
      return fromActuals;
    }

    const fromTx =
      transactions.find((t) => t.department_name)?.department_name;
    if (fromTx && fromTx.trim().length > 0) {
      return fromTx;
    }

    return "Department detail";
  }, [departmentName, searchParams, budgets, actuals, transactions]);

  const normalizedDisplay = useMemo(
    () => normalizeName(displayName),
    [displayName]
  );

  const deptBudgets = useMemo(
    () =>
      budgets.filter(
        (b) => normalizeName(b.department_name) === normalizedDisplay
      ),
    [budgets, normalizedDisplay]
  );

  const deptActuals = useMemo(
    () =>
      actuals.filter(
        (a) => normalizeName(a.department_name) === normalizedDisplay
      ),
    [actuals, normalizedDisplay]
  );

  const deptTx = useMemo(
    () =>
      transactions.filter(
        (t) => normalizeName(t.department_name) === normalizedDisplay
      ),
    [transactions, normalizedDisplay]
  );

  const deptYears = useMemo(() => {
    // Use availableYears from server if provided (includes all years for this department)
    if (availableYears && availableYears.length > 0) {
      return [...availableYears].sort((a, b) => b - a);
    }
    // Fallback: compute from current data (may only have selected year)
    const set = new Set<number>();
    deptBudgets.forEach((b) => set.add(b.fiscal_year));
    deptActuals.forEach((a) => set.add(a.fiscal_year));
    deptTx.forEach((t) => set.add(t.fiscal_year));
    return Array.from(set).sort((a, b) => b - a);
  }, [availableYears, deptBudgets, deptActuals, deptTx]);

  const selectedYear = useMemo(() => {
    if (deptYears.length === 0) return undefined;

    const yearParam = searchParams.get("year");
    if (!yearParam) return deptYears[0];

    const parsed = Number(yearParam);
    if (Number.isNaN(parsed)) return deptYears[0];

    if (!deptYears.includes(parsed)) return deptYears[0];

    return parsed;
  }, [searchParams, deptYears]);

  const multiYearSeries = useMemo(() => {
    // Use pre-aggregated multi-year data if available
    if (deptSummaryAllYears && deptSummaryAllYears.length > 0) {
      return deptSummaryAllYears
        .map((row) => ({
          year: Number(row.fiscal_year),
          budget: Number(row.budget_amount || 0),
          actuals: Number(row.actual_amount || 0),
        }))
        .filter((row) => Number.isFinite(row.year))
        .sort((a, b) => a.year - b.year);
    }

    // Fallback: derive from single-year data
const byYear = new Map<
      number,
      { year: number; budget: number; actuals: number }
    >();

    deptBudgets.forEach((b) => {
      const year = b.fiscal_year;
      const entry =
        byYear.get(year) || { year, budget: 0, actuals: 0 };
      entry.budget += Number(b.amount || 0);
      byYear.set(year, entry);
    });

    deptActuals.forEach((a) => {
      const year = a.fiscal_year;
      const entry =
        byYear.get(year) || { year, budget: 0, actuals: 0 };
      entry.actuals += Number(a.amount || 0);
      byYear.set(year, entry);
    });

    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
  }, [deptSummaryAllYears, deptBudgets, deptActuals]);

    const multiYearDomain = useMemo((): [number, number] => {
    const values: number[] = [];
    multiYearSeries.forEach((row) => {
      values.push(Number(row.budget || 0));
      values.push(Number(row.actuals || 0));
    });
    return computeSnappedDomain(values);
  }, [multiYearSeries]);


  const selectedYearTotals = useMemo(() => {
    if (!selectedYear) {
      return {
        budget: 0,
        actuals: 0,
        variance: 0,
        percentSpent: 0,
      };
    }

    const totalBudget = deptBudgets
      .filter((b) => b.fiscal_year === selectedYear)
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const totalActuals = deptActuals
      .filter((a) => a.fiscal_year === selectedYear)
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const variance = totalActuals - totalBudget;
    const percentSpent =
      totalBudget === 0 ? 0 : (totalActuals / totalBudget) * 100;

    return {
      budget: totalBudget,
      actuals: totalActuals,
      variance,
      percentSpent,
    };
  }, [deptBudgets, deptActuals, selectedYear]);

  const deptTxForYear = useMemo(
    () =>
      selectedYear
        ? deptTx
            .filter((t) => t.fiscal_year === selectedYear)
            .sort(
              (a, b) =>
                new Date(b.date).getTime() -
                new Date(a.date).getTime()
            )
        : [],
    [deptTx, selectedYear]
  );

  const deptVendorSummaries: DeptVendorSummary[] = useMemo(() => {
    if (!enableVendors) return [];
    if (deptTxForYear.length === 0) return [];

    const byVendor = new Map<string, { total: number; count: number }>();

    deptTxForYear.forEach((tx) => {
      const name =
        tx.vendor && tx.vendor.trim().length > 0
          ? tx.vendor
          : "Unspecified";
      const amt = Number(tx.amount || 0);
      const existing = byVendor.get(name) || {
        total: 0,
        count: 0,
      };
      existing.total += amt;
      existing.count += 1;
      byVendor.set(name, existing);
    });

    const grandTotal = Array.from(byVendor.values()).reduce(
      (sum, v) => sum + v.total,
      0
    );

    return Array.from(byVendor.entries())
      .map(([name, info]) => ({
        name,
        total: info.total,
        txCount: info.count,
        percent:
          grandTotal === 0 ? 0 : (info.total / grandTotal) * 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [deptTxForYear, enableVendors]);

  const deptCategorySummaries: DeptCategorySummary[] = useMemo(() => {
    if (!selectedYear) return [];

    const actualsForYear = deptActuals.filter(
      (a) => a.fiscal_year === selectedYear
    );
    if (actualsForYear.length === 0) return [];

    const byCategory = new Map<string, number>();

    actualsForYear.forEach((row) => {
      const cat =
        row.category && row.category.trim().length > 0
          ? row.category
          : "Unspecified";
      const amt = Number(row.amount || 0);
      byCategory.set(cat, (byCategory.get(cat) || 0) + amt);
    });

    const grandTotal = Array.from(byCategory.values()).reduce(
      (sum, v) => sum + v,
      0
    );

    return Array.from(byCategory.entries())
      .map(([category, totalAmt]) => ({
        category,
        total: totalAmt,
        percent:
          grandTotal === 0 ? 0 : (totalAmt / grandTotal) * 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [deptActuals, selectedYear]);

  const activeVendorTx = useMemo(() => {
    if (!enableVendors || !activeVendor || !selectedYear) return [];
    return deptTxForYear.filter(
      (tx) =>
        (tx.vendor && tx.vendor.trim().length > 0
          ? tx.vendor
          : "Unspecified") === activeVendor
    );
  }, [activeVendor, deptTxForYear, selectedYear, enableVendors]);

  const baseTransactionColumns: DataTableColumn<TransactionRow>[] =
    useMemo(
      () => [
        {
          key: "date",
          header: "Date",
          sortable: true,
          sortAccessor: (row) => row.date,
          cellClassName: "whitespace-nowrap",
          cell: (row) => row.date,
        },
        {
          key: "vendor",
          header: "Vendor",
          sortable: true,
          sortAccessor: (row) =>
            (row.vendor || "Unspecified").toLowerCase(),
          cellClassName: "whitespace-nowrap",
          cell: (row) => {
            const name = row.vendor || "Unspecified";
            return (
              <button
                type="button"
                onClick={() =>
                  enableVendors
                    ? setActiveVendor(name)
                    : undefined
                }
                className={
                  enableVendors
                    ? "whitespace-nowrap text-slate-800 hover:underline"
                    : "whitespace-nowrap text-slate-700"
                }
                aria-disabled={!enableVendors}
              >
                {enableVendors ? name : "Hidden"}
              </button>
            );
          },
        },
        {
          key: "description",
          header: "Description",
          sortable: true,
          sortAccessor: (row) =>
            (row.description || "").toLowerCase(),
          cell: (row) =>
            row.description || (
              <span className="italic text-slate-600">
                No description
              </span>
            ),
        },
        {
          key: "amount",
          header: "Amount",
          sortable: true,
          sortAccessor: (row) => Number(row.amount || 0),
          headerClassName: "text-right",
          cellClassName: "text-right font-mono",
          cell: (row) =>
            formatCurrency(Number(row.amount || 0)),
        },
      ],
      [enableVendors]
    );

  const transactionColumns = useMemo(() => {
    if (enableVendors) return baseTransactionColumns;
    // Strip vendor column entirely when vendor names are disabled.
    return baseTransactionColumns.filter((col) => col.key !== "vendor");
  }, [baseTransactionColumns, enableVendors]);

  const vendorTotal = useMemo(
    () =>
      activeVendorTx.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0
      ),
    [activeVendorTx]
  );

  // Build narrative summary
  const narrative = useMemo(() => {
    const hasActuals = selectedYearTotals.actuals > 0;
    const hasTx = deptTxForYear.length > 0;
    const topVendor = deptVendorSummaries[0];
    
    // Get previous year actuals for YoY comparison
    const prevYear = selectedYear ? selectedYear - 1 : null;
    const prevYearActuals = prevYear
      ? multiYearSeries.find((s) => s.year === prevYear)?.actuals ?? null
      : null;

    return buildDepartmentDetailNarrative({
      cityName: CITY_CONFIG.displayName || "This organization",
      year: selectedYear ?? null,
      departmentName: displayName,
      budget: selectedYearTotals.budget,
      actuals: selectedYearTotals.actuals,
      execPct: selectedYearTotals.percentSpent / 100, // Convert to 0-1
      txCount: deptTxForYear.length,
      vendorCount: deptVendorSummaries.length,
      topVendor: topVendor?.name || null,
      topVendorAmount: topVendor?.total || 0,
      prevYearActuals,
      enableActuals: hasActuals,
      enableTransactions: hasTx,
      enableVendors,
    });
  }, [
    displayName,
    selectedYear,
    selectedYearTotals,
    deptTxForYear,
    deptVendorSummaries,
    multiYearSeries,
    enableVendors,
  ]);


  // DrillBarList items for vendors — link to transactions filtered by vendor
  const vendorDrillItems: DrillBarItem[] = useMemo(() => {
    return deptVendorSummaries.map((v) => ({
      name: v.name,
      budget: v.total,
      actual: 0,
      href: v.name !== "Unspecified"
        ? cityHref(`/transactions?q=${encodeURIComponent(v.name)}${selectedYear ? `&year=${selectedYear}` : ""}`)
        : undefined,
    }));
  }, [deptVendorSummaries, selectedYear]);

  // DrillBarList items for categories — link to transactions filtered by department
  const categoryDrillItems: DrillBarItem[] = useMemo(() => {
    return deptCategorySummaries.map((c) => ({
      name: c.category,
      budget: c.total,
      actual: 0,
      href: cityHref(`/transactions?department=${encodeURIComponent(displayName)}${selectedYear ? `&year=${selectedYear}` : ""}`),
    }));
  }, [deptCategorySummaries, selectedYear, displayName]);

  const isUnderBudget = selectedYearTotals.variance <= 0;

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Department detail"
        title={displayName}
        description="Budget, spending, and activity for this department."
        rightSlot={
          deptYears.length > 0 ? (
            <FiscalYearSelect options={deptYears} label="Fiscal year" />
          ) : null
        }
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 mt-2 flex items-center gap-1 px-1 text-xs text-slate-600">
        <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
        <span className="text-slate-400" aria-hidden="true">›</span>
        <Link href={cityHref("/departments")} className="hover:text-slate-800">Spending</Link>
        <span className="text-slate-400" aria-hidden="true">›</span>
        <span className="font-medium text-slate-700">{displayName}</span>
      </nav>

      {narrative && <NarrativeSummary narrative={narrative} className="mb-4" />}

      <div className="space-y-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <FinanceTooltip term="adopted budget">Budget</FinanceTooltip>
            </p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(selectedYearTotals.budget)}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">FY {selectedYear ?? "–"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <FinanceTooltip term="actuals">Spent</FinanceTooltip>
            </p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(selectedYearTotals.actuals)}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{formatPercent(selectedYearTotals.percentSpent, 1)} of budget</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <FinanceTooltip term="variance">{isUnderBudget ? "Remaining" : "Over budget"}</FinanceTooltip>
            </p>
            <p className={`mt-0.5 text-lg font-semibold ${isUnderBudget ? "text-emerald-700" : "text-red-700"}`}>{formatCurrency(Math.abs(selectedYearTotals.variance))}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{isUnderBudget ? "Under plan" : "Above plan"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Transactions</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{deptTxForYear.length.toLocaleString("en-US")}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">FY {selectedYear ?? "–"}</p>
          </div>
        </div>

        {/* Multi-year trend chart */}
        {multiYearSeries.length > 1 && (
          <CardContainer>
            <section aria-labelledby="dept-multiyear-heading" className="space-y-3">
              <div>
                <h2 id="dept-multiyear-heading" className="text-sm font-semibold text-slate-900">Budget vs actuals over time</h2>
                <p className="mt-0.5 text-sm text-slate-600">{displayName} across {multiYearSeries.length} fiscal years.</p>
              </div>
              <div
                className="h-[280px] w-full min-w-0 overflow-hidden"
                role="img"
                aria-label={`Line chart: ${displayName} budget vs actuals over time`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={multiYearSeries} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} />
                    <YAxis domain={multiYearDomain} tickFormatter={formatAxisCurrency} tickLine={false} axisLine={false} />
                    <Tooltip
                      labelFormatter={(label) => `Fiscal year ${label}`}
                      formatter={(value, name) => typeof value === "number" ? [formatCurrency(value), String(name ?? "")] : [String(value ?? ""), String(name ?? "")]}
                      contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      labelStyle={{ color: "#0f172a", fontWeight: 600, marginBottom: "4px" }}
                    />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="budget" name="Budget" dot={false} strokeWidth={2} stroke="#94a3b8" />
                    <Line type="monotone" dataKey="actuals" name="Actuals" dot={false} strokeWidth={2} stroke="#10b981" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Screen reader data table */}
              <table className="sr-only">
                <caption>{displayName} budget vs actuals by fiscal year</caption>
                <thead><tr><th>Year</th><th>Budget</th><th>Actuals</th></tr></thead>
                <tbody>
                  {multiYearSeries.map((row) => (
                    <tr key={row.year}>
                      <td>{row.year}</td>
                      <td>{formatCurrency(Number(row.budget || 0))}</td>
                      <td>{formatCurrency(Number(row.actuals || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </CardContainer>
        )}

        {/* Vendors & Categories */}
        <div className="grid gap-5 lg:grid-cols-2">
          {enableVendors && (
            <CardContainer>
              <section aria-label="Top vendors" className="space-y-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Top vendors — FY {selectedYear ?? "–"}</h2>
                  <p className="mt-0.5 text-sm text-slate-600">Click a vendor to view transactions.</p>
                </div>
                {vendorDrillItems.length === 0 ? (
                  <p className="text-sm text-slate-600">No vendor data for this year.</p>
                ) : (
                  <DrillBarList items={vendorDrillItems} showActuals={false} ariaLabel="Top vendors by spending" />
                )}
              </section>
            </CardContainer>
          )}
          <CardContainer>
            <section aria-label="Spending by category" className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Spending by category — FY {selectedYear ?? "–"}</h2>
                <p className="mt-0.5 text-sm text-slate-600">Distribution across budget categories.</p>
              </div>
              {categoryDrillItems.length === 0 ? (
                <p className="text-sm text-slate-600">No categorized spending for this year.</p>
              ) : (
                <DrillBarList items={categoryDrillItems} showActuals={false} ariaLabel="Spending categories" />
              )}
            </section>
          </CardContainer>
        </div>

        {/* Transactions table */}
        <CardContainer>
          <section aria-label="Transactions" className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Transactions — FY {selectedYear ?? "–"}</h2>
              <p className="mt-0.5 text-sm text-slate-600">{deptTxForYear.length.toLocaleString()} individual payments.</p>
            </div>
            {deptTxForYear.length === 0 ? (
              <p className="text-sm text-slate-600">No transactions for this year.</p>
            ) : (
              <DataTable<TransactionRow>
                data={deptTxForYear}
                columns={transactionColumns}
                initialSortKey="date"
                initialSortDirection="desc"
                getRowKey={(_, index) => String(index)}
              />
            )}
          </section>
        </CardContainer>
      </div>

      {/* Vendor detail slideout */}
      {enableVendors && activeVendor && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={() => setActiveVendor(null)} aria-label="Close vendor detail" tabIndex={-1} />
          <div ref={vendorModalRef} className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="vendor-detail-heading">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vendor detail</p>
                <h2 id="vendor-detail-heading" className="text-sm font-semibold text-slate-900">{activeVendor}</h2>
                <p className="mt-0.5 text-sm text-slate-600">{displayName} — FY {selectedYear ?? "–"}</p>
              </div>
              <button ref={vendorCloseButtonRef} type="button" onClick={() => setActiveVendor(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Close</button>
            </div>
            <div className="flex-1 space-y-3 overflow-auto px-4 py-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total with this vendor</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(vendorTotal)}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{activeVendorTx.length.toLocaleString()} transaction{activeVendorTx.length === 1 ? "" : "s"}</p>
              </div>
              {activeVendorTx.length === 0 ? (
                <p className="text-sm text-slate-600">No transactions found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="max-h-[360px] overflow-y-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                          <th className="px-2 py-2 font-semibold text-slate-600">Date</th>
                          <th className="px-2 py-2 font-semibold text-slate-600">Description</th>
                          <th className="px-2 py-2 text-right font-semibold text-slate-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeVendorTx.map((tx, idx) => (
                          <tr key={`${tx.date}-${idx}`} className="border-b border-slate-100 last:border-0">
                            <td className="px-2 py-1.5">{tx.date}</td>
                            <td className="px-2 py-1.5">{tx.description || <span className="italic text-slate-500">No description</span>}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{formatCurrency(Number(tx.amount || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

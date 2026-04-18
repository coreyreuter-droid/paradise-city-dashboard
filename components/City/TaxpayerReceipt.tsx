"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";

type Props = {
  /** Department budgets for the current year */
  departments: Array<{
    department_name: string;
    budget: number;
  }>;
  /** Total budget for the year */
  totalBudget: number;
  /** Fiscal year */
  fiscalYear: number | null;
  /** City name */
  cityName: string;
  /** City tax rate (mills or percentage). If not provided, uses a property-value-based estimate */
  taxRate?: number | null;
  /** Accent color */
  accentColor?: string;
};

const DEPT_ICONS: Record<string, string> = {
  "public safety": "shield",
  "police": "shield",
  "fire": "flame",
  "public works": "wrench",
  "parks": "tree",
  "parks & recreation": "tree",
  "parks and recreation": "tree",
  "recreation": "tree",
  "administration": "building",
  "general government": "building",
  "finance": "dollar",
  "community development": "home",
  "planning": "compass",
  "library": "book",
  "water": "droplet",
  "utilities": "zap",
  "transportation": "road",
  "streets": "road",
  "health": "heart",
  "human services": "users",
  "education": "graduation",
};

function getIcon(dept: string): string {
  const lower = dept.toLowerCase();
  for (const [key, icon] of Object.entries(DEPT_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "circle";
}

function IconSvg({ icon, className }: { icon: string; className?: string }) {
  const cls = className || "h-5 w-5";
  switch (icon) {
    case "shield":
      return <svg viewBox="0 0 24 24" fill="none" className={cls}><path d="M12 2l7 4v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
    case "flame":
      return <svg viewBox="0 0 24 24" fill="none" className={cls}><path d="M12 2c.5 4-3 6-3 10 0 3 2 5 3 5s3-2 3-5c0-2-1-3-1-3s2 1.5 2 5c0 3.5-2.5 6-5 7-2.5-1-5-3.5-5-7 0-4 3.5-6 3-10 0 0 1.5 2 3-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
    case "wrench":
      return <svg viewBox="0 0 24 24" fill="none" className={cls}><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
    case "tree":
      return <svg viewBox="0 0 24 24" fill="none" className={cls}><path d="M12 2L7 9h3l-3 7h10l-3-7h3L12 2zM12 22v-6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/></svg>;
    case "building":
      return <svg viewBox="0 0 24 24" fill="none" className={cls}><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "dollar":
      return <svg viewBox="0 0 24 24" fill="none" className={cls}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "home":
      return <svg viewBox="0 0 24 24" fill="none" className={cls}><path d="M3 12l9-9 9 9M5 10v10h14V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "droplet":
      return <svg viewBox="0 0 24 24" fill="none" className={cls}><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
    case "heart":
      return <svg viewBox="0 0 24 24" fill="none" className={cls}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
    case "book":
      return <svg viewBox="0 0 24 24" fill="none" className={cls}><path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "users":
      return <svg viewBox="0 0 24 24" fill="none" className={cls}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    default:
      return <svg viewBox="0 0 24 24" fill="none" className={cls}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5"/></svg>;
  }
}

const COLORS = [
  "#0f766e", "#1d4ed8", "#7c3aed", "#b45309",
  "#15803d", "#be123c", "#0369a1", "#a16207", "#64748b",
];

export default function TaxpayerReceipt({
  departments,
  totalBudget,
  fiscalYear,
  cityName,
  taxRate,
  accentColor,
}: Props) {
  const [inputValue, setInputValue] = useState<string>("");
  const [showReceipt, setShowReceipt] = useState(false);

  // Default assumption: ~1.2% effective property tax rate if not provided
  const effectiveRate = taxRate || 0.012;

  const propertyValue = useMemo(() => {
    const cleaned = inputValue.replace(/[^0-9.]/g, "");
    const val = parseFloat(cleaned);
    return Number.isFinite(val) && val > 0 ? val : 0;
  }, [inputValue]);

  const estimatedTax = propertyValue * effectiveRate;

  const receipt = useMemo(() => {
    if (totalBudget <= 0 || estimatedTax <= 0) return [];

    const sorted = [...departments].sort((a, b) => b.budget - a.budget);

    return sorted.map((d, i) => {
      const share = d.budget / totalBudget;
      const amount = estimatedTax * share;
      return {
        name: d.department_name,
        amount,
        share: share * 100,
        icon: getIcon(d.department_name),
        color: COLORS[i % COLORS.length],
      };
    });
  }, [departments, totalBudget, estimatedTax]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (propertyValue > 0) {
      setShowReceipt(true);
    }
  };

  const handleReset = () => {
    setShowReceipt(false);
    setInputValue("");
  };

  return (
    <section aria-label="Taxpayer receipt calculator" className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
          Your taxpayer receipt
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">
          Enter your estimated property value to see how your tax dollars are
          allocated across {cityName}&apos;s{" "}
          {fiscalYear ? `FY ${fiscalYear} ` : ""}budget.
        </p>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="property-value" className="text-xs font-medium text-slate-700">
            Estimated property value
          </label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
            <input
              id="property-value"
              type="text"
              inputMode="numeric"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowReceipt(false);
              }}
              placeholder="250,000"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-7 pr-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ backgroundColor: accentColor || "#0f172a" }}
        >
          Calculate my receipt
        </button>
        {showReceipt && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700"
          >
            Reset
          </button>
        )}
      </form>

      {/* Receipt */}
      {showReceipt && receipt.length > 0 && (
        <div className="space-y-4">
          {/* Receipt header */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Your estimated annual contribution
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {formatCurrency(estimatedTax)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Based on ${propertyValue.toLocaleString()} property value at{" "}
                  {(effectiveRate * 100).toFixed(2)}% effective rate
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {cityName}
                </p>
                <p className="text-xs text-slate-500">
                  {fiscalYear ? `FY ${fiscalYear}` : "Current year"}
                </p>
              </div>
            </div>
          </div>

          {/* Receipt items */}
          <div className="grid gap-2 sm:grid-cols-2">
            {receipt.map((item) => (
              <Link
                key={item.name}
                href={cityHref(`/departments/${encodeURIComponent(item.name)}`)}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: item.color + "15", color: item.color }}
                >
                  <IconSvg icon={item.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 group-hover:text-slate-900">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {item.share.toFixed(1)}% of your taxes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <p className="text-[11px] text-slate-500">
            This is an estimate based on the city&apos;s adopted budget allocation. Your actual
            tax contribution may vary based on exemptions, special assessments, and other factors.
            This tool is for informational purposes only.
          </p>
        </div>
      )}
    </section>
  );
}

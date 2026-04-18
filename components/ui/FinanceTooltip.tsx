"use client";

import React, { useState, useRef, useEffect } from "react";

/* =============================================================================
   Finance term definitions
============================================================================= */

const TERMS: Record<string, string> = {
  "adopted budget":
    "The budget approved by the governing body (city council, board, etc.) at the start of the fiscal year. This is the official spending plan.",
  "amended budget":
    "A revised version of the adopted budget, modified during the fiscal year to reflect changes in revenue, priorities, or unexpected expenses.",
  actuals:
    "The real dollars actually spent or received, as opposed to what was planned in the budget.",
  variance:
    "The difference between what was budgeted and what was actually spent. Positive variance means spending was below the plan.",
  "fiscal year":
    "A 12-month accounting period used by the government for budgeting and financial reporting. It may not align with the calendar year.",
  fund:
    "A self-contained accounting entity with its own revenues and expenditures. Governments use separate funds to track money restricted for specific purposes (e.g., General Fund, Water Fund).",
  "general fund":
    "The primary operating fund of the government. It covers most day-to-day services like public safety, parks, and administration.",
  "enterprise fund":
    "A fund for services that operate like a business, charging fees to cover costs (e.g., water, sewer, electric utilities).",
  "capital project":
    "A large, one-time investment in infrastructure or facilities, such as building a new road, park, or fire station.",
  "per capita":
    "Per person. Budget per capita divides the total budget by the population, showing approximately how much is allocated per resident.",
  "budget execution":
    "The percentage of the adopted budget that has actually been spent. 85% execution means 85 cents of every budgeted dollar has been spent so far.",
  department:
    "An organizational unit within the government responsible for delivering specific services (e.g., Police, Public Works, Parks & Recreation).",
  revenue:
    "Income received by the government from taxes, fees, grants, fines, and other sources.",
  expenditure:
    "Money spent by the government to provide services, pay employees, purchase supplies, or fund capital projects.",
};

/* =============================================================================
   Component
============================================================================= */

type Props = {
  term: string;
  children: React.ReactNode;
};

export default function FinanceTooltip({ term, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const definition = TERMS[term.toLowerCase()] || null;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!definition) {
    return <>{children}</>;
  }

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center gap-0.5 border-b border-dashed border-slate-400 text-inherit transition-colors hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 rounded-sm cursor-help"
        aria-expanded={open}
        aria-describedby={`tooltip-${term.replace(/\s+/g, "-")}`}
      >
        {children}
        <svg
          viewBox="0 0 12 12"
          fill="none"
          className="ml-0.5 h-3 w-3 flex-shrink-0 text-slate-400"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
          <text
            x="6"
            y="9"
            textAnchor="middle"
            fill="currentColor"
            fontSize="8"
            fontWeight="600"
          >
            ?
          </text>
        </svg>
      </button>

      {open && (
        <div
          ref={tooltipRef}
          id={`tooltip-${term.replace(/\s+/g, "-")}`}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {term}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">
            {definition}
          </p>
          {/* Arrow */}
          <div
            className="absolute left-1/2 top-full -translate-x-1/2"
            aria-hidden="true"
          >
            <div className="h-2 w-2 rotate-45 border-b border-r border-slate-200 bg-white" />
          </div>
        </div>
      )}
    </span>
  );
}

/**
 * Inline helper: wraps text with a tooltip if the term is recognized.
 * Usage: <Tip term="adopted budget">Adopted Budget</Tip>
 */
export { FinanceTooltip as Tip };

// components/City/InsightsSection.tsx
"use client";

import Link from "next/link";
import type { Insight, InsightType } from "@/lib/insights";

type Props = {
  insights: Insight[];
  fiscalYear: number;
  className?: string;
};

const typeStyles: Record<InsightType, { border: string; bg: string; icon: string }> = {
  warning: {
    border: "border-l-amber-500",
    bg: "bg-amber-50",
    icon: "text-amber-600",
  },
  info: {
    border: "border-l-blue-500",
    bg: "bg-blue-50",
    icon: "text-blue-600",
  },
};

function InsightIcon({ type }: { type: InsightType }) {
  const colorClass = typeStyles[type].icon;

  if (type === "warning") {
    return (
      <svg
        className={`h-5 w-5 ${colorClass}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    );
  }

  // info (default)
  return (
    <svg
      className={`h-5 w-5 ${colorClass}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

/**
 * Displays a grid of department-focused insights.
 * Returns null if no insights (don't show empty state).
 */
export default function InsightsSection({ insights, fiscalYear, className = "" }: Props) {
  // Don't render if no insights
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <section
      role="region"
      aria-labelledby="insights-heading"
      className={`space-y-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        {/* Lightbulb icon */}
        <svg
          className="h-5 w-5 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h2
          id="insights-heading"
          className="text-sm font-semibold text-slate-900"
        >
          Key Department Insights
        </h2>
      </div>

      {/* Insights grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight) => {
          const styles = typeStyles[insight.type];
          const deptHref = `/portal/departments/${encodeURIComponent(insight.departmentName)}?year=${fiscalYear}`;

          return (
            <Link
              key={insight.id}
              href={deptHref}
              aria-label={`View ${insight.departmentName} budget details`}
              className={`block rounded-lg border border-transparent border-l-4 ${styles.border} ${styles.bg} px-4 py-3 transition-all hover:border-slate-300 hover:shadow-md cursor-pointer`}
            >
              <article>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 pt-0.5">
                    <InsightIcon type={insight.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-slate-900">
                      {insight.title}
                    </h3>
                    {insight.description && (
                      <p className="mt-1 text-xs text-slate-600">
                        {insight.description}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

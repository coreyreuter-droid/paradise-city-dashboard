// components/City/CityShell.tsx
"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CITY_CONFIG } from "@/lib/cityConfig";
import GlobalSearch from "@/components/GlobalSearch";

type Props = {
  accent: string;
  displayName: string;
  tagline: string | null;
  children: ReactNode;
};

export default function CityShell({
  accent,
  displayName,
  tagline,
  children,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = `/${CITY_CONFIG.slug}`;

  // Get fiscal year from URL for search context
  const yearParam = searchParams.get("year");
  const fiscalYear = yearParam ? Number(yearParam) : null;

  const isLanding =
    pathname === basePath ||
    pathname === `${basePath}/` ||
    pathname === `/${CITY_CONFIG.slug}` ||
    pathname === `/${CITY_CONFIG.slug}/`;

  // For the Home landing page: NO shared dashboard header/shell.
  if (isLanding) {
    return <>{children}</>;
  }

  // For all other city routes: shared header + card shell.
  return (
    <>
      {/* Shared top hero/banner for all city dashboard pages */}
      <header
        className="relative w-full border-b border-slate-200 bg-slate-50"
        aria-label={`${displayName} portal header`}
        style={{
          borderTopColor: accent,
          borderTopWidth: "3px",
        }}
      >
        {/* Decorative accent gradient - enhanced visibility */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          aria-hidden={true}
        >
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `radial-gradient(circle at 0 0, ${accent} 0, transparent 50%), radial-gradient(circle at 100% 0, ${accent} 0, transparent 50%)`,
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Financial transparency dashboards
              </p>
              {/* Main heading uses primary color */}
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[rgb(var(--primary-rgb))] sm:text-3xl lg:text-[1.9rem]">
                {displayName} Financial Transparency
              </h1>
              {tagline && (
                <p className="mt-2 max-w-2xl text-sm text-slate-700">
                  {tagline}
                </p>
              )}
            </div>
            {/* Global Search + Print */}
            <div className="flex items-center gap-2 flex-shrink-0 sm:pt-6">
              <button
                type="button"
                onClick={() => window.print()}
                className="no-print inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                aria-label="Print this page or save as PDF"
              >
                <svg 
                  className="h-4 w-4" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth={1.5} 
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                <span className="hidden sm:inline">Print</span>
              </button>
              <GlobalSearch fiscalYear={fiscalYear} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content shell – shared card wrapper for all dashboards */}
      <div className="px-3 pb-10 pt-4 sm:px-6 sm:pt-6 lg:px-10">
        <section
          aria-label={`${displayName} financial dashboards`}
          className="mx-auto max-w-6xl"
        >
          <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm sm:p-6">
            {children}
          </div>
        </section>
      </div>
    </>
  );
}

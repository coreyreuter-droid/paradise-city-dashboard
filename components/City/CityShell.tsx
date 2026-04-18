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

        <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Financial transparency
              </p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-[rgb(var(--primary-rgb))] sm:text-xl lg:text-[1.4rem]">
                {displayName}
              </h1>
              {tagline && (
                <p className="mt-1 max-w-2xl text-xs text-slate-600">
                  {tagline}
                </p>
              )}
            </div>
            {/* Global Search */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <GlobalSearch fiscalYear={fiscalYear} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content area – no outer card, individual sections provide their own cards */}
      <div className="px-3 pb-10 pt-4 sm:px-6 sm:pt-6 lg:px-10">
        <section
          aria-label={`${displayName} financial dashboards`}
          className="mx-auto max-w-6xl"
        >
          {children}
        </section>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { CITY_CONFIG } from "@/lib/cityConfig";

function navItemClasses(active: boolean) {
  if (active) {
    return "rounded-md px-2 py-1 text-sm font-medium";
  }
  return "rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100";
}

function navItemStyle(active: boolean): CSSProperties | undefined {
  if (!active) return undefined;
  return {
    backgroundColor: CITY_CONFIG.primaryColor,
    color: CITY_CONFIG.primaryTextColor,
    fontWeight: 600,
  };
}

export default function ParadiseSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const basePath = `/${CITY_CONFIG.slug}`;

  const isHome =
    pathname === basePath || pathname === `${basePath}/`;

  // Treat department detail pages as part of Budget
  const isBudget =
    pathname.startsWith(`${basePath}/budget`) ||
    pathname.startsWith(`${basePath}/departments/`);

  // Only highlight Departments for the index listing page itself
  const isDepartments = pathname === `${basePath}/departments`;

  const isAnalytics = pathname.startsWith(`${basePath}/analytics`);
  const isTransactions = pathname.startsWith(`${basePath}/transactions`);

  // If we're on a department drilldown, pull dept name + year from URL
  let drilldownDept: string | null = null;
  let drilldownYear: string | null = null;

  if (pathname.startsWith(`${basePath}/departments/`)) {
    const segments = pathname.split("/");
    // ['', '{slug}', 'departments', 'Public%20Safety']
    const slug = segments[3] || "";
    if (slug) {
      drilldownDept = decodeURIComponent(slug);
    }
    const yearParam = searchParams.get("year");
    if (yearParam) {
      drilldownYear = yearParam;
    }
  }

  return (
    <aside className="w-56 border-r border-slate-200 bg-white/80">
      <div className="border-b border-slate-200 px-4 py-4">
        <Link
          href={basePath}
          className={navItemClasses(isHome)}
          style={navItemStyle(isHome)}
        >
          {CITY_CONFIG.displayName}
        </Link>
        <p className="mt-1 text-xs text-slate-500">
          {CITY_CONFIG.tagline}
        </p>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4">
        <Link
          href={`${basePath}/analytics`}
          className={navItemClasses(isAnalytics)}
          style={navItemStyle(isAnalytics)}
        >
          Analytics
        </Link>

        <div className="flex flex-col gap-0.5">
          <Link
            href={`${basePath}/budget`}
            className={navItemClasses(isBudget)}
            style={navItemStyle(isBudget)}
          >
            Budget
          </Link>

          {drilldownDept && (
            <div className="ml-3 text-[11px] text-slate-500">
              ↳ {drilldownDept}
              {drilldownYear ? ` (${drilldownYear})` : ""}
            </div>
          )}
        </div>

        <Link
          href={`${basePath}/departments`}
          className={navItemClasses(isDepartments)}
          style={navItemStyle(isDepartments)}
        >
          Departments
        </Link>

        <Link
          href={`${basePath}/transactions`}
          className={navItemClasses(isTransactions)}
          style={navItemStyle(isTransactions)}
        >
          Transactions
        </Link>
      </nav>
    </aside>
  );
}

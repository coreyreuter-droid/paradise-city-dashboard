"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function navItemClasses(active: boolean) {
  if (active) {
    return "rounded-md px-2 py-1 text-sm font-medium bg-slate-900 text-white";
  }
  return "rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100";
}

export default function ParadiseSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isHome =
    pathname === "/paradise" || pathname === "/paradise/";

  // Treat department detail pages as part of Budget
  const isBudget =
    pathname.startsWith("/paradise/budget") ||
    pathname.startsWith("/paradise/departments/");

  // Only highlight Departments for the index listing page itself
  const isDepartments = pathname === "/paradise/departments";

  const isAnalytics = pathname.startsWith("/paradise/analytics");
  const isTransactions = pathname.startsWith("/paradise/transactions");

  // If we're on a department drilldown, pull dept name + year from URL
  let drilldownDept: string | null = null;
  let drilldownYear: string | null = null;

  if (pathname.startsWith("/paradise/departments/")) {
    const segments = pathname.split("/");
    // ['', 'paradise', 'departments', 'Public%20Safety']
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
          href="/paradise"
          className={navItemClasses(isHome)}
        >
          Paradise City
        </Link>
        <p className="mt-1 text-xs text-slate-500">
          Transparency dashboard
        </p>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4">
        <Link
          href="/paradise/analytics"
          className={navItemClasses(isAnalytics)}
        >
          Analytics
        </Link>

        <div className="flex flex-col gap-0.5">
          <Link
            href="/paradise/budget"
            className={navItemClasses(isBudget)}
          >
            Budget
          </Link>

            {drilldownDept && (
            <div className="ml-3 text-[11px] text-slate-500">
                ↳ {drilldownDept}
            </div>
            )}

        </div>

        <Link
          href="/paradise/departments"
          className={navItemClasses(isDepartments)}
        >
          Departments
        </Link>

        <Link
          href="/paradise/transactions"
          className={navItemClasses(isTransactions)}
        >
          Transactions
        </Link>
      </nav>
    </aside>
  );
}

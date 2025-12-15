// app/[citySlug]/departments/[departmentName]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import { cityHref } from "@/lib/cityRouting";
import { formatCurrency } from "@/lib/format";
import {
  getPortalFiscalYears,
  getBudgetsForYear,
  getActualsForYear,
  getPortalSettings,
} from "@/lib/queries";
import type { BudgetRow, ActualRow } from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";

export const revalidate = 60;

type SearchParamsShape = { year?: string | string[] };

type PageProps = {
  params: { citySlug: string; departmentName: string };
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

function pickFirst(v: string | string[] | undefined) {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0) return v[0];
  return undefined;
}

export default async function DepartmentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const departmentName = decodeURIComponent(params.departmentName);

  const [portalSettings, yearsRaw] = await Promise.all([
    getPortalSettings(),
    getPortalFiscalYears(),
  ]);

  const settings = portalSettings as PortalSettings | null;

  if (settings && settings.is_published === false) {
    return <UnpublishedMessage settings={settings} />;
  }

  const years = (yearsRaw ?? []).slice().sort((a, b) => b - a);
  if (years.length === 0) {
    notFound();
  }

  const yearParam = pickFirst(sp?.year);
  const parsedYear = yearParam ? Number(yearParam) : NaN;

  const selectedYear =
    Number.isFinite(parsedYear) && years.includes(parsedYear)
      ? parsedYear
      : years[0]; // default to latest

  const [budgetsRaw, actualsRaw] = await Promise.all([
    getBudgetsForYear(selectedYear),
    getActualsForYear(selectedYear),
  ]);

  const budgets = (budgetsRaw ?? []).filter(
    (b) => (b.department_name || "Unspecified") === departmentName
  ) as BudgetRow[];

  const actuals = (actualsRaw ?? []).filter(
    (a) => (a.department_name || "Unspecified") === departmentName
  ) as ActualRow[];

  // If this department has no data for the chosen/default year, 404.
  // (We could optionally search other years, but that adds cost/complexity.)
  if (!budgets.length && !actuals.length) {
    notFound();
  }

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalActuals = actuals.reduce((s, a) => s + Number(a.amount || 0), 0);
  const variance = totalActuals - totalBudget;

  return (
    <div id="main-content" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-1 px-1 text-sm text-slate-600"
        >
          <ol className="flex items-center gap-1">
            <li>
              <Link href={cityHref("/overview")} className="hover:text-slate-800">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-500">
              ›
            </li>
            <li>
              <Link href={cityHref("/departments")} className="hover:text-slate-800">
                Departments
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-500">
              ›
            </li>
            <li aria-current="page" className="font-medium text-slate-700">
              {departmentName}
            </li>
          </ol>
        </nav>

        <h1 className="text-xl font-semibold text-slate-900">{departmentName}</h1>
        <p className="mt-1 text-sm text-slate-600">Fiscal year {selectedYear}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <section
            aria-label="Department budget total"
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Budget
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {formatCurrency(totalBudget)}
            </div>
          </section>

          <section
            aria-label="Department actuals total"
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Actuals
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {formatCurrency(totalActuals)}
            </div>
          </section>

          <section
            aria-label="Department variance"
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Variance (actuals − budget)
            </div>
            <div
              className={
                "mt-1 text-lg font-semibold " +
                (variance > 0
                  ? "text-red-700"
                  : variance < 0
                  ? "text-emerald-700"
                  : "text-slate-900")
              }
            >
              {formatCurrency(variance)}
            </div>
          </section>
        </div>

        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm text-slate-600">
            Tip: Add <span className="font-mono">?year=YYYY</span> to view a different fiscal year.
          </p>
        </div>
      </div>
    </div>
  );
}

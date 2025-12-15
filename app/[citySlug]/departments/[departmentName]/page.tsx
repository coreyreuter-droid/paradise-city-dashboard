// app/[citySlug]/departments/[departmentName]/page.tsx

import { notFound } from "next/navigation";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import {
  getBudgetsForYear,
  getActualsForYear,
  getPortalSettings,
} from "@/lib/queries";
import type { BudgetRow, ActualRow } from "@/lib/types";
import type { PortalSettings } from "@/lib/queries";

type PageProps = {
  params: {
    citySlug: string;
    departmentName: string;
  };
  searchParams: { year?: string | string[] } | Promise<{ year?: string | string[] }>;
};

function pickFirst(v: string | string[] | undefined) {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length) return v[0];
  return undefined;
}

export default async function DepartmentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const departmentName = decodeURIComponent(params.departmentName);

  const portalSettings = (await getPortalSettings()) as PortalSettings | null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  const yearParam = pickFirst(sp?.year);
  const parsedYear = yearParam ? Number(yearParam) : NaN;

  if (!Number.isFinite(parsedYear)) {
    notFound();
  }

  const [budgetsRaw, actualsRaw] = await Promise.all([
    getBudgetsForYear(parsedYear),
    getActualsForYear(parsedYear),
  ]);

  const budgets = (budgetsRaw ?? []).filter(
    (b) => b.department_name === departmentName
  ) as BudgetRow[];

  const actuals = (actualsRaw ?? []).filter(
    (a) => a.department_name === departmentName
  ) as ActualRow[];

  if (!budgets.length && !actuals.length) {
    notFound();
  }

  const totalBudget = budgets.reduce((s, b) => s + (b.amount || 0), 0);
  const totalActuals = actuals.reduce((s, a) => s + (a.amount || 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900">
        {departmentName}
      </h1>

      <p className="mt-1 text-sm text-slate-600">
        Fiscal year {parsedYear}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase text-slate-500">Budget</div>
          <div className="text-lg font-semibold">
            ${totalBudget.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase text-slate-500">Actuals</div>
          <div className="text-lg font-semibold">
            ${totalActuals.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

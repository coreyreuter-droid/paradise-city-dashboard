import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";
import MetricCard from "../../components/MetricCard";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { getAllBudgets, getAllActuals } from "@/lib/queries";
import type { BudgetRow, ActualRow } from "@/lib/types";

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

type Summary = {
  totalBudget: number;
  totalActuals: number;
  percentSpent: number;
};

async function getSummary(): Promise<Summary> {
  const [budgetsRaw, actualsRaw] = await Promise.all([
    getAllBudgets(),
    getAllActuals(),
  ]);

  const budgets: BudgetRow[] = budgetsRaw ?? [];
  const actuals: ActualRow[] = actualsRaw ?? [];

  const totalBudget =
    budgets.reduce((sum, row) => sum + Number(row.amount || 0), 0) || 0;

  const totalActuals =
    actuals.reduce((sum, row) => sum + Number(row.amount || 0), 0) || 0;

  const percentSpent =
    totalBudget > 0 ? Math.round((totalActuals / totalBudget) * 100) : 0;

  return { totalBudget, totalActuals, percentSpent };
}

export default async function CityDashboardPage() {
  const { totalBudget, totalActuals, percentSpent } = await getSummary();

  const variance = totalActuals - totalBudget;
  const executionLabel =
    totalBudget === 0
      ? "No budget data yet"
      : percentSpent < 90
      ? "Spending below budget"
      : percentSpent <= 110
      ? "Spending near budget"
      : "Spending above budget";

  const safePercent = Math.max(0, Math.min(100, percentSpent));

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Hero */}
        <SectionHeader
          title={`${CITY_CONFIG.displayName} Financial Dashboard`}
          description={CITY_CONFIG.tagline}
        />

        {/* Intro + primary navigation */}
        <section className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)]">
          {/* Summary + execution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Citywide budget overview
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Totals reflect all available fiscal years in the dataset.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {executionLabel}
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Total budget
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {formatCurrency(totalBudget)}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Total actuals
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {formatCurrency(totalActuals)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {percentSpent || 0}% of budget spent
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Variance
                </div>
                <div
                  className={[
                    "mt-1 text-2xl font-bold",
                    variance > 0
                      ? "text-emerald-700"
                      : variance < 0
                      ? "text-red-700"
                      : "text-slate-900",
                  ].join(" ")}
                >
                  {formatCurrency(variance)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Actuals {variance >= 0 ? "above" : "below"} budget
                </div>
              </div>
            </div>

            {/* Execution bar */}
            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                <span>Execution across all years</span>
                <span className="font-mono">
                  {percentSpent || 0}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${safePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Primary nav tiles */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Explore the data
            </h2>

            <div className="space-y-3">
              <Link
                href="/paradise/budget"
                className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-sky-300 hover:bg-sky-50/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-500">
                      Budget vs Actuals
                    </div>
                    <div className="mt-1 text-sm text-slate-800">
                      Compare budgets and spending by department.
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-sky-700">
                    View →
                  </span>
                </div>
              </Link>

              <Link
                href="/paradise/departments"
                className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-sky-300 hover:bg-sky-50/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-500">
                      Departments
                    </div>
                    <div className="mt-1 text-sm text-slate-800">
                      See which departments have the largest budgets and
                      most activity.
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-sky-700">
                    View →
                  </span>
                </div>
              </Link>

              <Link
                href="/paradise/transactions"
                className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-sky-300 hover:bg-sky-50/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-500">
                      Transactions
                    </div>
                    <div className="mt-1 text-sm text-slate-800">
                      Search individual payments by vendor, description, and
                      department.
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-sky-700">
                    View →
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Legacy metric cards row (kept for now) */}
        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total Budget (All Years)"
            value={formatCurrency(totalBudget)}
          />
          <MetricCard
            label="Total Actuals (All Years)"
            value={formatCurrency(totalActuals)}
          />
          <MetricCard
            label="% of Budget Spent"
            value={`${percentSpent || 0}%`}
          />
        </section>
      </div>
    </main>
  );
}

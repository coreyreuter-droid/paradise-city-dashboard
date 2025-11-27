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

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeader
          title={`${CITY_CONFIG.displayName} Dashboard`}
          description={CITY_CONFIG.tagline}
        />

        <section className="mt-6 grid gap-4 md:grid-cols-3">
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
            value={`${percentSpent}%`}
          />
        </section>
      </div>
    </main>
  );
}

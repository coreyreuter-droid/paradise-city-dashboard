import SectionHeader from "../../components/SectionHeader";
import MetricCard from "../../components/MetricCard";
import { supabase } from "../../lib/supabase";

async function getSummary() {
  const { data: budgetRows, error: budgetError } = await supabase
    .from("budgets")
    .select("amount");

  if (budgetError) {
    console.error("Error fetching budgets:", budgetError);
    return { totalBudget: 0, totalActuals: 0, percentSpent: 0 };
  }

  const totalBudget =
    budgetRows?.reduce((sum, row) => sum + Number(row.amount || 0), 0) || 0;

  const { data: actualRows, error: actualsError } = await supabase
    .from("actuals")
    .select("amount");

  if (actualsError) {
    console.error("Error fetching actuals:", actualsError);
    return { totalBudget, totalActuals: 0, percentSpent: 0 };
  }

  const totalActuals =
    actualRows?.reduce((sum, row) => sum + Number(row.amount || 0), 0) || 0;

  const percentSpent =
    totalBudget > 0 ? Math.round((totalActuals / totalBudget) * 100) : 0;

  return { totalBudget, totalActuals, percentSpent };
}

export default async function ParadisePage() {
  const { totalBudget, totalActuals, percentSpent } = await getSummary();

  const formatCurrency = (value: number) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <SectionHeader
          title="Paradise City Financial Dashboard"
          description="This is the prototype public dashboard for Paradise City. Budget, spending, and trends will live here."
        />

        <section className="grid gap-4 md:grid-cols-3">
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

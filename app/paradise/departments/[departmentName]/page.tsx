import { notFound } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import DepartmentBudgetClient from "@/components/Budget/DepartmentBudgetClient";

type PageProps = {
  params: Promise<{ departmentName: string }>;
  searchParams: Promise<{ year?: string }>;
};

type RawRow = {
  fiscal_year: number;
  department_name: string | null;
  amount: number;
};

type TransactionRow = {
  id: string | number;
  date: string;
  fiscal_year: number;
  description: string | null;
  amount: number;
  vendor: string | null;
  department_name: string | null;
};

const normalizeName = (name: string | null) =>
  name && name.trim().length > 0 ? name : "Unspecified";

export default async function DepartmentPage({
  params,
  searchParams,
}: PageProps) {
  const { departmentName } = await params;
  const { year } = await searchParams;

  const rawName = decodeURIComponent(departmentName);
  const displayName =
    rawName && rawName.trim().length > 0 ? rawName : "Unspecified";

  const yearFromQuery = year ? Number(year) : undefined;

  // Budgets + actuals filtered by department server-side
  let budgetQuery = supabase
    .from("budgets")
    .select("fiscal_year, department_name, amount");

  let actualQuery = supabase
    .from("actuals")
    .select("fiscal_year, department_name, amount");

  if (displayName === "Unspecified") {
    budgetQuery = budgetQuery.is("department_name", null);
    actualQuery = actualQuery.is("department_name", null);
  } else {
    budgetQuery = budgetQuery.eq("department_name", displayName);
    actualQuery = actualQuery.eq("department_name", displayName);
  }

  const [
    { data: budgetRows, error: budgetError },
    { data: actualRows, error: actualError },
  ] = await Promise.all([budgetQuery, actualQuery]);

  if (budgetError || actualError) {
    console.error("Department budget page error", { budgetError, actualError });
    return notFound();
  }

  const budgets: RawRow[] = (budgetRows ?? []) as RawRow[];
  const actuals: RawRow[] = (actualRows ?? []) as RawRow[];

  if (budgets.length === 0 && actuals.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <p className="mb-4 text-xs text-slate-500">
            ←{" "}
            <a href="/paradise/budget" className="hover:underline">
              Back to citywide budget
            </a>
          </p>
          <h1 className="text-lg font-semibold text-slate-900">
            {displayName}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            No budget or actuals data is available yet for this department.
          </p>
        </div>
      </main>
    );
  }

  const years = Array.from(
    new Set([
      ...budgets.map((b) => b.fiscal_year),
      ...actuals.map((a) => a.fiscal_year),
    ])
  ).sort((a, b) => b - a);

  const selectedYear =
    yearFromQuery && years.includes(yearFromQuery)
      ? yearFromQuery
      : years[0];

  // Transactions filtered by department server-side
  let txQuery = supabase
    .from("transactions")
    .select(
      "id, date, fiscal_year, description, amount, vendor, department_name"
    )
    .order("date", { ascending: false })
    .limit(500);

  if (displayName === "Unspecified") {
    txQuery = txQuery.is("department_name", null);
  } else {
    txQuery = txQuery.eq("department_name", displayName);
  }

  const { data: txRows, error: txError } = await txQuery;

  if (txError) {
    console.error("Department transactions error", txError);
  }

  const transactions: TransactionRow[] = (txRows ?? []) as TransactionRow[];

  return (
    <DepartmentBudgetClient
      departmentName={normalizeName(displayName)}
      budgets={budgets}
      actuals={actuals}
      selectedYear={selectedYear}
      years={years}
      transactions={transactions}
    />
  );
}

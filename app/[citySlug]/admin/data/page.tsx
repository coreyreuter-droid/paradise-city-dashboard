// app/[citySlug]/admin/data/page.tsx
import { notFound } from "next/navigation";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import {
  getAvailableFiscalYears,
  getRevenueYears,
  getTransactionYears,
  getPortalSettings,
} from "@/lib/queries";
import { supabaseAdmin } from "@/lib/supabaseService";
import DeleteYearButton from "@/components/Admin/DeleteYearButton";

export const revalidate = 0;

const ALLOWED_TABLES = [
  "budgets",
  "actuals",
  "transactions",
  "revenues",
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

type PageProps = {
  params: { citySlug: string };
};

async function getModuleYears() {
  const [budgetYearsRaw, revenueYearsRaw, txYearsRaw, settings] =
    await Promise.all([
      getAvailableFiscalYears(),
      getRevenueYears(),
      getTransactionYears(),
      getPortalSettings(),
    ]);

  const portalSettings = settings;

  if (!portalSettings) {
    notFound();
  }

  // Ensure consistent sort order: newest → oldest for all modules
  const budgetYears = [...(budgetYearsRaw ?? [])].sort((a, b) => b - a);
  const actualsYears = [...budgetYears]; // actuals should mirror budgets
  const revenueYears = [...(revenueYearsRaw ?? [])].sort((a, b) => b - a);
  const transactionYears = [...(txYearsRaw ?? [])].sort((a, b) => b - a);

  return {
    portalSettings,
    budgetYears,
    actualsYears,
    revenueYears,
    transactionYears,
  };
}

// Server action for deleting a fiscal year from a given table.
async function deleteYearAction(formData: FormData) {
  "use server";

  const tableRaw = formData.get("table");
  const fiscalYearRaw = formData.get("fiscalYear");

  const table = typeof tableRaw === "string" ? tableRaw : "";
  const fiscalYear = Number(fiscalYearRaw);

  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    console.error("DeleteYearAction: invalid table", table);
    return;
  }

  if (!Number.isFinite(fiscalYear) || fiscalYear <= 0) {
    console.error("DeleteYearAction: invalid fiscalYear", fiscalYearRaw);
    return;
  }

  // Perform the delete using supabaseAdmin (bypass RLS).
  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq("fiscal_year", fiscalYear);

  if (error) {
    console.error("DeleteYearAction: delete error", {
      table,
      fiscalYear,
      error,
    });
    return;
  }

  // Optional: log somewhere else if you want; uploads are already logged in data_uploads.
}

export default async function DataManagementPage({}: PageProps) {
  const {
    portalSettings,
    budgetYears,
    actualsYears,
    revenueYears,
    transactionYears,
  } = await getModuleYears();

  const govName = portalSettings.city_name || "Your gov";

  const anyYears =
    budgetYears.length ||
    actualsYears.length ||
    revenueYears.length ||
    transactionYears.length;

  return (
    <AdminGuard>
      <AdminShell
        title="Data management"
        description={`Review and delete historical fiscal-year data for ${govName}.`}
      >
        <div className="space-y-6">
          <section className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <h2 className="mb-1 text-sm font-semibold">
              Dangerous actions — use with care
            </h2>
            <p>
              Deleting a fiscal year is permanent. This will remove{" "}
              <span className="font-semibold">
                all rows with that fiscal_year
              </span>{" "}
              from the selected table. Use this to enforce retention (for
              example, only keeping the last 5 fiscal years) or to clean up
              bad uploads before reloading data. You will be asked to confirm
              each deletion.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Module data by fiscal year
            </h2>

            {!anyYears ? (
              <p className="text-sm text-slate-600">
                No fiscal-year data found yet. Upload budgets, actuals,
                transactions, or revenues to see available years.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Budgets */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Budgets
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Adopted budgets loaded into the portal. Typically you
                    should retain at least 3–5 fiscal years.
                  </p>
                  {budgetYears.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">
                      No budget data found.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {budgetYears.map((year) => (
                        <li
                          key={year}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>FY {year}</span>
                          <DeleteYearButton
                            table="budgets"
                            fiscalYear={year}
                            action={deleteYearAction}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Actuals */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Actuals
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Actual spending data used for Analytics and BvA views.
                    Retention should usually match budgets.
                  </p>
                  {actualsYears.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">
                      No actuals data found.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {actualsYears.map((year) => (
                        <li
                          key={year}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>FY {year}</span>
                          <DeleteYearButton
                            table="actuals"
                            fiscalYear={year}
                            action={deleteYearAction}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Transactions */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Transactions
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Line-item spending detail. Deleting a year here removes
                    those transactions from the public explorer.
                  </p>
                  {transactionYears.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">
                      No transaction data found.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {transactionYears.map((year) => (
                        <li
                          key={year}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>FY {year}</span>
                          <DeleteYearButton
                            table="transactions"
                            fiscalYear={year}
                            action={deleteYearAction}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Revenues */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Revenues
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Revenue records used by the Revenues explorer and
                    Analytics summaries.
                  </p>
                  {revenueYears.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">
                      No revenue data found.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {revenueYears.map((year) => (
                        <li
                          key={year}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>FY {year}</span>
                          <DeleteYearButton
                            table="revenues"
                            fiscalYear={year}
                            action={deleteYearAction}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}

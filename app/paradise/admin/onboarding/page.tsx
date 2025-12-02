// app/paradise/admin/onboarding/page.tsx
"use client";

import Link from "next/link";
import AdminGuard from "@/components/Auth/AdminGuard";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type HealthStatus = "loading" | "pass" | "warn" | "fail";

type CheckResults = {
  budgets: HealthStatus;
  actuals: HealthStatus;
  transactions: HealthStatus;
  portalSettings: HealthStatus;
  publish: HealthStatus;
};

export default function OnboardingPage() {
  const [checks, setChecks] = useState<CheckResults>({
    budgets: "loading",
    actuals: "loading",
    transactions: "loading",
    portalSettings: "loading",
    publish: "loading",
  });

  useEffect(() => {
    async function runHealthCheck() {
      const results: CheckResults = {
        budgets: "pass",
        actuals: "pass",
        transactions: "pass",
        portalSettings: "pass",
        publish: "loading",
      };

      // Budgets
      const { count: budgetsCount } = await supabase
        .from("budgets")
        .select("*", { count: "exact", head: true });
      if (!budgetsCount || budgetsCount === 0) results.budgets = "fail";

      // Actuals
      const { count: actualsCount } = await supabase
        .from("actuals")
        .select("*", { count: "exact", head: true });
      if (!actualsCount || actualsCount === 0) results.actuals = "fail";

      // Transactions
      const { count: txCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true });
      if (!txCount || txCount === 0) results.transactions = "fail";

      // Portal Settings + publish state
      const { data: ps, error: psError } = await supabase
        .from("portal_settings")
        .select("id, city_name, is_published")
        .maybeSingle();

      if (psError) {
        console.error("Onboarding: portal_settings error", psError);
        results.portalSettings = "fail";
        results.publish = "fail";
      } else if (!ps) {
        results.portalSettings = "fail";
        results.publish = "fail";
      } else {
        // Basic portal settings presence check
        results.portalSettings = ps.city_name ? "pass" : "warn";
        // Publish
        results.publish = ps.is_published ? "pass" : "warn";
      }

      setChecks(results);
    }

    runHealthCheck();
  }, []);

  const statusCircle = (status: HealthStatus) => {
    if (status === "loading")
      return (
        <div className="h-3 w-3 rounded-full bg-slate-400 animate-pulse" />
      );
    if (status === "pass")
      return <div className="h-3 w-3 rounded-full bg-emerald-500" />;
    if (status === "fail")
      return <div className="h-3 w-3 rounded-full bg-red-600" />;
    return <div className="h-3 w-3 rounded-full bg-amber-400" />;
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4">
            <Link
              href="/paradise/admin"
              className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <span className="mr-1">←</span>
              Back to admin home
            </Link>
          </div>

          <h1 className="mb-1 text-2xl font-bold text-slate-900">
            Onboarding Checklist
          </h1>
          <p className="mb-6 text-sm text-slate-600">
            Complete each step below to prepare your city’s CiviPortal for
            public launch.
          </p>

          <div className="space-y-4">
            {/* STEP 1 — Budgets */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {statusCircle(checks.budgets)}
                <div>
                  <p className="font-semibold text-slate-900">
                    Upload Budgets
                  </p>
                  <p className="text-xs text-slate-500">
                    Fiscal year budgets data
                  </p>
                </div>
              </div>
              <Link
                href="/paradise/admin/upload?table=budgets"
                className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-800"
              >
                Upload
              </Link>
            </div>

            {/* STEP 2 — Actuals */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {statusCircle(checks.actuals)}
                <div>
                  <p className="font-semibold text-slate-900">
                    Upload Actuals
                  </p>
                  <p className="text-xs text-slate-500">
                    YTD or monthly actuals
                  </p>
                </div>
              </div>
              <Link
                href="/paradise/admin/upload?table=actuals"
                className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-800"
              >
                Upload
              </Link>
            </div>

            {/* STEP 3 — Transactions */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {statusCircle(checks.transactions)}
                <div>
                  <p className="font-semibold text-slate-900">
                    Upload Transactions
                  </p>
                  <p className="text-xs text-slate-500">
                    Vendor-level spending
                  </p>
                </div>
              </div>
              <Link
                href="/paradise/admin/upload?table=transactions"
                className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-800"
              >
                Upload
              </Link>
            </div>

            {/* STEP 4 — Branding */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {statusCircle(checks.portalSettings)}
                <div>
                  <p className="font-semibold text-slate-900">
                    Branding & Settings
                  </p>
                  <p className="text-xs text-slate-500">
                    Logo, colors & tagline
                  </p>
                </div>
              </div>
              <Link
                href="/paradise/admin/settings"
                className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-800"
              >
                Edit
              </Link>
            </div>

            {/* STEP 5 — Publish */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {statusCircle(checks.publish)}
                <div>
                  <p className="font-semibold text-slate-900">
                    Publish Portal
                  </p>
                  <p className="text-xs text-slate-500">
                    Make portal visible to the public
                  </p>
                </div>
              </div>
              <Link
                href="/paradise/admin/publish"
                className="rounded-md bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-500"
              >
                Go
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}

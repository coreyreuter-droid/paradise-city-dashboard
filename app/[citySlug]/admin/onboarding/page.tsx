// app/[citySlug]/admin/onboarding/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";
import AdminShell from "@/components/Admin/AdminShell";

type HealthStatus = "loading" | "pass" | "warn" | "fail";

type CheckResults = {
  budgets: HealthStatus;
  actuals: HealthStatus;
  transactions: HealthStatus;
  revenues: HealthStatus;
  portalSettings: HealthStatus;
  publish: HealthStatus;
};

export default function OnboardingPage() {
  const [checks, setChecks] = useState<CheckResults>({
    budgets: "loading",
    actuals: "loading",
    transactions: "loading",
    revenues: "loading",
    portalSettings: "loading",
    publish: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    async function runChecks() {
      const results: CheckResults = {
        budgets: "pass",
        actuals: "pass",
        transactions: "pass",
        revenues: "pass",
        portalSettings: "pass",
        publish: "pass",
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

      // Revenues (optional module, depends on enable_revenues flag)
      const { count: revenuesCount } = await supabase
        .from("revenues")
        .select("*", { count: "exact", head: true });

      // Portal Settings + publish state + enable_revenues
      const { data: ps, error: psError } = await supabase
        .from("portal_settings")
        .select(
          "id, city_name, is_published, enable_revenues"
        )
        .maybeSingle();

      if (psError) {
        console.error("Onboarding: portal_settings error", psError);
        results.portalSettings = "fail";
        results.publish = "fail";
        // If we don't know enable_revenues, treat revenues as warn
        results.revenues = "warn";
      } else if (!ps) {
        results.portalSettings = "fail";
        results.publish = "fail";
        results.revenues = "warn";
      } else {
        if (!ps.city_name) {
          results.portalSettings = "warn";
        }

        results.publish = ps.is_published ? "pass" : "warn";

        const revenuesEnabled =
          ps.enable_revenues === true;

        if (!revenuesEnabled) {
          // Revenues module not enabled → no onboarding requirement
          results.revenues = "pass";
        } else {
          if (!revenuesCount || revenuesCount === 0) {
            results.revenues = "fail";
          } else {
            results.revenues = "pass";
          }
        }
      }

      if (!cancelled) {
        setChecks(results);
      }
    }

    runChecks();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusCircle = (status: HealthStatus) => {
    if (status === "loading") {
      return (
        <div className="h-3 w-3 animate-pulse rounded-full bg-slate-300" />
      );
    }
    if (status === "pass") {
      return <div className="h-3 w-3 rounded-full bg-emerald-500" />;
    }
    if (status === "fail") {
      return <div className="h-3 w-3 rounded-full bg-red-600" />;
    }
    return <div className="h-3 w-3 rounded-full bg-amber-400" />;
  };

  return (
    <AdminGuard>
      <AdminShell
        title="Onboarding checklist"
        description="Quick health check of your data, branding, and publish status before public launch."
      >
        <div className="space-y-4 text-sm text-slate-700">
          <p className="text-xs text-slate-600">
            Complete each step below to prepare your entity’s CiviPortal for
            public launch. Steps reflect the modules you have enabled.
          </p>

          {/* STEP 1 — Budgets */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              {statusCircle(checks.budgets)}
              <div>
                <p className="font-semibold text-slate-900">
                  Budget data
                </p>
                <p className="text-xs text-slate-500">
                  At least one year of budgets loaded
                </p>
              </div>
            </div>
            <Link
              href={cityHref("/admin/upload?table=budgets")}
              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
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
                  Actuals data
                </p>
                <p className="text-xs text-slate-500">
                  At least one year of actuals loaded
                </p>
              </div>
            </div>
            <Link
              href={cityHref("/admin/upload?table=actuals")}
              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
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
                  Transaction-level detail
                </p>
                <p className="text-xs text-slate-500">
                  Line-item transactions loaded for at least one year
                </p>
              </div>
            </div>
            <Link
              href={cityHref("/admin/upload?table=transactions")}
              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              Upload
            </Link>
          </div>

          {/* STEP 4 — Revenues (optional, controlled by enable_revenues) */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              {statusCircle(checks.revenues)}
              <div>
                <p className="font-semibold text-slate-900">
                  Revenues data
                </p>
                <p className="text-xs text-slate-500">
                  If the Revenues module is enabled, load at least one
                  year of revenue records.
                </p>
              </div>
            </div>
            <Link
              href={cityHref("/admin/upload?table=revenues")}
              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              Upload
            </Link>
          </div>

          {/* STEP 5 — Branding */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              {statusCircle(checks.portalSettings)}
              <div>
                <p className="font-semibold text-slate-900">
                  Branding & settings
                </p>
                <p className="text-xs text-slate-500">
                  Logo, colors & tagline
                </p>
              </div>
            </div>
            <Link
              href={cityHref("/admin/settings")}
              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              Edit
            </Link>
          </div>

          {/* STEP 6 — Publish */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              {statusCircle(checks.publish)}
              <div>
                <p className="font-semibold text-slate-900">
                  Publish status
                </p>
                <p className="text-xs text-slate-500">
                  Choose whether the portal is visible to the public
                </p>
              </div>
            </div>
            <Link
              href={cityHref("/admin/publish")}
              className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              Go
            </Link>
          </div>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}

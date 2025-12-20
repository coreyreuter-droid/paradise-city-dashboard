// app/[citySlug]/admin/onboarding/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";

type HealthStatus = "loading" | "pass" | "warn" | "fail";

type StepKey = "basic" | "branding" | "data" | "preview" | "publish";
type DatasetKey = "budgets" | "actuals" | "transactions" | "revenues";

type DatasetStatus = Record<DatasetKey, HealthStatus>;
type StepStatus = Record<StepKey, HealthStatus>;

type OnboardingStatus = StepStatus & {
  portalSettings: HealthStatus;
  datasets: DatasetStatus;
};

const INITIAL_STATUS: OnboardingStatus = {
  portalSettings: "loading",
  basic: "loading",
  branding: "loading",
  data: "loading",
  preview: "loading",
  publish: "loading",
  datasets: {
    budgets: "loading",
    actuals: "loading",
    transactions: "loading",
    revenues: "loading",
  },
};

const steps: { key: StepKey; title: string; description: string }[] = [
  {
    key: "basic",
    title: "Basic setup",
    description: "City name, fiscal year, and enabled modules.",
  },
  {
    key: "branding",
    title: "Branding",
    description: "Logo, colors, tagline, and hero content.",
  },
  {
    key: "data",
    title: "Data upload",
    description: "Budgets, actuals, transactions, and revenues.",
  },
  {
    key: "preview",
    title: "Public preview",
    description: "Review the site in draft before launch.",
  },
  {
    key: "publish",
    title: "Publish",
    description: "Make the site public once everything looks right.",
  },
];

function statusLabel(status: HealthStatus): string {
  switch (status) {
    case "loading":
      return "Checking";
    case "pass":
      return "Complete";
    case "warn":
      return "Needs attention";
    case "fail":
      return "Not started";
    default:
      return "";
  }
}

function statusCircle(status: HealthStatus) {
  const base = "h-3 w-3 rounded-full";
  if (status === "loading") {
    return (
      <span
        className={`${base} bg-slate-300 animate-pulse`}
        aria-hidden="true"
      />
    );
  }
  if (status === "pass") {
    return (
      <span
        className={`${base} bg-emerald-500`}
        aria-hidden="true"
      />
    );
  }
  if (status === "fail") {
    return (
      <span
        className={`${base} bg-red-600`}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className={`${base} bg-amber-400`}
      aria-hidden="true"
    />
  );
}

export default function AdminOnboardingPage() {
  const [status, setStatus] = useState<OnboardingStatus>(INITIAL_STATUS);
  const [activeStep, setActiveStep] = useState<StepKey>("basic");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const next: OnboardingStatus = {
        ...INITIAL_STATUS,
        datasets: { ...INITIAL_STATUS.datasets },
      };

      // --- Portal settings & basic / branding / publish / preview ---

      const { data: psRows, error: psError } = await supabase
        .from("portal_settings")
        .select("*")
        .limit(1);

      if (psError) {
        console.error("Onboarding: error loading portal_settings", psError);
        if (!cancelled) {
          setStatus({
            ...next,
            portalSettings: "fail",
            basic: "fail",
            branding: "fail",
            data: "warn",
            preview: "warn",
            publish: "fail",
          });
        }
        return;
      }

      const ps = psRows && psRows[0];

      if (!ps) {
        next.portalSettings = "fail";
        next.basic = "fail";
        next.branding = "warn";
        next.preview = "warn";
        next.publish = "fail";
      } else {
        next.portalSettings = "pass";

        const hasCityName =
          typeof ps.city_name === "string" && ps.city_name.trim().length > 0;

        const hasFiscalConfig =
          (ps.fiscal_year_start_month != null &&
            ps.fiscal_year_start_day != null) ||
          (typeof ps.fiscal_year_label === "string" &&
            ps.fiscal_year_label.trim().length > 0);

        const hasModuleConfig =
          ps.enable_budget != null ||
          ps.enable_actuals != null ||
          ps.enable_transactions != null ||
          ps.enable_revenues != null;

        let basicScore = 0;
        if (hasCityName) basicScore += 1;
        if (hasFiscalConfig) basicScore += 1;
        if (hasModuleConfig) basicScore += 1;

        if (basicScore === 3) {
          next.basic = "pass";
        } else if (basicScore > 0) {
          next.basic = "warn";
        } else {
          next.basic = "fail";
        }

        const hasBrandingCore =
          !!ps.logo_url ||
          !!ps.seal_url ||
          !!ps.primary_color ||
          !!ps.accent_color;

        const hasMessaging =
          (typeof ps.tagline === "string" &&
            ps.tagline.trim().length > 0) ||
          (typeof ps.hero_message === "string" &&
            ps.hero_message.trim().length > 0);

        if (hasBrandingCore && hasMessaging) {
          next.branding = "pass";
        } else if (hasBrandingCore || hasMessaging) {
          next.branding = "warn";
        } else {
          next.branding = "fail";
        }

        const isPublished = !!ps.is_published;
        next.publish = isPublished ? "pass" : "warn";
      }

      // --- Dataset counts for data / preview steps ---

      async function count(table: string): Promise<number> {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) {
          console.error(`Onboarding: error counting ${table}`, error);
          return 0;
        }

        return count ?? 0;
      }

      const [budgetsCount, actualsCount, transactionsCount, revenuesCount] =
        await Promise.all([
          count("budgets"),
          count("actuals"),
          count("transactions"),
          count("revenues"),
        ]);

      const mapCount = (value: number): HealthStatus =>
        value > 0 ? "pass" : "fail";

      next.datasets.budgets = mapCount(budgetsCount);
      next.datasets.actuals = mapCount(actualsCount);

      const transactionsEnabled = ps && ps.enable_transactions === true;
      const revenuesEnabled = ps && ps.enable_revenues === true;

      if (transactionsEnabled) {
        next.datasets.transactions = mapCount(transactionsCount);
      } else {
        // If the module is disabled, it should not block onboarding.
        next.datasets.transactions = "pass";
      }

      if (revenuesEnabled) {
        next.datasets.revenues = mapCount(revenuesCount);
      } else {
        next.datasets.revenues = "pass";
      }

      const datasetValues = Object.values(next.datasets);

      if (datasetValues.every((v) => v === "pass")) {
        next.data = "pass";
      } else if (datasetValues.some((v) => v === "fail")) {
        next.data = "fail";
      } else {
        next.data = "warn";
      }

      if (!ps) {
        next.preview = "fail";
      } else if (budgetsCount > 0 && actualsCount > 0) {
        next.preview = "pass";
      } else {
        next.preview = "warn";
      }

      if (!cancelled) {
        setStatus(next);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentStepIndex = steps.findIndex((step) => step.key === activeStep);
  const hasPrevious = currentStepIndex > 0;
  const hasNext = currentStepIndex < steps.length - 1;

  const goPrevious = () => {
    if (!hasPrevious) return;
    setActiveStep(steps[currentStepIndex - 1]?.key ?? "basic");
  };

  const goNext = () => {
    if (!hasNext) return;
    setActiveStep(steps[currentStepIndex + 1]?.key ?? "publish");
  };

  return (
    <AdminGuard>
      <AdminShell
        title="Onboarding wizard"
        description="A guided checklist to get your CiviPortal ready for residents."
      >
        <div className="flex flex-col gap-6">
          {/* Stepper navigation */}
          <nav aria-label="Onboarding steps">
            <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
              {steps.map((step, index) => {
                const stepStatus = status[step.key];
                const isActive = activeStep === step.key;

                return (
                  <li key={step.key} className="flex-1">
                    <button
                      type="button"
                      onClick={() => setActiveStep(step.key)}
                      className={`flex h-full w-full flex-col justify-between rounded-xl border px-3 py-2 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-slate-900 ${
                        isActive
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                      aria-current={isActive ? "step" : undefined}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {statusCircle(stepStatus)}
                          <span className="font-medium text-slate-900">
                            {index + 1}. {step.title}
                          </span>
                        </div>
                        <span className="text-xs text-slate-600">
                          {statusLabel(stepStatus)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {step.description}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Active step content */}
          <section
            aria-live="polite"
            aria-label="Onboarding step details"
            className="space-y-4"
          >
            {activeStep === "basic" && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Step 1 – Basic setup
                </h2>
                <p className="text-sm text-slate-600">
                  Confirm the city name, fiscal year configuration, and which
                  modules you plan to use. These settings control routing and
                  which pages are visible to residents.
                </p>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.basic)}
                      <div>
                        <p className="font-medium text-slate-900">
                          City details & modules
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          City name, fiscal year label, and which modules are
                          enabled.
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                          <li>City name and tagline</li>
                          <li>
                            Fiscal year start or label (for example,{" "}
                            <span className="font-mono">FY 2024–2025</span>)
                          </li>
                          <li>
                            Budget, actuals, transactions, and revenues toggles
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-xs text-slate-500">
                        Status: {statusLabel(status.basic)}
                      </p>
                      <Link
                        href={cityHref("/admin/settings")}
                        className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                      >
                        Edit basic settings
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === "branding" && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Step 2 – Branding
                </h2>
                <p className="text-sm text-slate-600">
                  Make the portal feel like an official city property with your
                  logo, seal, colors, and homepage messaging.
                </p>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.branding)}
                      <div>
                        <p className="font-medium text-slate-900">
                          Logo, colors & messaging
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Configure the hero message, tagline, and imagery that
                          residents will see first.
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                          <li>City logo and optional seal</li>
                          <li>Primary and accent colors</li>
                          <li>Hero headline and supporting text</li>
                          <li>Optional leader message and story content</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-xs text-slate-500">
                        Status: {statusLabel(status.branding)}
                      </p>
                      <Link
                        href={cityHref("/admin/settings")}
                        className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                      >
                        Edit branding
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === "data" && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Step 3 – Data upload
                </h2>
                <p className="text-sm text-slate-600">
                  Load at least one full fiscal year of data for each module you
                  plan to show. You can always add more years later. On the
                  upload page, you can download a CSV template for each table.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Budgets */}
                  <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.datasets.budgets)}
                      <div>
                        <p className="font-medium text-slate-900">Budgets</p>
                        <p className="mt-1 text-xs text-slate-600">
                          At least one year of adopted budget detail is
                          required.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Status: {statusLabel(status.datasets.budgets)}
                      </p>
                      <Link
                        href={cityHref("/admin/upload?table=budgets")}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                      >
                        Upload CSV
                      </Link>
                    </div>
                  </div>

                  {/* Actuals */}
                  <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.datasets.actuals)}
                      <div>
                        <p className="font-medium text-slate-900">Actuals</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Year-to-date or full fiscal year actuals to compare
                          against the budget.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Status: {statusLabel(status.datasets.actuals)}
                      </p>
                      <Link
                        href={cityHref("/admin/upload?table=actuals")}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                      >
                        Upload CSV
                      </Link>
                    </div>
                  </div>

                  {/* Transactions */}
                  <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.datasets.transactions)}
                      <div>
                        <p className="font-medium text-slate-900">
                          Transactions
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Line-item spending detail used by the Transactions
                          Explorer.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Status: {statusLabel(status.datasets.transactions)}
                      </p>
                      <Link
                        href={cityHref("/admin/upload?table=transactions")}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                      >
                        Upload CSV
                      </Link>
                    </div>
                  </div>

                  {/* Revenues */}
                  <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.datasets.revenues)}
                      <div>
                        <p className="font-medium text-slate-900">
                          Revenues
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Revenue detail powering the Revenues Explorer and
                          summaries.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Status: {statusLabel(status.datasets.revenues)}
                      </p>
                      <Link
                        href={cityHref("/admin/upload?table=revenues")}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                      >
                        Upload CSV
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === "preview" && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Step 4 – Public preview
                </h2>
                <p className="text-sm text-slate-600">
                  Review the public-facing site in draft mode. Confirm that the
                  homepage, overview, analytics, and explorers look correct on
                  both desktop and mobile.
                </p>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.preview)}
                      <div>
                        <p className="font-medium text-slate-900">
                          Preview your portal
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Your portal will show a draft banner until it is
                          published. Use this time to confirm content,
                          accessibility, and mobile layouts.
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                          <li>Check hero text and branding</li>
                          <li>Verify key KPIs on the Overview page</li>
                          <li>Spot-check Analytics, Revenues, and Transactions</li>
                          <li>Test keyboard navigation and screen reader labels</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-xs text-slate-500">
                        Status: {statusLabel(status.preview)}
                      </p>
                      <Link
                        href={cityHref("/")}
                        className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                      >
                        Open public preview
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === "publish" && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Step 5 – Publish
                </h2>
                <p className="text-sm text-slate-600">
                  When you&apos;re comfortable with the data, branding, and
                  accessibility, publish the site to make it visible to
                  residents.
                </p>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.publish)}
                      <div>
                        <p className="font-medium text-slate-900">
                          Final launch checklist
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Make sure the core steps above are in good shape
                          before publishing.
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                          <li>
                            Budgets and actuals loaded for at least one year
                          </li>
                          <li>Branding and homepage content set</li>
                          <li>
                            Feature flags configured for the modules you use
                          </li>
                          <li>Spot-check of KPIs and charts</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs text-slate-500">
                        Current status: {statusLabel(status.publish)}
                      </p>
                      <Link
                        href={cityHref("/admin/publish")}
                        className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        Go to publish step
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Step navigation controls */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={goPrevious}
              disabled={!hasPrevious}
              className={`inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                hasPrevious
                  ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                  : "cursor-not-allowed border-slate-100 text-slate-400"
              }`}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!hasNext}
              className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                hasNext
                  ? "bg-slate-900 hover:bg-slate-800"
                  : "cursor-not-allowed bg-slate-400"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}

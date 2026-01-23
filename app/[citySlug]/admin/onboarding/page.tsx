// app/[citySlug]/admin/onboarding/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";

type HealthStatus = "loading" | "pass" | "warn" | "fail";

type StepKey = "modules" | "branding" | "content" | "data" | "projects" | "preview" | "publish";
type DatasetKey = "budgets" | "actuals" | "transactions" | "revenues";

type DatasetStatus = Record<DatasetKey, HealthStatus>;
type StepStatus = Record<StepKey, HealthStatus>;

type OnboardingStatus = StepStatus & {
  portalSettings: HealthStatus;
  datasets: DatasetStatus;
  projectsEnabled: boolean;
};

const INITIAL_STATUS: OnboardingStatus = {
  portalSettings: "loading",
  modules: "loading",
  branding: "loading",
  content: "loading",
  data: "loading",
  projects: "loading",
  preview: "loading",
  publish: "loading",
  projectsEnabled: false,
  datasets: {
    budgets: "loading",
    actuals: "loading",
    transactions: "loading",
    revenues: "loading",
  },
};

const steps: { key: StepKey; title: string; description: string; optional?: boolean }[] = [
  {
    key: "modules",
    title: "Modules & Fiscal Year",
    description: "Enable features and set fiscal year start date.",
  },
  {
    key: "branding",
    title: "Branding & Images",
    description: "Logo, seal, hero image, colors, and gov name.",
  },
  {
    key: "content",
    title: "Landing Page Content",
    description: "Hero message, story sections, leadership, and stats.",
  },
  {
    key: "data",
    title: "Data Upload",
    description: "Budgets, actuals, transactions, and revenues.",
  },
  {
    key: "projects",
    title: "Capital Projects",
    description: "Add capital projects with images and details.",
    optional: true,
  },
  {
    key: "preview",
    title: "Preview",
    description: "Review the site before publishing.",
  },
  {
    key: "publish",
    title: "Publish",
    description: "Make the portal visible to residents.",
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
  const base = "h-3 w-3 rounded-full flex-shrink-0";
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
  const [activeStep, setActiveStep] = useState<StepKey>("modules");
  const [coverageWarnings, setCoverageWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const next: OnboardingStatus = {
        ...INITIAL_STATUS,
        datasets: { ...INITIAL_STATUS.datasets },
      };

      // --- Portal settings ---
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
            modules: "fail",
            branding: "fail",
            content: "fail",
            data: "warn",
            projects: "warn",
            preview: "warn",
            publish: "fail",
          });
        }
        return;
      }

      const ps = psRows && psRows[0];

      if (!ps) {
        next.portalSettings = "fail";
        next.modules = "fail";
        next.branding = "fail";
        next.content = "fail";
        next.preview = "warn";
        next.publish = "fail";
      } else {
        next.portalSettings = "pass";
        next.projectsEnabled = ps.enable_projects === true;

        // --- Modules & Fiscal Year check ---
        const hasCityName =
          typeof ps.city_name === "string" && ps.city_name.trim().length > 0;
        const hasFiscalConfig =
          ps.fiscal_year_start_month != null && ps.fiscal_year_start_day != null;
        const hasModuleConfig =
          ps.enable_budget != null ||
          ps.enable_actuals != null ||
          ps.enable_transactions != null ||
          ps.enable_revenues != null;

        let modulesScore = 0;
        if (hasCityName) modulesScore += 1;
        if (hasFiscalConfig) modulesScore += 1;
        if (hasModuleConfig) modulesScore += 1;

        if (modulesScore === 3) {
          next.modules = "pass";
        } else if (modulesScore > 0) {
          next.modules = "warn";
        } else {
          next.modules = "fail";
        }

        // --- Branding & Images check ---
        const hasLogo = !!ps.logo_url;
        const hasHero = !!ps.hero_image_url;
        const hasColors = !!ps.primary_color && !!ps.accent_color;
        const hasTagline =
          typeof ps.tagline === "string" && ps.tagline.trim().length > 0;

        let brandingScore = 0;
        if (hasLogo) brandingScore += 1;
        if (hasHero) brandingScore += 1;
        if (hasColors) brandingScore += 1;
        if (hasTagline) brandingScore += 1;

        if (brandingScore >= 3) {
          next.branding = "pass";
        } else if (brandingScore > 0) {
          next.branding = "warn";
        } else {
          next.branding = "fail";
        }

        // --- Content check ---
        const hasHeroMessage =
          typeof ps.hero_message === "string" && ps.hero_message.trim().length > 0;
        const hasGovDescription =
          typeof ps.story_city_description === "string" &&
          ps.story_city_description.trim().length > 0;
        const hasLeaderContent =
          (typeof ps.leader_name === "string" && ps.leader_name.trim().length > 0) ||
          (typeof ps.leader_message === "string" && ps.leader_message.trim().length > 0);

        let contentScore = 0;
        if (hasHeroMessage) contentScore += 1;
        if (hasGovDescription) contentScore += 1;
        if (hasLeaderContent) contentScore += 1;

        if (contentScore >= 2) {
          next.content = "pass";
        } else if (contentScore > 0) {
          next.content = "warn";
        } else {
          next.content = "fail";
        }

        // --- Publish status ---
        const isPublished = !!ps.is_published;
        next.publish = isPublished ? "pass" : "warn";
      }

      // --- Dataset counts ---
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

      // --- Capital Projects count ---
      let projectsCount = 0;
      if (next.projectsEnabled) {
        projectsCount = await count("capital_projects");
      }

      // --- Fiscal year coverage warnings ---
      async function maxFiscalYear(table: string): Promise<number | null> {
        const { data, error } = await supabase
          .from(table)
          .select("fiscal_year")
          .order("fiscal_year", { ascending: false })
          .limit(1);

        if (error) {
          console.error(`Onboarding: error reading max fiscal_year from ${table}`, error);
          return null;
        }

        const row = data && data[0];
        const fy = row?.fiscal_year;
        return typeof fy === "number" ? fy : fy != null ? Number(fy) : null;
      }

      const [maxBudgetFY, maxActualsFY, maxRevenuesFY] = await Promise.all([
        maxFiscalYear("budgets"),
        maxFiscalYear("actuals"),
        maxFiscalYear("revenues"),
      ]);

      const actualsEnabled = ps ? ps.enable_actuals !== false : true;
      const revenuesFeatureEnabled = ps ? ps.enable_revenues === true : false;

      const warnings: string[] = [];

      if (
        actualsEnabled &&
        maxBudgetFY != null &&
        maxActualsFY != null &&
        maxActualsFY > maxBudgetFY
      ) {
        warnings.push(
          `Actuals include FY${maxActualsFY}, but budgets are only loaded through FY${maxBudgetFY}. Upload the adopted budget for FY${maxActualsFY} to avoid showing $0 budget for that year.`
        );
      }

      if (
        revenuesFeatureEnabled &&
        maxBudgetFY != null &&
        maxRevenuesFY != null &&
        maxRevenuesFY > maxBudgetFY
      ) {
        warnings.push(
          `Revenues include FY${maxRevenuesFY}, but budgets are only loaded through FY${maxBudgetFY}. Upload the adopted budget for FY${maxRevenuesFY} to avoid mismatched year coverage.`
        );
      }

      if (!cancelled) {
        setCoverageWarnings(warnings);
      }

      // --- Dataset status ---
      const mapCount = (value: number): HealthStatus =>
        value > 0 ? "pass" : "fail";

      next.datasets.budgets = mapCount(budgetsCount);
      next.datasets.actuals = mapCount(actualsCount);

      const transactionsEnabled = ps && ps.enable_transactions === true;
      const revenuesEnabled = ps && ps.enable_revenues === true;

      if (transactionsEnabled) {
        next.datasets.transactions = mapCount(transactionsCount);
      } else {
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

      // --- Projects status ---
      if (next.projectsEnabled) {
        if (projectsCount > 0) {
          next.projects = "pass";
        } else {
          next.projects = "warn";
        }
      } else {
        next.projects = "pass"; // Not enabled, so not blocking
      }

      // --- Preview status ---
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

  // Filter steps based on whether projects are enabled
  const visibleSteps = steps.filter(
    (step) => step.key !== "projects" || status.projectsEnabled
  );

  const currentStepIndex = visibleSteps.findIndex((step) => step.key === activeStep);
  const hasPrevious = currentStepIndex > 0;
  const hasNext = currentStepIndex < visibleSteps.length - 1;

  const goPrevious = () => {
    if (!hasPrevious) return;
    setActiveStep(visibleSteps[currentStepIndex - 1]?.key ?? "modules");
  };

  const goNext = () => {
    if (!hasNext) return;
    setActiveStep(visibleSteps[currentStepIndex + 1]?.key ?? "publish");
  };

  return (
    <AdminGuard>
      <AdminShell
        title="Onboarding Checklist"
        description="A guided checklist to get your CiviPortal ready for residents."
      >
        <div className="flex flex-col gap-6">
          {/* Stepper navigation */}
          <nav aria-label="Onboarding steps">
            <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-3">
              {visibleSteps.map((step, index) => {
                const stepStatus = status[step.key];
                const isActive = activeStep === step.key;

                return (
                  <li key={step.key} className="flex-1 min-w-[140px]">
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
                        <span className="text-xs text-slate-700">
                          {stepStatus === "loading" ? "" : statusLabel(stepStatus)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-700">
                        {step.description}
                        {step.optional && (
                          <span className="ml-1 text-slate-500">(optional)</span>
                        )}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Coverage warnings */}
          {coverageWarnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Data coverage warnings
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800">
                {coverageWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step content */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            {/* Step 1: Modules & Fiscal Year */}
            {activeStep === "modules" && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Step 1 – Modules & Fiscal Year
                </h2>
                <p className="text-sm text-slate-700">
                  Configure which modules are visible to the public and set your fiscal year start date.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.modules)}
                      <div>
                        <p className="font-medium text-slate-900">Module Configuration</p>
                        <p className="mt-1 text-xs text-slate-700">
                          Enable the modules you want residents to see: Budget & Actuals, Transactions, Vendors, Revenues, and Capital Projects.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Link
                        href={cityHref("/admin/settings")}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Open Settings
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.modules)}
                      <div>
                        <p className="font-medium text-slate-900">Fiscal Year</p>
                        <p className="mt-1 text-xs text-slate-700">
                          Set your fiscal year start month (e.g., July 1 for most cities). This determines how months map to fiscal years.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Link
                        href={cityHref("/admin/settings")}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Configure
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Branding & Images */}
            {activeStep === "branding" && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Step 2 – Branding & Images
                </h2>
                <p className="text-sm text-slate-700">
                  Upload your logo, hero image, and configure colors to match your government&apos;s brand.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.branding)}
                      <div>
                        <p className="font-medium text-slate-900">Logo & Seal</p>
                        <p className="mt-1 text-xs text-slate-700">
                          Upload your government logo (required) and official seal (optional). PNG with transparency works best.
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Max file size: 5MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.branding)}
                      <div>
                        <p className="font-medium text-slate-900">Hero Image</p>
                        <p className="mt-1 text-xs text-slate-700">
                          A wide banner image for the landing page. Recommended size: 1920×600 or wider.
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Max file size: 5MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.branding)}
                      <div>
                        <p className="font-medium text-slate-900">Colors</p>
                        <p className="mt-1 text-xs text-slate-700">
                          Set headline color, button/highlight color, and sidebar color. Use a preset theme or customize.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.branding)}
                      <div>
                        <p className="font-medium text-slate-900">Gov Name & Tagline</p>
                        <p className="mt-1 text-xs text-slate-700">
                          Your government name (e.g., &ldquo;City of Springfield&rdquo;) and a short tagline for the portal.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link
                    href={cityHref("/admin/settings")}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  >
                    Open Branding Settings
                  </Link>
                </div>
              </div>
            )}

            {/* Step 3: Landing Page Content */}
            {activeStep === "content" && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Step 3 – Landing Page Content
                </h2>
                <p className="text-sm text-slate-700">
                  Fill in the story sections that appear on your public landing page.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.content)}
                      <div>
                        <p className="font-medium text-slate-900">Hero Message</p>
                        <p className="mt-1 text-xs text-slate-700">
                          The welcome text that appears over your hero image. Introduce residents to your transparency portal.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.content)}
                      <div>
                        <p className="font-medium text-slate-900">Gov Description</p>
                        <p className="mt-1 text-xs text-slate-700">
                          An &ldquo;About our community&rdquo; section describing your city, population, and what makes it unique.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.content)}
                      <div>
                        <p className="font-medium text-slate-900">Leadership</p>
                        <p className="mt-1 text-xs text-slate-700">
                          Add your mayor or city manager&apos;s name, title, photo, and a welcome message about transparency.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.content)}
                      <div>
                        <p className="font-medium text-slate-900">Gov Stats & Featured Projects</p>
                        <p className="mt-1 text-xs text-slate-700">
                          Population, employees, area stats, and optionally 1–3 featured projects with images.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link
                    href={cityHref("/admin/settings")}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  >
                    Open Content Settings
                  </Link>
                </div>
              </div>
            )}

            {/* Step 4: Data Upload */}
            {activeStep === "data" && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Step 4 – Data Upload
                </h2>
                <p className="text-sm text-slate-700">
                  Upload your financial data. At minimum, you need budgets and actuals for at least one fiscal year.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Budgets */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.datasets.budgets)}
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Budgets</p>
                        <p className="mt-1 text-xs text-slate-700">
                          Adopted budget by fund, department, and category. Required.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-slate-600">
                        {statusLabel(status.datasets.budgets)}
                      </p>
                      <Link
                        href={cityHref("/admin/upload?table=budgets")}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Upload CSV
                      </Link>
                    </div>
                  </div>

                  {/* Actuals */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.datasets.actuals)}
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Actuals</p>
                        <p className="mt-1 text-xs text-slate-700">
                          Year-to-date or full fiscal year spending. Required.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-slate-600">
                        {statusLabel(status.datasets.actuals)}
                      </p>
                      <Link
                        href={cityHref("/admin/upload?table=actuals")}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Upload CSV
                      </Link>
                    </div>
                  </div>

                  {/* Transactions */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.datasets.transactions)}
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Transactions</p>
                        <p className="mt-1 text-xs text-slate-700">
                          Line-item spending detail. Only needed if Transactions module is enabled.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-slate-600">
                        {statusLabel(status.datasets.transactions)}
                      </p>
                      <Link
                        href={cityHref("/admin/upload?table=transactions")}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Upload CSV
                      </Link>
                    </div>
                  </div>

                  {/* Revenues */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {statusCircle(status.datasets.revenues)}
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Revenues</p>
                        <p className="mt-1 text-xs text-slate-700">
                          Revenue by source and fund. Only needed if Revenues module is enabled.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-slate-600">
                        {statusLabel(status.datasets.revenues)}
                      </p>
                      <Link
                        href={cityHref("/admin/upload?table=revenues")}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Upload CSV
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Capital Projects (if enabled) */}
            {activeStep === "projects" && status.projectsEnabled && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Step 5 – Capital Projects
                </h2>
                <p className="text-sm text-slate-700">
                  Add your capital improvement projects with descriptions, budgets, timelines, and photos.
                </p>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    {statusCircle(status.projects)}
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">Capital Projects</p>
                      <p className="mt-1 text-xs text-slate-700">
                        Create projects for infrastructure investments like roads, parks, facilities, and utilities. Each project can have multiple images, budget information, and status updates.
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                        <li>Add a title, description, and category</li>
                        <li>Set budget, timeline, and current status</li>
                        <li>Upload project photos (up to 10 per project)</li>
                        <li>Optionally link to a budget department</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-600">
                      {statusLabel(status.projects)}
                    </p>
                    <Link
                      href={cityHref("/admin/projects")}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Manage Projects
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Preview */}
            {activeStep === "preview" && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Step {status.projectsEnabled ? "6" : "5"} – Preview
                </h2>
                <p className="text-sm text-slate-700">
                  Review the public-facing site in draft mode before publishing. Check that everything looks correct on desktop and mobile.
                </p>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    {statusCircle(status.preview)}
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">Preview Checklist</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                        <li>Landing page hero, branding, and messaging</li>
                        <li>Overview page KPIs and charts</li>
                        <li>Department drill-downs</li>
                        <li>Transactions and Revenues (if enabled)</li>
                        <li>Capital Projects page (if enabled)</li>
                        <li>Mobile layout and accessibility</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-600">
                      {statusLabel(status.preview)}
                    </p>
                    <Link
                      href={cityHref("/")}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Open Preview
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Publish */}
            {activeStep === "publish" && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Step {status.projectsEnabled ? "7" : "6"} – Publish
                </h2>
                <p className="text-sm text-slate-700">
                  When everything looks good, publish the portal to make it visible to residents.
                </p>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    {statusCircle(status.publish)}
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">Final Launch Checklist</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                        <li>Budgets and actuals loaded for at least one year</li>
                        <li>Branding complete (logo, colors, hero)</li>
                        <li>Landing page content filled in</li>
                        <li>Module flags configured correctly</li>
                        <li>Preview looks correct on desktop and mobile</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-600">
                      Current: {status.publish === "pass" ? "Published" : "Draft"}
                    </p>
                    <Link
                      href={cityHref("/admin/settings")}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Go to Publish Settings
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Step navigation */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={goPrevious}
              disabled={!hasPrevious}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
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
              className={`rounded-md px-3 py-2 text-sm font-medium text-white ${
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

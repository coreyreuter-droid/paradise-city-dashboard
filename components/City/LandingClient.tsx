// components/City/LandingClient.tsx
"use client";

import Link from "next/link";
import CardContainer from "@/components/CardContainer";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { cityHref } from "@/lib/cityRouting";
import type { PortalSettings } from "@/lib/queries";
import { formatCurrency, formatNumber } from "@/lib/format";

type Props = {
  portalSettings: PortalSettings | null;
};

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const LAST_DAY_OF_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function getFiscalYearPublicLabel(
  portalSettings: PortalSettings | null
): string | null {
  if (!portalSettings) return null;

  const anySettings = portalSettings as any;
  const explicitLabel = anySettings?.fiscal_year_label as
    | string
    | null
    | undefined;

  if (explicitLabel && explicitLabel.trim().length > 0) {
    return explicitLabel.trim();
  }

  const startMonth = anySettings?.fiscal_year_start_month as
    | number
    | null
    | undefined;
  const startDay = anySettings?.fiscal_year_start_day as
    | number
    | null
    | undefined;
  const endMonth = anySettings?.fiscal_year_end_month as
    | number
    | null
    | undefined;
  const endDay = anySettings?.fiscal_year_end_day as
    | number
    | null
    | undefined;

  if (!startMonth || !startDay || !endMonth || !endDay) {
    return null;
  }

  const startMonthName = MONTH_NAMES[startMonth] ?? "";
  const endMonthName = MONTH_NAMES[endMonth] ?? "";

  const startDayClamped = Math.max(
    1,
    Math.min(LAST_DAY_OF_MONTH[startMonth] ?? 31, startDay)
  );
  const endDayClamped = Math.max(
    1,
    Math.min(LAST_DAY_OF_MONTH[endMonth] ?? 31, endDay)
  );

  if (!startMonthName || !endMonthName) return null;

  const startLabel = `${startMonthName} ${String(startDayClamped).padStart(
    2,
    "0"
  )}`;
  const endLabel = `${endMonthName} ${String(endDayClamped).padStart(2, "0")}`;

  return `Fiscal year runs ${startLabel} – ${endLabel}.`;
}

export default function LandingClient({ portalSettings }: Props) {
  const cityName =
    portalSettings?.city_name || CITY_CONFIG.displayName || "Your City";
  const cityInitials = cityName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  const tagline =
    portalSettings?.tagline ||
    CITY_CONFIG.tagline ||
    "Financial Transparency Portal";

  const heroMessage =
    portalSettings?.hero_message ||
    "Welcome to your government’s financial transparency portal. Explore how public dollars are planned, spent, and invested.";

  const heroImageUrl = portalSettings?.hero_image_url || null;
  const heroBackground = portalSettings?.background_color || "#020617";
  const heroOverlay = "rgba(15, 23, 42, 0.65)";
  const sealUrl = portalSettings?.seal_url || null;

  const fiscalYearNote = getFiscalYearPublicLabel(portalSettings);

  const storyCityDescription =
    portalSettings?.story_city_description ??
    `Describe your community here—population, location, and what makes ${cityName} unique.`;

  const storyYearAchievements =
    portalSettings?.story_year_achievements ??
    "Highlight major accomplishments, new services, and improvements delivered this fiscal year.";

  const storyCapitalProjects =
    portalSettings?.story_capital_projects ??
    "Share key capital projects completed or underway—streets, facilities, parks, and infrastructure.";

  // NEW: nicer formatting for stats
  const statPopulationRaw = portalSettings?.stat_population?.trim() || "";
  const statEmployeesRaw = portalSettings?.stat_employees?.trim() || "";
  const statPopulation =
    statPopulationRaw ? formatNumber(statPopulationRaw) : "";
  const statEmployees =
    statEmployeesRaw ? formatNumber(statEmployeesRaw) : "";
  const statSquareMiles = portalSettings?.stat_square_miles?.trim() || "";
  const statAnnualBudgetRaw =
    portalSettings?.stat_annual_budget?.trim() || "";

  let statAnnualBudgetFormatted = "";
  if (statAnnualBudgetRaw) {
    const n = Number(statAnnualBudgetRaw.replace(/,/g, ""));
    statAnnualBudgetFormatted = Number.isFinite(n)
      ? formatCurrency(n)
      : statAnnualBudgetRaw;
  }

  // Visibility toggles (default true)
  const showLeadership = portalSettings?.show_leadership !== false;
  const showStory = portalSettings?.show_story !== false;
  const showYearReview = portalSettings?.show_year_review !== false;
  const showCapitalProjects =
    portalSettings?.show_capital_projects !== false;
  const showStats = portalSettings?.show_stats !== false;
  const showProjects = portalSettings?.show_projects !== false;

  // Feature flags
  const enableActuals =
    portalSettings?.enable_actuals === null ||
    portalSettings?.enable_actuals === undefined
      ? true
      : !!portalSettings.enable_actuals;

  const enableTransactions = portalSettings?.enable_transactions === true;

  const enableRevenues = portalSettings?.enable_revenues === true;

  const enableVendors =
    enableTransactions && portalSettings?.enable_vendors === true;

  const leaderName = portalSettings?.leader_name?.trim() || "";
  const leaderTitle = portalSettings?.leader_title?.trim() || "";
  const leaderMessage = portalSettings?.leader_message?.trim() || "";
  const leaderPhotoUrl = portalSettings?.leader_photo_url || null;

  const project1Title = portalSettings?.project1_title?.trim() || "Project 1";
  const project1Summary =
    portalSettings?.project1_summary?.trim() || "P 1 Summary";
  const project1ImageUrl = portalSettings?.project1_image_url || null;

  const project2Title = portalSettings?.project2_title?.trim() || "Project 2";
  const project2Summary =
    portalSettings?.project2_summary?.trim() || "P 2 Summary";
  const project2ImageUrl = portalSettings?.project2_image_url || null;

  const project3Title = portalSettings?.project3_title?.trim() || "Project 3";
  const project3Summary =
    portalSettings?.project3_summary?.trim() || "P 3 Summary";
  const project3ImageUrl = portalSettings?.project3_image_url || null;

  const showHero = true;

  return (
    <div className="w-full">
      {/* Hero */}
      {showHero && (
        <div
          className="relative w-full overflow-hidden border-b border-slate-200"
          style={{ backgroundColor: heroBackground }}
        >
          {heroImageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroImageUrl})` }}
              aria-hidden={true}
            />
          ) : (
            <div className="absolute inset-0" aria-hidden={true} />
          )}

          <div
            className="absolute inset-0"
            style={{ backgroundColor: heroOverlay }}
            aria-hidden={true}
          />

          <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white">
  {cityInitials || "YC"}
</div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/90">
                      {cityName}
                    </p>
                    <p className="text-sm text-white/70">{tagline}</p>
                  </div>
                </div>

                {sealUrl && (
                  <div className="mt-6 flex items-center gap-3">
                    <img
                      src={sealUrl}
                      alt={`Official seal ${cityName}`}
                      className="h-12 w-12 rounded-full bg-white/10 object-contain"
                      loading="lazy"
                    />
                    <span className="text-xs text-white/70">Official seal</span>
                  </div>
                )}

                {portalSettings?.tagline && (
                  <p className="mt-6 text-sm font-semibold text-white/90">
                    {portalSettings.tagline}
                  </p>
                )}

                {fiscalYearNote && (
                  <p className="mt-1 text-sm italic text-white/70">
                    {fiscalYearNote}
                  </p>
                )}

                <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {cityName} Transparency Portal
                </h1>

                <p className="mt-3 max-w-2xl text-base text-white/80 sm:text-lg">
                  {heroMessage}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={cityHref("/overview")}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    Go to Overview
                  </Link>

                  {enableActuals && (
                    <Link
                      href={cityHref("/analytics")}
                      className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    >
                      View Analytics
                    </Link>
                  )}
                </div>
              </div>

              <div className="w-full sm:max-w-sm">
                <CardContainer>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Explore the data
                    </p>

                    <div className="space-y-2">
                      <Link
                        href={cityHref("/overview")}
                        className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-900">
                          Overview dashboard
                        </span>{" "}
                        Budget & spending
                      </Link>

                      <Link
                        href={cityHref("/budget")}
                        className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-900">
                          Budget Explorer
                        </span>{" "}
                        Adopted budgets
                      </Link>

                      {enableActuals && (
                        <Link
                          href={cityHref("/departments")}
                          className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-900">
                            Departments
                          </span>{" "}
                          Spending by service area
                        </Link>
                      )}

                      {enableRevenues && (
                        <Link
                          href={cityHref("/revenues")}
                          className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-900">
                            Revenues
                          </span>{" "}
                          Where funding comes from
                        </Link>
                      )}

                      {enableTransactions && (
                        <Link
                          href={cityHref("/transactions")}
                          className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-900">
                            Transactions
                          </span>{" "}
                          Payments & vendors
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-10">
        {/* Leadership */}
        {showLeadership && (leaderName || leaderMessage) && (
          <CardContainer>
            <section aria-label="Leadership message" className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Leadership message
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {leaderPhotoUrl && (
                  <img
                    src={leaderPhotoUrl}
                    alt=""
                    className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
                    loading="lazy"
                  />
                )}

                <div className="min-w-0">
                  {leaderName && (
                    <p className="text-sm font-semibold text-slate-900">
                      {leaderName}
                      {leaderTitle ? (
                        <span className="text-slate-500">
                          {" "}
                          — {leaderTitle}
                        </span>
                      ) : null}
                    </p>
                  )}

                  {leaderMessage && (
                    <p className="mt-2 text-sm text-slate-700">
                      {leaderMessage}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </CardContainer>
        )}

        {/* About */}
        {showStory && (
          <CardContainer>
            <section aria-label="About our community" className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                About our community
              </h2>
              <p className="text-sm text-slate-700">
                {storyCityDescription}
              </p>
            </section>
          </CardContainer>
        )}

        {/* At a glance */}
        {showStats &&
          (statPopulation ||
            statEmployees ||
            statSquareMiles ||
            statAnnualBudgetFormatted) && (
            <CardContainer>
              <section
                aria-label="City statistics"
                className="space-y-3"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      At a glance
                    </h2>
                    <p className="text-xs text-slate-600">
                      Key figures that help put your community’s budget and
                      services in context.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {statPopulation && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        Population
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {statPopulation}
                      </p>
                    </div>
                  )}

                  {statEmployees && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        City employees
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {statEmployees}
                      </p>
                    </div>
                  )}

                  {statSquareMiles && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        Area (sq. miles)
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {statSquareMiles}
                      </p>
                    </div>
                  )}

                  {statAnnualBudgetFormatted && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        Annual budget
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {statAnnualBudgetFormatted}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-600">
                        All funds, adopted.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </CardContainer>
          )}

        {/* Year in review */}
        {showYearReview && (
          <CardContainer>
            <section aria-label="Year in review" className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Year in review
              </h2>
              <p className="text-sm text-slate-700">
                {storyYearAchievements}
              </p>
            </section>
          </CardContainer>
        )}

        {/* Capital projects */}
        {showCapitalProjects && (
          <CardContainer>
            <section aria-label="Capital projects" className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Capital projects
              </h2>
              <p className="text-sm text-slate-700">
                {storyCapitalProjects}
              </p>
            </section>
          </CardContainer>
        )}

        {/* Featured projects */}
        {showProjects && (
          <CardContainer>
            <section aria-label="Featured projects" className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Featured projects
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  A selection of major capital and community projects your
                  local government has delivered or is working on.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {[1, 2, 3].map((i) => {
                  const title =
                    i === 1 ? project1Title : i === 2 ? project2Title : project3Title;
                  const summary =
                    i === 1
                      ? project1Summary
                      : i === 2
                      ? project2Summary
                      : project3Summary;
                  const imageUrl =
                    i === 1
                      ? project1ImageUrl
                      : i === 2
                      ? project2ImageUrl
                      : project3ImageUrl;

                  return (
                    <article
                      key={i}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-36 w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="h-36 w-full bg-slate-100"
                          aria-hidden={true}
                        />
                      )}

                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {title}
                        </h3>
                        <p className="mt-2 text-sm text-slate-700">
                          {summary}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </CardContainer>
        )}
      </div>
    </div>
  );
}

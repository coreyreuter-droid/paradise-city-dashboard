// components/City/LandingClient.tsx
"use client";

import Link from "next/link";
import CardContainer from "@/components/CardContainer";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { cityHref } from "@/lib/cityRouting";
import type { PortalSettings } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";

type Props = {
  portalSettings: PortalSettings | null;
};

export default function LandingClient({ portalSettings }: Props) {
  const cityName =
    portalSettings?.city_name || CITY_CONFIG.displayName || "Your City";

  const tagline =
    portalSettings?.tagline ||
    CITY_CONFIG.tagline ||
    "Financial Transparency Portal";

  const heroMessage =
    portalSettings?.hero_message ||
    "Welcome to your city’s financial transparency portal. Explore how public dollars are planned, spent, and invested.";

  const heroImageUrl = portalSettings?.hero_image_url || null;
  const heroBackground =
    portalSettings?.background_color || "#020617";
  const heroOverlay = "rgba(15, 23, 42, 0.65)";
  const sealUrl = portalSettings?.seal_url || null;

  const storyCityDescription =
    portalSettings?.story_city_description ??
    `Describe your community here—population, location, and what makes ${cityName} unique.`;

  const storyYearAchievements =
    portalSettings?.story_year_achievements ??
    "Highlight major accomplishments, new services, and improvements delivered this fiscal year.";

  const storyCapitalProjects =
    portalSettings?.story_capital_projects ??
    "Share key capital projects completed or underway—streets, facilities, parks, and infrastructure.";

  const statPopulation = portalSettings?.stat_population?.trim() || "";
  const statEmployees = portalSettings?.stat_employees?.trim() || "";
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

  const enableTransactions =
    portalSettings?.enable_transactions === true;

  const enableRevenues =
    portalSettings?.enable_revenues === true;

  const enableVendors =
    enableTransactions && portalSettings?.enable_vendors === true;

  const leaderName = portalSettings?.leader_name?.trim() || "";
  const leaderTitle = portalSettings?.leader_title?.trim() || "";
  const leaderMessage = portalSettings?.leader_message?.trim() || "";
  const leaderPhotoUrl = portalSettings?.leader_photo_url?.trim() || "";

  const hasLeaderBlock =
    showLeadership && !!(leaderName || leaderTitle || leaderMessage);

  const projects = [
    {
      title: portalSettings?.project1_title?.trim() || "",
      summary: portalSettings?.project1_summary?.trim() || "",
      imageUrl: portalSettings?.project1_image_url?.trim() || "",
    },
    {
      title: portalSettings?.project2_title?.trim() || "",
      summary: portalSettings?.project2_summary?.trim() || "",
      imageUrl: portalSettings?.project2_image_url?.trim() || "",
    },
    {
      title: portalSettings?.project3_title?.trim() || "",
      summary: portalSettings?.project3_summary?.trim() || "",
      imageUrl: portalSettings?.project3_image_url?.trim() || "",
    },
  ].filter((p) => p.title || p.summary || p.imageUrl);

  const quickLinkBase =
    "flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-slate-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900";

  return (
    <div
      id="main-content"
      className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 sm:py-8"
    >
      {/* HERO */}
      <section
        aria-label={`${cityName} transparency portal introduction`}
        className="relative overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-900 px-4 py-6 text-slate-50 shadow-sm sm:px-6 sm:py-8 md:px-8 md:py-10"
        style={{ backgroundColor: heroBackground }}
      >
        {heroImageUrl && (
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ backgroundColor: heroOverlay }}
            />
          </div>
        )}

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Left: text + CTAs */}
          <div className="max-w-xl text-slate-50">
            {sealUrl && (
              <div className="mb-3 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sealUrl}
                  alt={`${cityName} city seal`}
                  className="h-14 w-14 rounded-full border border-slate-700 bg-slate-950 object-contain shadow-sm"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Official seal
                  </span>
                  <span className="text-sm font-medium text-slate-50">
                    {cityName}
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
              {tagline}
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
              {cityName} Transparency Portal
            </h1>
            <p className="mt-3 text-sm text-slate-100/90">
              {heroMessage}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={cityHref("/overview")}
                className="inline-flex items-center justify-center rounded-full bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-900 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Go to Overview
              </Link>
              {enableActuals && (
                <Link
                  href={cityHref("/analytics")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300/60 bg-slate-900/40 px-4 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  View Analytics
                </Link>
              )}
            </div>
          </div>

          {/* Right: quick nav list */}
          <div className="w-full max-w-xs rounded-xl bg-slate-900/60 p-3 text-xs text-slate-100 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
              Explore the data
            </p>
            <ul className="space-y-1.5">
              {/* Overview – always available (no default “active” state) */}
              <li>
                <Link
                  href={cityHref("/overview")}
                  className={quickLinkBase}
                >
                  <span>Overview dashboard</span>
                  <span className="text-xs text-slate-200">
                    Budget &amp; spending
                  </span>
                </Link>
              </li>

              {/* Budget – always available */}
              <li>
                <Link
                  href={cityHref("/budget")}
                  className={quickLinkBase}
                >
                  <span>Budget Explorer</span>
                  <span className="text-xs text-slate-200">
                    Adopted budgets
                  </span>
                </Link>
              </li>

              {/* Departments – only if Actuals module is enabled */}
              {enableActuals && (
                <li>
                  <Link
                    href={cityHref("/departments")}
                    className={quickLinkBase}
                  >
                    <span>Departments</span>
                    <span className="text-xs text-slate-200">
                      Spending by service area
                    </span>
                  </Link>
                </li>
              )}

              {/* Revenues – only if Revenues module is enabled */}
              {enableRevenues && (
                <li>
                  <Link
                    href={cityHref("/revenues")}
                    className={quickLinkBase}
                  >
                    <span>Revenues</span>
                    <span className="text-xs text-slate-200">
                      Where funding comes from
                    </span>
                  </Link>
                </li>
              )}

              {/* Transactions – only if Transactions module is enabled */}
              {enableTransactions && (
                <li>
                  <Link
                    href={cityHref("/transactions")}
                    className={quickLinkBase}
                  >
                    <span>Transactions</span>
                    <span className="text-xs text-slate-200">
                      {enableVendors
                        ? "Payments &amp; vendors"
                        : "Payments"}
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Leadership welcome */}
      {hasLeaderBlock && (
        <CardContainer>
          <section
            aria-label="Leadership message"
            className="mt-0 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-start sm:p-5"
          >
            {leaderPhotoUrl && (
              <div className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={leaderPhotoUrl}
                  alt={leaderName || "City leader"}
                  className="h-16 w-16 rounded-full border border-slate-200 object-cover sm:h-20 sm:w-20"
                />
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                Leadership message
              </p>
              {(leaderName || leaderTitle) && (
                <p className="text-sm font-semibold text-slate-900">
                  {leaderName}
                  {leaderTitle && (
                    <span className="font-normal text-slate-600">
                      {leaderName ? " — " : ""}
                      {leaderTitle}
                    </span>
                  )}
                </p>
              )}
              {leaderMessage && (
                <p className="text-sm leading-relaxed text-slate-700">
                  {leaderMessage}
                </p>
              )}
            </div>
          </section>
        </CardContainer>
      )}

      {/* About our community */}
      {showStory && (
        <CardContainer>
          <section
            aria-label="About our community"
            className="space-y-2"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              About our community
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">
              {storyCityDescription}
            </p>
          </section>
        </CardContainer>
      )}

      {/* City stats */}
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
                    City at a glance
                  </h2>
                  <p className="text-xs text-slate-600">
                    Key figures that help put your community’s budget and
                    services in context.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <section
            aria-label="Year in review"
            className="space-y-2"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              Year in review
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">
              {storyYearAchievements}
            </p>
          </section>
        </CardContainer>
      )}

      {/* Capital projects overview */}
      {showCapitalProjects && (
        <CardContainer>
          <section
            aria-label="Capital projects overview"
            className="space-y-2"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              Capital projects
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">
              {storyCapitalProjects}
            </p>
          </section>
        </CardContainer>
      )}

      {/* Featured projects */}
      {showProjects && projects.length > 0 && (
        <CardContainer>
          <section
            aria-label="Featured city projects"
            className="space-y-3"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Featured projects
                </h2>
                <p className="text-xs text-slate-600">
                  A selection of major capital and community projects your
                  local government has delivered or is working on.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {projects.map((project, idx) => (
                <article
                  key={idx}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  {project.imageUrl && (
                    <div className="h-32 w-full overflow-hidden border-b border-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.imageUrl}
                        alt={project.title || `Project ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    {project.title && (
                      <h3 className="text-sm font-semibold text-slate-900">
                        {project.title}
                      </h3>
                    )}
                    {project.summary && (
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {project.summary}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </CardContainer>
      )}
    </div>
  );
}

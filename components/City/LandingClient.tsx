// components/City/LandingClient.tsx
"use client";

import Link from "next/link";
import CardContainer from "@/components/CardContainer";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { cityHref } from "@/lib/cityRouting";
import type { PortalSettings } from "@/lib/queries";

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
    portalSettings?.background_color || "#020617"; // slate-950 fallback
  const heroOverlay = "rgba(15, 23, 42, 0.65)";

  const storyCityDescription =
    portalSettings?.story_city_description ??
    `Describe your community here—population, location, and what makes ${cityName} unique.`;

  const storyYearAchievements =
    portalSettings?.story_year_achievements ??
    "Highlight major accomplishments, new services, and improvements delivered this fiscal year.";

  const storyCapitalProjects =
    portalSettings?.story_capital_projects ??
    "Share key capital projects completed or underway—streets, facilities, parks, and infrastructure.";

  const leaderName = portalSettings?.leader_name?.trim() || "";
  const leaderTitle = portalSettings?.leader_title?.trim() || "";
  const leaderMessage = portalSettings?.leader_message?.trim() || "";
  const leaderPhotoUrl = portalSettings?.leader_photo_url?.trim() || "";

  const hasLeaderBlock = !!(leaderName || leaderTitle || leaderMessage);

  const projects = [
    {
      title: portalSettings?.project1_title?.trim() || "",
      summary: portalSettings?.project1_summary?.trim() || "",
    },
    {
      title: portalSettings?.project2_title?.trim() || "",
      summary: portalSettings?.project2_summary?.trim() || "",
    },
    {
      title: portalSettings?.project3_title?.trim() || "",
      summary: portalSettings?.project3_summary?.trim() || "",
    },
  ].filter((p) => p.title || p.summary);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-4 sm:py-8">
      {/* HERO */}
      <section
        aria-label={`${cityName} transparency portal introduction`}
        className="relative overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-900 text-slate-50 shadow-sm px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10"
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {tagline}
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
              {cityName} Transparency Portal
            </h1>
            <p className="mt-3 text-sm text-slate-100/80">
              {heroMessage}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={cityHref("/overview")}
                className="inline-flex items-center justify-center rounded-full bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-900 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Go to Overview
              </Link>
              <Link
                href={cityHref("/analytics")}
                className="inline-flex items-center justify-center rounded-full border border-slate-300/60 bg-slate-900/40 px-4 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                View Analytics
              </Link>
            </div>
          </div>

          {/* Right: quick nav list */}
          <div className="w-full max-w-xs rounded-xl bg-slate-900/60 p-3 text-xs text-slate-100 shadow-sm">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
              Explore the data
            </p>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href={cityHref("/overview")}
                  className="flex items-center justify-between rounded-md bg-slate-900/40 px-2 py-1.5 hover:bg-slate-800/80"
                >
                  <span>Overview dashboard</span>
                  <span className="text-[10px] text-slate-300">
                    Budget &amp; spending
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href={cityHref("/budget")}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-900/40"
                >
                  <span>Budget Explorer</span>
                  <span className="text-[10px] text-slate-300">
                    Adopted budgets
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href={cityHref("/departments")}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-900/40"
                >
                  <span>Departments</span>
                  <span className="text-[10px] text-slate-300">
                    Spending by service area
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href={cityHref("/revenues")}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-900/40"
                >
                  <span>Revenues</span>
                  <span className="text-[10px] text-slate-300">
                    Where funding comes from
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href={cityHref("/transactions")}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-900/40"
                >
                  <span>Transactions</span>
                  <span className="text-[10px] text-slate-300">
                    Payments &amp; vendors
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* City story / accomplishments */}
      <CardContainer>
        <section
          aria-label={`${cityName} story and annual highlights`}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            {portalSettings?.seal_url && (
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portalSettings.seal_url ?? ""}
                  alt={`${cityName} city seal`}
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Our community &amp; recent progress
              </h2>
              <p className="text-xs text-slate-600">
                A quick look at who we are, what we accomplished this year,
                and major capital projects.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* About our community */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                About our community
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {storyCityDescription}
              </p>
            </div>

            {/* Year in review */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Year in review
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {storyYearAchievements}
              </p>
            </div>

            {/* Capital projects */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Capital projects
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {storyCapitalProjects}
              </p>
            </div>
          </div>
        </section>
      </CardContainer>

      {/* Leadership welcome */}
      {hasLeaderBlock && (
        <CardContainer>
          <section
            aria-label="Leadership message"
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-start sm:p-5"
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
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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

      {/* Featured projects */}
      {projects.length > 0 && (
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
                  city has delivered or is working on.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {projects.map((project, idx) => (
                <article
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
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
                </article>
              ))}
            </div>
          </section>
        </CardContainer>
      )}
    </div>
  );
}

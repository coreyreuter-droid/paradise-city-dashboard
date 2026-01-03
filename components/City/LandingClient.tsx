// components/City/LandingClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CardContainer from "@/components/CardContainer";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { cityHref } from "@/lib/cityRouting";
import type { PortalSettings } from "@/lib/queries";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getFiscalYearLabel } from "@/lib/fiscalYear";

type Props = {
  portalSettings: PortalSettings | null;
  totalBudget: number | null;
};

/* ---------- Small inline icons (no deps) ---------- */
function IconMessage() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden={true}>
      <path
        d="M5 6.8c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v7.2c0 1.1-.9 2-2 2H10l-3.2 2.6c-.6.5-1.8.1-1.8-.8V16c-.6-.3-1-.9-1-1.6V6.8z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden={true}>
      <path
        d="M9 18.2l-4 1.6V6.6L9 5m0 13.2l6-2.4m-6 2.4V5m6 10.8l4 1.6V4.2l-4-1.6m0 13.2V2.6M15 2.6L9 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden={true}>
      <path
        d="M7 3.8v2.4M17 3.8v2.4M5.5 8.2h13M6.6 5.8h10.8c1 0 1.8.8 1.8 1.8v11c0 1-.8 1.8-1.8 1.8H6.6c-1 0-1.8-.8-1.8-1.8v-11c0-1 .8-1.8 1.8-1.8z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconConstruction() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden={true}>
      <path
        d="M3.8 20.2h16.4M7 20.2V11l5-3.2 5 3.2v9.2M9.2 11.2v2.3m5.6-2.3v2.3M12 3.8l1.6 2.8-1.6 1-1.6-1L12 3.8z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- Section card with accent rail + icon ---------- */
function SectionCard({
  ariaLabel,
  accent,
  eyebrow,
  title,
  icon,
  children,
}: {
  ariaLabel: string;
  accent: string;
  eyebrow?: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <CardContainer>
      <section aria-label={ariaLabel}>
        {/* Stretch to card edges so the rail touches the outside */}
          <div className="group relative -mx-4 -my-4 overflow-hidden px-4 py-4">
            {/* Left accent rail */}
            <div
              aria-hidden={true}
              className="absolute inset-y-0 left-0 w-1 opacity-20 transition-opacity duration-200 group-hover:opacity-35 group-focus-within:opacity-35"
              style={{ backgroundColor: accent }}
            />


          <div className="pl-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {eyebrow ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {eyebrow}
                  </p>
                ) : null}

                <div className="mt-2 flex items-center gap-2">
                  <span
                    aria-hidden={true}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    {icon}
                  </span>

                  <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
                </div>
              </div>
            </div>

            <div className="mt-3 h-px bg-slate-100" aria-hidden={true} />
            <div className="mt-3">{children}</div>

          </div>
        </div>
      </section>
    </CardContainer>
  );
}

function MiniViz({
  kind,
  accent,
}: {
  kind: "bars" | "line" | "dots" | "stack";
  accent: string;
}) {
  // Purely decorative—no info is conveyed only via color/shape.
  return (
    <div aria-hidden={true} className="mt-3">
      {kind === "bars" && (
        <div className="flex items-end gap-1">
          {["h-2", "h-3", "h-2.5", "h-4", "h-3.5", "h-2.5"].map((h, i) => (
            <span
              key={i}
              className={`w-2 rounded-sm bg-slate-200 ${h}`}
              style={i === 3 ? { backgroundColor: accent } : undefined}
            />
          ))}
        </div>
      )}

      {kind === "line" && (
        <svg viewBox="0 0 120 28" className="h-7 w-full">
          <path
            d="M2 22 C 18 18, 26 12, 40 16 C 54 20, 64 6, 78 10 C 92 14, 102 8, 118 6"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M2 22 C 18 18, 26 12, 40 16 C 54 20, 64 6, 78 10 C 92 14, 102 8, 118 6"
            fill="none"
            stroke={accent}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      )}

      {kind === "dots" && (
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-slate-200"
              style={i === 2 ? { backgroundColor: accent } : undefined}
            />
          ))}
          <span className="h-2 w-7 rounded-full bg-slate-200" />
        </div>
      )}

      {kind === "stack" && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-300"
                style={{
                  width: i === 0 ? "72%" : i === 1 ? "55%" : "40%",
                  ...(i === 0 ? { backgroundColor: accent } : undefined),
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tile({
  href,
  title,
  description,
  eyebrow,
  accent,
  viz,
}: {
  href: string;
  title: string;
  description: string;
  eyebrow: string;
  accent: string;
  viz: "bars" | "line" | "dots" | "stack";
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </p>
          <h3 className="mt-1 truncate text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>

        <span
          aria-hidden={true}
          className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition group-hover:bg-white"
        >
          →
        </span>
      </div>

      <MiniViz kind={viz} accent={accent} />

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-10 rounded-full" style={{ backgroundColor: accent }} />
      </div>
    </Link>
  );
}

type QuickLink = {
  href: string;
  label: string;
  sublabel: string;
};

export default function LandingClient({ portalSettings, totalBudget }: Props) {
  const cityName = portalSettings?.city_name || CITY_CONFIG.displayName || "Your City";

  const tagline =
    portalSettings?.tagline || CITY_CONFIG.tagline || "Financial Transparency Portal";

  const heroMessage =
    portalSettings?.hero_message ||
    "Explore how public dollars are planned, spent, and invested—using clear charts, searchable data, and department-level detail.";

  const heroImageUrl = portalSettings?.hero_image_url || null;
  const heroBackground = portalSettings?.background_color || "#020617";
  const heroOverlay = "rgba(15, 23, 42, 0.65)";
  const sealUrl = portalSettings?.seal_url || null;

  const fiscalYearNote = getFiscalYearLabel(portalSettings);

  const storyCityDescription =
    portalSettings?.story_city_description ??
    `This portal provides an accessible view into ${cityName} finances—budgets, spending, and key trends.`;

  const storyYearAchievements =
    portalSettings?.story_year_achievements ??
    "This year we focused on maintaining core services while improving how financial information is published and understood.";

  const storyCapitalProjects =
    portalSettings?.story_capital_projects ??
    "Capital projects are long-term investments in infrastructure and facilities that support safety, reliability, and service quality.";

  // Stats formatting
  const statPopulationRaw = portalSettings?.stat_population?.trim() || "";
  const statEmployeesRaw = portalSettings?.stat_employees?.trim() || "";
  const statPopulation = statPopulationRaw ? formatNumber(statPopulationRaw) : "";
  const statEmployees = statEmployeesRaw ? formatNumber(statEmployeesRaw) : "";
  const statSquareMiles = portalSettings?.stat_square_miles?.trim() || "";
  const statAnnualBudgetFormatted = totalBudget && totalBudget > 0 
    ? formatCurrency(totalBudget) 
    : "";

  // Visibility toggles
  const showLeadership = portalSettings?.show_leadership !== false;
  const showStory = portalSettings?.show_story !== false;
  const showYearReview = portalSettings?.show_year_review !== false;
  const showCapitalProjects = portalSettings?.show_capital_projects !== false;
  const showStats = portalSettings?.show_stats !== false;
  const showProjects = portalSettings?.show_projects !== false;

  // Feature flags
  const enableActuals =
    portalSettings?.enable_actuals === null || portalSettings?.enable_actuals === undefined
      ? true
      : !!portalSettings.enable_actuals;

  const enableTransactions = portalSettings?.enable_transactions === true;
  const enableRevenues = portalSettings?.enable_revenues === true;
  const enableVendors = enableTransactions && portalSettings?.enable_vendors === true;

  const leaderName = portalSettings?.leader_name?.trim() || "";
  const leaderTitle = portalSettings?.leader_title?.trim() || "";
  const leaderMessage = portalSettings?.leader_message?.trim() || "";
  const leaderPhotoUrl = portalSettings?.leader_photo_url || null;

  const project1Title = portalSettings?.project1_title?.trim() || "Project 1";
  const project1Summary = portalSettings?.project1_summary?.trim() || "P 1 Summary";
  const project1ImageUrl = portalSettings?.project1_image_url || null;

  const project2Title = portalSettings?.project2_title?.trim() || "Project 2";
  const project2Summary = portalSettings?.project2_summary?.trim() || "P 2 Summary";
  const project2ImageUrl = portalSettings?.project2_image_url || null;

  const project3Title = portalSettings?.project3_title?.trim() || "Project 3";
  const project3Summary = portalSettings?.project3_summary?.trim() || "P 3 Summary";
  const project3ImageUrl = portalSettings?.project3_image_url || null;

  // Accent: used subtly (stripe + small highlights)
  const accent =
    portalSettings?.accent_color ||
    portalSettings?.primary_color ||
    (CITY_CONFIG as { primaryColor?: string })?.primaryColor ||
    "#0f172a";

  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});

  const toggleProject = (projectIndex: number) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectIndex]: !prev[projectIndex],
    }));
  };

  const topQuestions: QuickLink[] = useMemo(() => {
    const items: QuickLink[] = [
      {
        href: cityHref("/overview"),
        label: "How is the budget tracking this year?",
        sublabel: "See budget vs spending at a glance.",
      },
      {
        href: cityHref("/budget"),
        label: "What was adopted for this fiscal year?",
        sublabel: "Explore the adopted budget by department.",
      },
    ];

    if (enableActuals) {
      items.push({
        href: cityHref("/departments"),
        label: "Which departments are spending the most?",
        sublabel: "Compare service areas and trends over time.",
      });
    }

    if (enableRevenues) {
      items.push({
        href: cityHref("/revenues"),
        label: "Where does funding come from?",
        sublabel: "Review revenues and year-over-year changes.",
      });
    }

    if (enableTransactions) {
      items.push({
        href: cityHref("/transactions"),
        label: "What payments have we made?",
        sublabel: "Search transactions and filter by vendor or category.",
      });
    }

    if (enableVendors) {
      items.push({
        href: cityHref("/vendors"),
        label: "Who are the top vendors?",
        sublabel: "See top payees and spending categories.",
      });
    }

    return items.slice(0, 5);
  }, [enableActuals, enableRevenues, enableTransactions, enableVendors]);

  async function copyPortalLink() {
    try {
      const url = `${window.location.origin}${cityHref("/")}`;

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareStatus("copied");
        window.setTimeout(() => setShareStatus("idle"), 1500);
        return;
      }

      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);

      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 1500);
    } catch {
      setShareStatus("failed");
      window.setTimeout(() => setShareStatus("idle"), 2000);
    }
  }

  const downloadLinks: QuickLink[] = useMemo(() => {
    const items: QuickLink[] = [
      { href: cityHref("/budget"), label: "Budget tables", sublabel: "View adopted budgets and detail." },
      { href: cityHref("/overview"), label: "Overview charts", sublabel: "Quick summaries for residents." },
    ];

    if (enableActuals) {
      items.push({
        href: cityHref("/departments"),
        label: "Department details",
        sublabel: "Compare trends; export from tables where available.",
      });
    }
    if (enableRevenues) {
      items.push({
        href: cityHref("/revenues"),
        label: "Revenue explorer",
        sublabel: "Review sources and year-over-year totals.",
      });
    }
    if (enableTransactions) {
      items.push({
        href: cityHref("/transactions"),
        label: "Transactions",
        sublabel: "Filter and export transaction results.",
      });
    }
    if (enableVendors) {
      items.push({
        href: cityHref("/vendors"),
        label: "Vendors",
        sublabel: "Top payees and vendor categories.",
      });
    }

    return items;
  }, [enableActuals, enableRevenues, enableTransactions, enableVendors]);

  return (
    <div className="w-full">
      {/* HERO */}
      <header
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

        <div className="absolute inset-0" style={{ backgroundColor: heroOverlay }} aria-hidden={true} />

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/90">{cityName}</p>
                <p className="text-sm text-white/70">{tagline}</p>
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

              {fiscalYearNote && <p className="mt-5 text-sm italic text-white/70">{fiscalYearNote}</p>}

              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {cityName} Transparency Portal
              </h1>

              <p className="mt-3 max-w-2xl text-base text-white/80 sm:text-lg">{heroMessage}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={cityHref("/overview")}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Start with Overview
                </Link>

                <Link
                  href={cityHref("/budget")}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Explore Budget
                </Link>

                {enableTransactions && (
                  <Link
                    href={cityHref("/transactions")}
                    className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    Search Payments
                  </Link>
                )}
              </div>

              <p className="mt-4 text-xs text-white/70">
                Built for clarity: charts, searchable records, and department-level detail.
              </p>
            </div>

            {/* Top questions (citizen language) */}
            <div className="w-full sm:max-w-sm">
              <CardContainer>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Top questions</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Start with the most common resident questions.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {topQuestions.map((q) => (
                      <Link
                        key={q.href}
                        href={q.href}
                        className="block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                      >
                        <span className="block text-sm font-semibold text-slate-900">
                          {q.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-600">
                          {q.sublabel}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </CardContainer>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        {/* START HERE tiles */}
        <section aria-label="Start here" className="mb-8">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Start here</h2>
              <p className="mt-1 text-xs text-slate-600">
                Most common questions—answered in one click.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              href={cityHref("/budget")}
              eyebrow="Plan"
              title="Adopted budget"
              description="See how funds are allocated across departments."
              accent={accent}
              viz="stack"
            />

            <Tile
              href={cityHref("/overview")}
              eyebrow="Track"
              title="Budget vs spending"
              description="High-level view of progress through the year."
              accent={accent}
              viz="line"
            />

            {enableRevenues ? (
              <Tile
                href={cityHref("/revenues")}
                eyebrow="Source"
                title="Where funding comes from"
                description="Funding sources and year-over-year totals."
                accent={accent}
                viz="bars"
              />
            ) : (
              <Tile
                href={cityHref("/departments")}
                eyebrow="Service"
                title="Department spending"
                description="Compare service areas and track changes over time."
                accent={accent}
                viz="bars"
              />
            )}

            {enableTransactions ? (
              <Tile
                href={cityHref("/transactions")}
                eyebrow="Payments"
                title="Search transactions"
                description="Find payments and filter by vendor or category."
                accent={accent}
                viz="dots"
              />
            ) : (
              <Tile
                href={cityHref("/overview")}
                eyebrow="Explore"
                title="Explore dashboards"
                description="Use summaries and charts to understand our finances."
                accent={accent}
                viz="line"
              />
            )}
          </div>
        </section>

        {/* Layout: main + side */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* MAIN column */}
          <div className="space-y-6 lg:col-span-8">
            {/* Leadership */}
            {showLeadership && (leaderName || leaderMessage) && (
              <SectionCard
                ariaLabel="Leadership message"
                accent={accent}
                eyebrow="Leadership message"
                title="Message from leadership"
                icon={<IconMessage />}
              >
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
                          <span className="text-slate-500"> — {leaderTitle}</span>
                        ) : null}
                      </p>
                    )}

                    {leaderMessage && <p className="mt-2 text-sm text-slate-700">{leaderMessage}</p>}
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Story blocks */}
            <div className="grid grid-cols-1 gap-6">
              {showStory && (
                <SectionCard
                  ariaLabel="About our community"
                  accent={accent}
                  title="About our community"
                  icon={<IconMap />}
                >
                  <p className="text-sm text-slate-700">{storyCityDescription}</p>
                </SectionCard>
              )}

              {showYearReview && (
                <SectionCard
                  ariaLabel="Year in review"
                  accent={accent}
                  title="Year in review"
                  icon={<IconCalendar />}
                >
                  <p className="text-sm text-slate-700">{storyYearAchievements}</p>
                </SectionCard>
              )}

              {showCapitalProjects && (
                <SectionCard
                  ariaLabel="Capital projects"
                  accent={accent}
                  title="Capital projects"
                  icon={<IconConstruction />}
                >
                  <p className="text-sm text-slate-700">{storyCapitalProjects}</p>
                </SectionCard>
              )}
            </div>

            {/* Featured projects (unchanged) */}
            {showProjects && (
              <CardContainer>
                <section aria-label="Featured projects" className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Featured projects</h2>
                    <p className="mt-1 text-xs text-slate-600">
                      Major capital and community projects—delivered or underway.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => {
                      const title =
                        i === 1 ? project1Title : i === 2 ? project2Title : project3Title;
                      const summary =
                        i === 1 ? project1Summary : i === 2 ? project2Summary : project3Summary;
                      const imageUrl =
                        i === 1 ? project1ImageUrl : i === 2 ? project2ImageUrl : project3ImageUrl;
                      const isExpanded = !!expandedProjects[i];

                      return (
                        <article
                          key={i}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt=""
                              className="h-40 w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-40 w-full bg-slate-100" aria-hidden={true} />
                          )}

<div className="p-4">
  <h3 className="text-sm font-semibold text-slate-900">{title}</h3>

  <p
    id={`project-summary-${i}`}
    className={`mt-2 text-sm text-slate-700 ${isExpanded ? "" : "line-clamp-3"}`}
  >
    {summary}
  </p>

  <button
    type="button"
    onClick={() => toggleProject(i)}
    aria-expanded={isExpanded}
    aria-controls={`project-summary-${i}`}
    className="mt-3 inline-flex items-center text-xs font-semibold text-slate-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
  >
    {isExpanded ? "Read less" : "Read more"}
    <span className="sr-only"> about {title}</span>
  </button>
</div>

                        </article>
                      );
                    })}
                  </div>
                </section>
              </CardContainer>
            )}
          </div>

          {/* SIDEBAR column */}
          <aside className="space-y-6 lg:col-span-4" aria-label="Key gov statistics">
            {/* At a glance (unchanged) */}
            {showStats &&
              (statPopulation || statEmployees || statSquareMiles || statAnnualBudgetFormatted) && (
                <CardContainer>
                  <section aria-label="At a glance" className="space-y-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">At a glance</h2>
                      <p className="mt-1 text-xs text-slate-600">
                        Key figures to put budgets and services in context.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {statAnnualBudgetFormatted && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                            Annual budget
                          </p>
                          <p className="mt-1 text-xl font-semibold text-slate-900">
                            {statAnnualBudgetFormatted}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-600">All funds, adopted.</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        {statPopulation && (
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                              Population
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {statPopulation}
                            </p>
                          </div>
                        )}

                        {statEmployees && (
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                              Gov employees
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {statEmployees}
                            </p>
                          </div>
                        )}

                        {statSquareMiles && (
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                              Area (sq. miles)
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {statSquareMiles}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </CardContainer>
              )}

            {/* Download & share (DIFFERENTIATED) */}
            <CardContainer>
              <section aria-label="Download and share" className="space-y-3">
                {/* Tinted header strip + accent bar */}
                <div className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                  <div className="mb-2 h-0.5 w-10 rounded-full" style={{ backgroundColor: accent, opacity: 0.55 }} />
                  <h2 className="text-sm font-semibold text-slate-900">Download &amp; share</h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Use public pages to filter results and export where available.
                  </p>
                </div>

                <div className="space-y-2">
                  {downloadLinks.slice(0, 5).map((d) => (
                    <Link
                      key={d.href}
                      href={d.href}
                      className="block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                    >
                      <span className="block text-sm font-semibold text-slate-900">{d.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-600">{d.sublabel}</span>
                    </Link>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={copyPortalLink}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                  >
                    Copy portal link
                  </button>

                  <p className="mt-2 text-xs text-slate-600" aria-live="polite">
                    {shareStatus === "copied"
                      ? "Link copied."
                      : shareStatus === "failed"
                        ? "Could not copy link."
                        : " "}
                  </p>
                </div>
              </section>
            </CardContainer>

            {/* How to use (unchanged) */}
            <CardContainer>
              <section aria-label="How to use this portal" className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-900">How to use this portal</h2>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  <li>Start with Overview to understand the year at a glance.</li>
                  <li>Use Departments to compare service areas over time.</li>
                  {enableTransactions ? (
                    <li>Use Transactions to search payments and vendors.</li>
                  ) : (
                    <li>Explore the budget to see planned allocations by department.</li>
                  )}
                </ul>
              </section>
            </CardContainer>

            {/* Official footer block (DIFFERENTIATED) */}
            <CardContainer>
              <section aria-label="Official notice" className="space-y-2">
                <div className="-mx-4 -mt-4 mb-2 rounded-t-xl border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                  <div className="mb-2 h-0.5 w-10 rounded-full" style={{ backgroundColor: accent, opacity: 0.55 }} />
                  <h2 className="text-sm font-semibold text-slate-900">Official portal</h2>
                </div>

                <p className="text-sm text-slate-700">
                  This transparency portal is maintained by {cityName}. Data is published by our staff and may be updated as new files are posted.
                </p>
                <p className="text-sm text-slate-700">
                  Questions or feedback should be directed to our finance or administrative office.
                </p>
              </section>
            </CardContainer>
          </aside>
        </div>
      </div>
    </div>
  );
}

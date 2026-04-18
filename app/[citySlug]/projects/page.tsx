// app/[citySlug]/projects/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import SectionHeader from "@/components/SectionHeader";
import ProjectsGrid from "@/components/Projects/ProjectsGrid";
import {
  getPortalSettings,
  getPublishedProjects,
} from "@/lib/queries";
import type { PortalSettings } from "@/lib/queries";
import { cityHref } from "@/lib/cityRouting";

export const revalidate = 60;

type SearchParamsShape = { status?: string | string[]; year?: string | string[] };
type PageProps = {
  params: { citySlug: string };
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}


export async function generateMetadata(): Promise<Metadata> {
  const ps = await getPortalSettings();
  const city = ps?.city_name?.trim() || "Our City";
  return {
    title: `Capital Projects – ${city} Financial Transparency`,
    description: `Track ${city}'s major improvement projects, timelines, and investments.`,
  };
}

export default async function ProjectsPage({ params, searchParams }: PageProps) {
  const { citySlug } = await params;
  const sp = await searchParams;
  const statusFilter = pickFirst(sp.status);
  const yearFilter = pickFirst(sp.year);

  const [settings, projects] = await Promise.all([
    getPortalSettings(),
    getPublishedProjects(citySlug),
  ]);

  const portalSettings = settings as PortalSettings | null;

  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  if (!portalSettings?.enable_projects) {
    notFound();
  }

  const cityName = portalSettings?.city_name ?? "our community";

  // Extract completion years for filter
  const completionYears = [...new Set(
    projects
      .map((p) => {
        const d = p.actual_completion_date || p.estimated_completion_date;
        return d ? new Date(d).getFullYear() : null;
      })
      .filter((y): y is number => y !== null)
  )].sort((a, b) => b - a);

  // Apply filters
  let filtered = projects;
  if (statusFilter) {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }
  if (yearFilter) {
    const yr = Number(yearFilter);
    if (Number.isFinite(yr)) {
      filtered = filtered.filter((p) => {
        const d = p.actual_completion_date || p.estimated_completion_date;
        return d && new Date(d).getFullYear() === yr;
      });
    }
  }

  const plannedCount = projects.filter((p) => p.status === "planned").length;
  const inProgressCount = projects.filter((p) => p.status === "in_progress").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;

  // Build filter URL helper
  function filterUrl(params: { status?: string | null; year?: string | null }) {
    const parts: string[] = [];
    const s = params.status !== undefined ? params.status : statusFilter;
    const y = params.year !== undefined ? params.year : yearFilter;
    if (s) parts.push(`status=${s}`);
    if (y) parts.push(`year=${y}`);
    return parts.length > 0 ? `/projects?${parts.join("&")}` : "/projects";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Capital Projects"
        title="Community investments"
        description={`Major improvement projects across ${cityName}. These investments support safer streets, reliable utilities, and better public services.`}
      />

      <nav aria-label="Breadcrumb" className="px-1 text-xs text-slate-600">
        <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
        <span className="mx-1 text-slate-400">›</span>
        <span className="font-medium text-slate-700">Projects</span>
      </nav>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Status filters */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
          <span className="text-[12px] font-medium text-slate-500 mr-1">Status:</span>
          <FilterPill href={filterUrl({ status: null })} label="All" active={!statusFilter} count={projects.length} />
          <FilterPill href={filterUrl({ status: "planned" })} label="Planned" active={statusFilter === "planned"} count={plannedCount} />
          <FilterPill href={filterUrl({ status: "in_progress" })} label="In progress" active={statusFilter === "in_progress"} count={inProgressCount} />
          <FilterPill href={filterUrl({ status: "completed" })} label="Completed" active={statusFilter === "completed"} count={completedCount} />
        </div>

        {/* Year filter */}
        {completionYears.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by completion year">
            <span className="text-[12px] font-medium text-slate-500 mr-1">Year:</span>
            <FilterPill href={filterUrl({ year: null })} label="All" active={!yearFilter} />
            {completionYears.map((yr) => (
              <FilterPill key={yr} href={filterUrl({ year: String(yr) })} label={String(yr)} active={yearFilter === String(yr)} />
            ))}
          </div>
        )}
      </div>

      {/* Projects grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">
          No projects match the selected filters.
        </p>
      ) : (
        <ProjectsGrid projects={filtered} />
      )}
    </div>
  );
}

function FilterPill({ href, label, active, count }: { href: string; label: string; active: boolean; count?: number }) {
  return (
    <Link
      href={cityHref(href)}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-slate-900 text-white"
          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
      {count != null && <span className={active ? "text-slate-300" : "text-slate-500"}>({count})</span>}
    </Link>
  );
}

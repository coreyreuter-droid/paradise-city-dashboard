// app/[citySlug]/projects/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import SectionHeader from "@/components/SectionHeader";
import CardContainer from "@/components/CardContainer";
import ProjectsGrid from "@/components/Projects/ProjectsGrid";
import {
  getPortalSettings,
  getPublishedProjects,
} from "@/lib/queries";
import type { PortalSettings } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";

export const revalidate = 60;

type SearchParamsShape = { status?: string | string[] };
type PageProps = {
  params: { citySlug: string };
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

export default async function ProjectsPage({ params, searchParams }: PageProps) {
  const { citySlug } = await params;
  const sp = await searchParams;
  const statusFilter = pickFirst(sp.status);

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

  const filteredProjects = statusFilter
    ? projects.filter((p) => p.status === statusFilter)
    : projects;

  const cityName = portalSettings?.city_name ?? "our community";
  const plannedCount = projects.filter((p) => p.status === "planned").length;
  const inProgressCount = projects.filter((p) => p.status === "in_progress").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;
  const totalInvestment = projects.reduce((s, p) => s + (p.estimated_cost || 0), 0);

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

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total projects</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{projects.length}</p>
        </div>
        {totalInvestment > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total investment</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(totalInvestment)}</p>
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">In progress</p>
          <p className="mt-0.5 text-lg font-semibold text-amber-700">{inProgressCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Completed</p>
          <p className="mt-0.5 text-lg font-semibold text-emerald-700">{completedCount}</p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter projects by status">
        <StatusPill href="/projects" label="All" active={!statusFilter} count={projects.length} />
        <StatusPill href="/projects?status=planned" label="Planned" active={statusFilter === "planned"} count={plannedCount} />
        <StatusPill href="/projects?status=in_progress" label="In progress" active={statusFilter === "in_progress"} count={inProgressCount} />
        <StatusPill href="/projects?status=completed" label="Completed" active={statusFilter === "completed"} count={completedCount} />
      </div>

      {/* Projects grid */}
      {filteredProjects.length === 0 ? (
        <CardContainer>
          <p className="py-8 text-center text-sm text-slate-500">
            {statusFilter
              ? `No ${statusFilter.replace("_", " ")} projects found.`
              : "No projects available yet."}
          </p>
        </CardContainer>
      ) : (
        <ProjectsGrid projects={filteredProjects} />
      )}
    </div>
  );
}

function StatusPill({ href, label, active, count }: { href: string; label: string; active: boolean; count: number }) {
  return (
    <Link
      href={cityHref(href)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-slate-900 text-white"
          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
      <span className={active ? "text-slate-400" : "text-slate-400"}>({count})</span>
    </Link>
  );
}
